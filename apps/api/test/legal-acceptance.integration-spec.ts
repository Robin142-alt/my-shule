import { Controller, Get, INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { AuthSecurityTestModule } from './support/auth-security-test.module';
import { REDIS_CLIENT } from '../src/infrastructure/redis/redis.constants';
import { InMemoryRedis } from './support/in-memory-redis';
import { LegalModule } from '../src/modules/legal/legal.module';
import { LegalGuard } from '../src/modules/legal/legal.guard';
import { LegalService, currentDocuments, LegalDocument } from '../src/modules/legal/legal.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { AuthorizationRepository } from '../src/auth/repositories/authorization.repository';
import { PasswordService } from '../src/auth/password.service';
import { TrustedDeviceService } from '../src/auth/trusted-device.service';
import { DPA_RELEASE } from '../../../shared/legal/release';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { LEGAL_SCHEMA_SQL } from '../src/modules/legal/legal-schema.service';

@Controller('legal-probe') class LegalProbe { @Get() read() { return { permitted: true }; } }
@Module({ imports: [AuthSecurityTestModule, LegalModule], controllers: [LegalProbe], providers: [{ provide: APP_GUARD, useClass: LegalGuard }] }) class LegalTestModule {}

jest.setTimeout(180000);
type Identity = { id: string; tenant: string; token: string; refresh: string; role: string; password: string; email: string; trusted: string; audience: 'school' | 'portal' | 'superadmin' };
const selections = [{ document_id:'privacy-1.0',checked:true },{ document_id:'terms-1.0',checked:true }];
const data = (body: any) => body.data ?? body;

describe.each(['uuid', 'text'] as const)('Legal acceptance with %s guardian IDs on PostgreSQL and authenticated API requests', (guardianIdType) => {
  let app: INestApplication; let module: TestingModule; let pool: Pool;
  let staff: Identity; let parent: Identity; let student: Identity; let other: Identity; let platform: Identity;
  let childId: string; let guardianId: string;
  const suffix=randomUUID().slice(0,8); const tenant=`legal-${suffix}`;
  const send=(user:Identity,method:'get'|'post',path:string,body?:object)=>{
    const call=request(app.getHttpServer())[method](path).set('host',`${user.tenant}.integration.test`).set('x-auth-audience',user.audience).set('authorization',`Bearer ${user.token}`);
    return body === undefined ? call : call.send(body);
  };
  async function user(tenantId:string,role:string,isPlatform=false):Promise<Identity> {
    const authorization=module.get(AuthorizationRepository); await authorization.ensureTenantAuthorizationBaseline(tenantId);
    const found=await authorization.getRoleByCode(tenantId,role); const password='LegalTestPassword123!'; const email=`${role}-${randomUUID()}@example.test`;
    const result=await pool.query(`INSERT INTO users(tenant_id,email,password_hash,full_name,display_name,status,email_verified_at,password_changed_at)
      VALUES ($1,$2,$3,$4,$4,'active',NOW(),NOW()) RETURNING id`,[tenantId,email,await module.get(PasswordService).hash(password),`Legal ${role}`]);
    const id=result.rows[0].id;
    if(isPlatform) {await pool.query("UPDATE users SET user_type='platform_owner' WHERE id=$1",[id]);module.get(ConfigService).set('auth.systemOwnerEmail',email);}
    await pool.query(`INSERT INTO tenant_memberships(tenant_id,user_id,role_id,status) VALUES ($1,$2,$3,'active')`,[tenantId,id,found.id]);
    const trusted=`trusted-${id}`;await module.get(TrustedDeviceService).trustDevice({userId:id,rawToken:trusted,ipAddress:'127.0.0.1',userAgent:'legal-integration'});
    const audience=isPlatform?'superadmin': ['parent','student'].includes(role)?'portal':'school';
    const login=await request(app.getHttpServer()).post('/auth/login').set('host',`${tenantId}.integration.test`).send({email,password,audience,trusted_device_token:trusted});
    if(login.status!==201) throw new Error(JSON.stringify(login.body));
    return { id,tenant:tenantId,token:login.body.tokens.access_token,refresh:login.body.tokens.refresh_token,role,password,email,trusted,audience };
  }
  beforeAll(async()=>{
    if(!process.env.DATABASE_URL?.includes('my_shule_disposable_')) throw new Error('Use the disposable PostgreSQL test runner.');
    Object.assign(process.env,{NODE_ENV:'test',APP_BASE_DOMAIN:'integration.test',JWT_ISSUER:'my-shule-integration-tests',JWT_AUDIENCE:'my-shule-integration-clients',JWT_ACCESS_TOKEN_SECRET:'integration-access-secret',JWT_REFRESH_TOKEN_SECRET:'integration-refresh-secret',DATABASE_RUNTIME_ROLE:'my_shule_runtime',SECURITY_PII_ENCRYPTION_KEY:'MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY='});
    pool=new Pool({connectionString:process.env.DATABASE_URL});
    module=await Test.createTestingModule({imports:[LegalTestModule]}).overrideProvider(REDIS_CLIENT).useValue(new InMemoryRedis()).compile();
    app=module.createNestApplication();app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true}));await app.init();
    if (guardianIdType === 'text') {
      // Older production databases retain text primary keys, including non-UUID IDs.
      await pool.query(`ALTER TABLE student_guardians ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE student_guardians ALTER COLUMN id TYPE text USING id::text;
        ALTER TABLE student_guardians ALTER COLUMN id SET DEFAULT gen_random_uuid()::text`);
    }
    staff=await user(tenant,'owner');parent=await user(tenant,'parent');student=await user(tenant,'student');other=await user(`other-${suffix}`,'owner');
    platform=await user('global','owner',true);
    childId=randomUUID();
    await pool.query(`INSERT INTO students(id,tenant_id,admission_number,first_name,last_name,status,date_of_birth) VALUES ($1,$2,'L-001','Test','Learner','active','2014-05-01')`,[childId,tenant]);
    await pool.query(`INSERT INTO student_portal_access(tenant_id,student_id,user_id,username,guardian_phone_hash,force_password_change) VALUES ($1,$2,$3,'legal-student','test-hash',false)`,[tenant,childId,student.id]);
    guardianId=guardianIdType === 'text' ? `legacy-guardian-${suffix}` : randomUUID();
    await pool.query(`INSERT INTO student_guardians(tenant_id,student_id,user_id,display_name,email,relationship,status,id) VALUES ($1,$2,$3,'Test Guardian',$4,'parent','active',$5)`,[tenant,childId,parent.id,parent.email,guardianId]);
  });
  afterAll(async()=>{
    // The two schema variants share one disposable database, which permits one platform owner.
    if (platform) await pool.query("UPDATE users SET user_type='member' WHERE id=$1",[platform.id]);
    await app?.close();await pool?.end();
  });

  if (guardianIdType === 'uuid') test('schema upgrade preserves existing guardian evidence and remains idempotent',async()=>{
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('ALTER TABLE legal_authorities ALTER COLUMN guardian_link_id TYPE uuid USING guardian_link_id::uuid');
      const inserted=await client.query(`INSERT INTO legal_authorities(tenant_id,kind,user_id,student_id,guardian_link_id,evidence_reference,verified_by)
        VALUES ($1,'guardian',$2,$3,$4,'migration-fixture-record',$5) RETURNING id`,[tenant,parent.id,childId,guardianId,staff.id]);
      await client.query(LEGAL_SCHEMA_SQL);
      await client.query(LEGAL_SCHEMA_SQL);
      const result=await client.query('SELECT guardian_link_id,pg_typeof(guardian_link_id)::text AS type FROM legal_authorities WHERE id=$1',[inserted.rows[0].id]);
      expect(result.rows).toEqual([{guardian_link_id:guardianId,type:'text'}]);
    } finally {await client.query('ROLLBACK');client.release();}
  });

  test('old and fresh sessions cannot use protected APIs before affirmative acceptance',async()=>{
    const release=data((await request(app.getHttpServer()).get('/legal/release').expect(200)).body);
    expect(release.dpa_active).toBe(false);
    expect(release.documents).toHaveLength(3);
    expect(release.documents.every((doc:any)=>doc.sha256.length===64)).toBe(true);
    expect(release.enforcement_active).toBe(true);
    expect(Object.keys(release).sort()).toEqual(['documents','dpa_active','enforcement_active']);
    await send(staff,'get','/legal-probe').expect(428);
    await request(app.getHttpServer()).get('/legal/status').set('host',`${tenant}.integration.test`).expect(401);
    const status=data((await send(staff,'get','/legal/status').expect(200)).body);
    expect(status.required_documents.map((doc:any)=>doc.kind).sort()).toEqual(['privacy','terms']);
    expect(status.dpa_active).toBe(false);expect(status.blockers).toEqual([]);
    await send(staff,'post','/legal/accept',{selections:[{document_id:'terms-1.0',checked:false}]}).expect(400);
    await send(staff,'post','/legal/accept',{selections:[{document_id:'terms-0.9',checked:true}]}).expect(400);
    await send(staff,'post','/legal/accept',{selections,user_id:other.id,school_id:other.tenant}).expect(400);
    await send(staff,'post','/legal/accept',{selections:[...selections,{document_id:'dpa-2.0',checked:true}]}).expect(400);
    const responses=await Promise.all([send(staff,'post','/legal/accept',{selections}),send(staff,'post','/legal/accept',{selections})]);
    expect(responses.map((row)=>row.status)).toEqual([201,201]);
    expect(data(responses[0].body).ready).toBe(true);
    await send(staff,'get','/legal-probe').expect(200);
    const evidence=await pool.query('SELECT * FROM legal_acceptances WHERE tenant_id=$1 AND user_id=$2',[tenant,staff.id]);
    expect(evidence.rows).toHaveLength(2);
    expect(evidence.rows.every(row=>row.session_id && row.accepted_at instanceof Date && row.evidence.content_hash.length===64)).toBe(true);
    const events=await pool.query(`SELECT event_name FROM outbox_events WHERE tenant_id=$1 AND event_name='legal.agreement.accepted'`,[tenant]);expect(events.rows).toHaveLength(2);
    const audit=await pool.query(`SELECT id FROM audit_logs WHERE tenant_id=$1 AND action='legal.agreement.accepted'`,[tenant]);expect(audit.rows).toHaveLength(2);
    await send(other,'get','/legal-probe').expect(428);
    await request(app.getHttpServer()).get('/legal/status').set('host',`${other.tenant}.integration.test`).set('authorization',`Bearer ${staff.token}`).expect(401);
  });

  test('durable acceptance survives refresh and role switches without asking again',async()=>{
    const refresh=await request(app.getHttpServer()).post('/auth/refresh').set('host',`${tenant}.integration.test`).send({refresh_token:staff.refresh}).expect(201);
    staff.token=refresh.body.tokens.access_token;staff.refresh=refresh.body.tokens.refresh_token;
    await send(staff,'get','/legal-probe').expect(200);
    const switched=await send(staff,'post','/auth/active-role',{role_code:'teacher'}).expect(201);staff.token=switched.body.tokens.access_token;
    expect(data((await send(staff,'get','/legal/status').expect(200)).body).required_documents).toEqual([]);
    await send(staff,'get','/legal-probe').expect(200);
  });

  test('a role is not institutional authority, and children cannot provide guardian consent',async()=>{
    await send(staff,'get',`/legal/verification/candidates?school_id=${tenant}`).expect(403);
    await send(student,'post','/legal/accept',{selections}).expect(201);
    const status=data((await send(student,'get','/legal/status').expect(200)).body);
    expect(status.guardian_required).toBe(true);expect(status.ready).toBe(false);
    await send(student,'get','/legal-probe').expect(428);
    await send(student,'post','/legal/guardian/authorise',{student_id:childId,selections,checked:true}).expect(403);
    await send(parent,'post','/legal/accept',{selections}).expect(201);
    await send(parent,'post','/legal/guardian/authorise',{student_id:childId,selections,checked:true}).expect(403);
  });

  test('only a separately authenticated platform owner can verify school authority',async()=>{
    await send(platform,'get','/legal-probe').expect(428);
    await send(platform,'post','/legal/accept',{selections}).expect(201);
    await send(platform,'get','/legal-probe').expect(200);
    await send(platform,'post','/legal/verification',{kind:'school',school_id:tenant,user_id:staff.id,evidence_reference:'TEST-FIXTURE-institution-record',checked:true}).expect(201);
    await send(staff,'post','/legal/verification',{kind:'school',school_id:tenant,user_id:parent.id,evidence_reference:'TEST-FIXTURE-invalid-self-grant',checked:true}).expect(403);
  });

  test('verified guardian authorises only their own child; withdrawal applies on existing sessions',async()=>{
    await send(staff,'post','/legal/verification',{kind:'guardian',school_id:tenant,user_id:parent.id,student_id:childId,evidence_reference:'school-guardian-register-123',checked:true}).expect(201);
    await send(staff,'post','/legal/verification',{kind:'guardian',school_id:other.tenant,user_id:parent.id,student_id:childId,evidence_reference:'school-guardian-register-123',checked:true}).expect(403);
    await send(parent,'post','/legal/guardian/authorise',{student_id:randomUUID(),selections,checked:true}).expect(403);
    await send(parent,'post','/legal/guardian/authorise',{student_id:childId,selections,checked:true}).expect(201);
    await send(student,'get','/legal-probe').expect(200);
    await send(parent,'post','/legal/guardian/withdraw',{student_id:childId,checked:true}).expect(201);
    await send(student,'get','/legal-probe').expect(428);
    await send(parent,'post','/legal/guardian/authorise',{student_id:childId,selections,checked:true}).expect(403);
    await send(staff,'post','/legal/verification',{kind:'guardian',school_id:tenant,user_id:parent.id,student_id:childId,evidence_reference:'school-guardian-register-456',checked:true}).expect(201);
    await send(parent,'post','/legal/guardian/authorise',{student_id:childId,selections,checked:true}).expect(201);
    await send(student,'get','/legal-probe').expect(200);
    await pool.query(`UPDATE student_guardians SET status='revoked' WHERE tenant_id=$1 AND student_id=$2`,[tenant,childId]);
    await send(student,'get','/legal-probe').expect(428);
  });

  test('an approved-release test fixture requires authority and records a separate school contract',async()=>{
    const text='TEST FIXTURE ONLY. This is synthetic schedule data used solely to exercise the inactive DPA activation contract in a disposable database. It is not production evidence.';
    const schedule={id:'fixture-register',title:'Test register',version:'test-1',content:text,sha256:createHash('sha256').update(text).digest('hex')};
    DPA_RELEASE.approval={approvedBy:'TEST FIXTURE OWNER',approvedAt:new Date().toISOString(),evidenceReference:'TEST FIXTURE EVIDENCE',providerLegalIdentity:'TEST FIXTURE IDENTITY',kenyanServingCopyEvidence:'TEST FIXTURE ONLY',productionRegister:schedule,retentionSchedule:{...schedule,id:'fixture-retention'}};
    try {
      const status=data((await send(staff,'get','/legal/status').expect(200)).body);expect(status.required_documents.map((d:any)=>d.id)).toEqual(['dpa-2.0']);expect(status.incorporated_documents).toHaveLength(2);
      await send(other,'post','/legal/accept',{selections:[...selections,{document_id:'dpa-2.0',checked:true}]}).expect(400);
      await send(staff,'post','/legal/accept',{selections:[{document_id:'dpa-2.0',checked:true}]}).expect(201);
      expect(data((await send(parent,'get','/legal/status').expect(200)).body).school_accepted).toBe(true);
      const receipts=await pool.query("SELECT scope,evidence FROM legal_acceptances WHERE tenant_id=$1 AND kind='dpa'",[tenant]);expect(receipts.rows).toHaveLength(1);expect(receipts.rows[0].scope).toBe('school');expect(receipts.rows[0].evidence.release.approval.productionRegister.sha256).toBe(schedule.sha256);
    } finally {DPA_RELEASE.approval=null;}
  });

  test('personal acceptance follows the same verified person across active school memberships',async()=>{
    const authorization=module.get(AuthorizationRepository);const role=await authorization.getRoleByCode(other.tenant,'teacher');
    await pool.query("INSERT INTO tenant_memberships(tenant_id,user_id,role_id,status) VALUES ($1,$2,$3,'active')",[other.tenant,staff.id,role.id]);
    const login=await request(app.getHttpServer()).post('/auth/login').set('host',`${other.tenant}.integration.test`).send({email:staff.email,password:staff.password,audience:'school',trusted_device_token:staff.trusted}).expect(201);
    const secondSchool={...staff,tenant:other.tenant,token:login.body.tokens.access_token};
    expect(data((await send(secondSchool,'get','/legal/status').expect(200)).body).required_documents).toEqual([]);
    await send(secondSchool,'get','/legal-probe').expect(200);
    expect((await pool.query("SELECT id FROM legal_acceptances WHERE user_id=$1 AND scope='individual'",[staff.id])).rows).toHaveLength(2);
  });

  test('evidence is append-only and RLS hides every other school',async()=>{
    const client=await pool.connect();try {await client.query('BEGIN');await client.query('SET LOCAL ROLE my_shule_runtime');await client.query(`SELECT set_config('app.tenant_id',$1,true)`,[other.tenant]);
      expect((await client.query('SELECT * FROM legal_acceptances WHERE tenant_id=$1',[tenant])).rows).toHaveLength(0);
      await client.query("SELECT set_config('app.user_id',$1,true),set_config('app.is_authenticated','true',true)",[other.id]);
      expect((await client.query('SELECT * FROM app.legal_identity($1)',[parent.id])).rows).toHaveLength(0);
      await client.query('ROLLBACK');
    } finally {client.release();}
    await expect(pool.query(`UPDATE legal_acceptances SET statement='forged' WHERE tenant_id=$1`,[tenant])).rejects.toThrow('append-only');
    await expect(pool.query(`UPDATE legal_documents SET content='forged' WHERE id='terms-1.0'`)).rejects.toThrow('append-only');
  });

  test('a material version change gates existing sessions until the exact new document is accepted',async()=>{
    const documents=currentDocuments as LegalDocument[];const index=documents.findIndex(doc=>doc.kind==='terms');const original=documents[index];
    const replacement={...original,id:`terms-test-2-${suffix}`,version:`test-2-${suffix}`,generation:2};
    await pool.query('INSERT INTO legal_documents(id,kind,version,generation,content_hash,content,effective_date) VALUES($1,$2,$3,$4,$5,$6,$7)',[replacement.id,replacement.kind,replacement.version,replacement.generation,replacement.sha256,replacement.content,replacement.effectiveDate]);
    documents[index]=replacement;
    try {
      await send(parent,'get','/legal-probe').expect(428);
      await send(parent,'post','/legal/accept',{selections}).expect(400);
      await send(parent,'post','/legal/accept',{selections:[{document_id:replacement.id,checked:true}]}).expect(201);
      await send(parent,'get','/legal-probe').expect(200);
      const history=await pool.query("SELECT document_id FROM legal_acceptances WHERE user_id=$1 AND kind='terms' AND scope='individual' ORDER BY generation",[parent.id]);expect(history.rows.map(row=>row.document_id)).toEqual(['terms-1.0',replacement.id]);
    } finally {documents[index]=original;}
  });

  test('an audit failure rolls acceptance back and membership revocation is enforced',async()=>{
    const service=module.get(LegalService);const context=module.get(RequestContextService);
    const original=service.evidenceEvent.bind(service);service.evidenceEvent=async()=>{throw new Error('Audit unavailable');};
    try {await send(other,'post','/legal/accept',{selections}).expect(500);} finally {service.evidenceEvent=original;}
    expect((await pool.query('SELECT id FROM legal_acceptances WHERE tenant_id=$1',[other.tenant])).rows).toHaveLength(0);
    await pool.query(`UPDATE tenant_memberships SET status='suspended' WHERE tenant_id=$1 AND user_id=$2`,[tenant,staff.id]);
    const response=await send(staff,'get','/legal-probe');expect([401,403]).toContain(response.status);
    expect(DPA_RELEASE.approval).toBeNull();expect(context).toBeDefined();
  });
});
