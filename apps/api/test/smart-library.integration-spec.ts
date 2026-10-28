import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaService } from '../src/database/prisma.service';
import { RequestContextService } from '../src/common/request-context/request-context.service';
import { LibrarySchemaService } from '../src/modules/library/library-schema.service';
import { SmartLibraryService } from '../src/modules/library/smart-library.service';
import { SMART_LIBRARY_SCHEMA_SQL } from '../src/modules/library/smart-library-schema';
import { LibraryRepository } from '../src/modules/library/repositories/library.repository';
import { LibrarianCommandService } from '../src/modules/admin-command/librarian-command.service';

describe('Smart library: real PostgreSQL transactions and RLS',()=>{
  const schema=`library_${randomUUID().replaceAll('-','')}`,role=`${schema}_runtime`;
  const context=new RequestContextService();
  let db:PrismaService;
  let pool:Pool,service:SmartLibraryService,reports:LibrarianCommandService,school:string,other:string,student:string,staff:string;
  const actor=randomUUID();let failEvent=false;
  const run=<T>(work:()=>Promise<T>,tenant=school)=>context.run({tenant_id:tenant,user_id:actor,role:'librarian',is_authenticated:true} as never,work);
  const allocate=(quantity=3,tenant=school,key=randomUUID())=>run(()=>service.allocate({quantity,request_id:key}),tenant);
  const register=async(count=3,tenant=school)=>{
    const batch=await allocate(count,tenant);const barcodes:string[]=[];
    await run(async()=>{for await(const code of service.printBarcodes({batch_id:batch.id}))barcodes.push(code);},tenant);
    let title:string|undefined;const copies=[];
    for(const barcode of barcodes){
      const copy=await run(()=>service.register({request_id:randomUUID(),barcode,title:'Mathematics Form 2',...(title?{catalog_item_id:title}:{})}),tenant);
      title=copy.catalog_item_id;copies.push(copy);
    }
    return {barcodes,copies,title};
  };
  const issue=(barcodes:string[],extra:Record<string,unknown>={})=>run(()=>service.issue({
    request_id:randomUUID(),barcodes,borrower_type:'student',subject_id:student,due_on:'2099-12-31',...extra,
  }));
  beforeAll(async()=>{
    const url=new URL(process.env.DATABASE_URL??'postgresql://invalid/invalid');
    if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['localhost','127.0.0.1'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))throw Error('Disposable PostgreSQL required');
    pool=new Pool({connectionString:url.toString(),options:`-c search_path=${schema},public`,max:12});
    await pool.query(`CREATE SCHEMA ${schema};CREATE ROLE ${role};GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
    // Use the production Prisma adapter and transaction scoping. A pg-only
    // substitute accepts result types which Prisma cannot deserialize.
    const originalDatabaseUrl=process.env.DATABASE_URL;
    url.searchParams.set('options',`-c search_path=${schema},public`);
    process.env.DATABASE_URL=url.toString();
    try { db=new PrismaService(context,{getRuntimeRoleName:()=>role} as never); }
    finally { process.env.DATABASE_URL=originalDatabaseUrl; }
    await db.$connect();
    // Exercise the actual deployed Prisma-era shape, including text IDs and
    // mandatory finance and ledger timestamps. Migration must also work on fresh installs.
    await pool.query(`
      CREATE TABLE library_circulation_ledger(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,copy_id uuid NOT NULL,borrower_id uuid NOT NULL,
        action text NOT NULL,metadata jsonb NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL);
      CREATE TABLE library_reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id text NOT NULL,catalog_item_id uuid NOT NULL,borrower_id uuid NOT NULL,
        queue_position text NOT NULL,created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL);
      CREATE TYPE "LibraryFineStatus" AS ENUM ('UNPAID','PAID','WAIVED','CANCELLED');
      CREATE TABLE library_fines(id text PRIMARY KEY,school_id text NOT NULL,tenant_id text,
        library_loan_id text NOT NULL,student_id text NOT NULL,amount double precision NOT NULL,
        reason text NOT NULL,status "LibraryFineStatus" NOT NULL DEFAULT 'UNPAID',
        created_at timestamp NOT NULL DEFAULT now(),updated_at timestamp NOT NULL,deleted_at timestamp);
    `);
    await new LibrarySchemaService({runSchemaBootstrap:(sql:string)=>pool.query(sql)} as never).onModuleInit();
    await pool.query(`
      CREATE TABLE students(id text PRIMARY KEY,tenant_id text,first_name text,last_name text,admission_number text,status text,deleted_at timestamptz);
      CREATE TABLE staff_profiles(id uuid PRIMARY KEY,tenant_id text,display_name text,staff_number text,status text,user_id uuid);
      CREATE TABLE student_portal_access(tenant_id text,student_id text,user_id uuid,status text);
      CREATE TABLE student_guardians(id text PRIMARY KEY,tenant_id text,student_id text,user_id text,status text);
      CREATE TABLE tenant_memberships(tenant_id text,user_id text,status text);
      CREATE TABLE subjects(id text PRIMARY KEY,tenant_id text,name text,status text);
      CREATE TABLE class_sections(id text PRIMARY KEY,tenant_id text,name text,grade_level text,stream text,is_active boolean,status text);
      CREATE TABLE student_allocations(tenant_id text,student_id text,class_name text,stream_name text,is_current boolean);
      CREATE TABLE tenants(tenant_id text PRIMARY KEY,name text,settings jsonb);
      CREATE TABLE users(id uuid,tenant_id text,display_name text);
      CREATE TABLE evidence(tenant_id text,event jsonb);
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${role};
      GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA ${schema} TO ${role};
    `);
    for(const table of ['students','staff_profiles','student_portal_access','student_guardians','tenant_memberships','subjects','class_sections','student_allocations','tenants','users','evidence'])await pool.query(`
      ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;ALTER TABLE ${table} FORCE ROW LEVEL SECURITY;
      CREATE POLICY school_scope ON ${table} USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
    `);
    service=new SmartLibraryService(db as never,context,{
      recordSchoolOperation:async(event:unknown,tx:unknown)=>{
        expect(tx).toBeDefined();if(failEvent)throw Error('Injected outbox failure');
        await db.query('INSERT INTO evidence VALUES($1,$2::jsonb)',[context.requireStore().tenant_id,JSON.stringify(event)]);
      },
    } as never,new LibraryRepository(db));
    reports=new LibrarianCommandService(context,db,{
      uuidOrNull:(value:string)=>/^[0-9a-f-]{36}$/i.test(value??'')?value:null,
      recordWorkflowAction:async(event:unknown)=>{if(failEvent)throw Error('Injected report audit failure');await db.query('INSERT INTO evidence VALUES($1,$2::jsonb)',[context.requireStore().tenant_id,JSON.stringify(event)]);},
    } as never);
  },60000);
  beforeEach(async()=>{
    failEvent=false;school=randomUUID();other=randomUUID();student=randomUUID();staff=randomUUID();
    await pool.query(`INSERT INTO students VALUES($1,$2,'Brian','Otieno','2451','active',NULL)`,[student,school]);
    await pool.query(`INSERT INTO staff_profiles VALUES($1,$2,'Amina Teacher','STAFF-1','active',$3)`,[staff,school,actor]);
    await pool.query(`INSERT INTO tenants VALUES($1,'Library QA School','{}')`,[school]);
    await pool.query(`INSERT INTO users VALUES($1,$2,'QA Librarian')`,[actor,school]);
  });
  afterAll(async()=>{
    if(db)await db.$disconnect();
    if(pool){try{await pool.query(`DROP SCHEMA ${schema} CASCADE;DROP ROLE ${role}`);}finally{await pool.end();}}
  });
  it('allocates globally unique strings under concurrent schools and idempotent retries',async()=>{
    const key=randomUUID();
    const attempts=await Promise.allSettled([allocate(96,school,key),allocate(96,school,key),allocate(96,other),allocate(96)]);
    // Drain concurrent work before asserting so a regression cannot leave a
    // transaction running while the fixture closes its database connections.
    const [a,retry,b,c]=attempts.map(result=>{
      if(result.status==='rejected')throw result.reason;
      return result.value;
    });
    expect(a.id).toBe(retry.id);
    const all=(await pool.query('SELECT barcode FROM library_barcode_registry WHERE tenant_id=ANY($1::text[])',[[school,other]])).rows;
    expect(all).toHaveLength(288);expect(new Set(all.map(r=>r.barcode)).size).toBe(288);
    expect(b.id).not.toBe(c.id);
    await expect(run(()=>service.allocate({quantity:100,request_id:key}))).rejects.toThrow('different');
  });
  it('preserves large decimal identifiers without numeric coercion',async()=>{
    await pool.query(`SELECT setval('library_barcode_sequence',999998,true)`);
    let batch=await allocate(3);let codes=(await pool.query('SELECT barcode FROM library_barcode_registry WHERE batch_id=$1 ORDER BY ordinal',[batch.id])).rows;
    expect(codes.map(c=>c.barcode)).toEqual(['999999','1000000','1000001']);
    await pool.query(`SELECT setval('library_barcode_sequence',9007199254740992,true)`);
    batch=await allocate(2);codes=(await pool.query('SELECT barcode FROM library_barcode_registry WHERE batch_id=$1 ORDER BY ordinal',[batch.id])).rows;
    expect(codes.map(c=>c.barcode)).toEqual(['9007199254740993','9007199254740994']);
    await pool.query(`SELECT setval('library_barcode_sequence',2000000,true)`);
  });
  it('rejects external duplicates globally and leaves no partial import',async()=>{
    const external=`EXT-${randomUUID()}`;
    const input={barcodes:[external,`0000-${randomUUID()}`],request_id:randomUUID()};
    await run(()=>service.importBarcodes(input));
    await expect(run(()=>service.importBarcodes({barcodes:['NEW-1',external],request_id:randomUUID()}),other)).rejects.toThrow('already reserved');
    expect((await pool.query(`SELECT count(*)::int AS n FROM library_barcode_registry WHERE tenant_id=$1`,[other])).rows[0].n).toBe(0);
    await expect(run(()=>db.query(`DELETE FROM library_barcode_registry WHERE tenant_id=$1`,[school]))).rejects.toThrow('permanent');
  });
  it('skips purchased numeric identifiers and reprints without allocating new numbers',async()=>{
    await pool.query(`SELECT setval('library_barcode_sequence',3000000,true)`);
    await run(()=>service.importBarcodes({barcodes:['3000001','3000003'],request_id:randomUUID()}),other);
    const batch=await allocate(1000),codes:string[]=[];
    await run(async()=>{for await(const code of service.printBarcodes({batch_id:batch.id}))codes.push(code);});
    expect(codes).toHaveLength(1000);expect(codes).not.toContain('3000001');expect(codes).not.toContain('3000003');
    const before=(await pool.query(`SELECT last_value::text FROM library_barcode_sequence`)).rows[0].last_value;
    expect(await run(()=>service.validatePrint({batch_id:batch.id}))).toBe(1000);
    expect((await pool.query(`SELECT last_value::text FROM library_barcode_sequence`)).rows[0].last_value).toBe(before);
    await expect(run(()=>service.validatePrint({batch_id:batch.id}),other)).rejects.toThrow('not found');
  });
  it('registers multiple copies of one title and enforces ownership and permanence',async()=>{
    const {barcodes,copies,title}=await register();
    expect(copies.every(c=>c.catalog_item_id===title)).toBe(true);
    expect(new Set(copies.map(c=>c.id)).size).toBe(3);
    await expect(run(()=>service.scan(barcodes[0]),other)).rejects.toThrow('not found');
    await expect(run(()=>service.register({barcode:barcodes[0],title:'Other',request_id:randomUUID()}))).rejects.toThrow('already assigned');
    await expect(run(()=>db.query(`UPDATE library_copies SET barcode='changed' WHERE tenant_id=$1 AND id=$2`,[school,copies[0].id]))).rejects.toThrow('cannot be changed');
  });
  it('uses authoritative borrower searches and preserves access to former borrowers history',async()=>{
    const students=await run(()=>service.borrowers({search:'2451',type:'student'}));
    expect(students.map(p=>p.subject_id)).toContain(student);
    const staffRows=await run(()=>service.borrowers({search:'STAFF-1',type:'staff'}));
    expect(staffRows.map(p=>p.subject_id)).toContain(staff);
    expect(await run(()=>service.borrowers({search:'2451'}),other)).toEqual([]);
    await pool.query(`UPDATE students SET status='graduated' WHERE id=$1`,[student]);
    expect(await run(()=>service.borrowers({search:'2451'}))).toEqual([]);
    expect((await run(()=>service.borrowers({search:'2451',include_inactive:'true'})))[0].subject_id).toBe(student);
  });
  it('issues multiple copies atomically, returns only selected copies and retains borrower history',async()=>{
    const {barcodes}=await register(5);const issued=await issue(barcodes);
    expect(issued.loans).toHaveLength(5);
    const key=randomUUID(),input={request_id:key,barcodes:barcodes.slice(0,2),condition:'good'};
    const result=await run(()=>service.returns(input));expect(result.returns).toHaveLength(2);
    expect(await run(()=>service.returns(input))).toEqual(JSON.parse(JSON.stringify(result)));
    const history=await run(()=>service.history({subject_id:student,borrower_type:'student'}));
    expect(history.outstanding).toBe(3);expect(history.loans.filter((l:any)=>l.returned_at)).toHaveLength(2);
    const summary=await run(()=>service.summary());expect(summary.available_copies).toBe(2);expect(summary.issued_copies).toBe(3);
    await expect(run(()=>service.returns({...input,request_id:randomUUID()}))).rejects.toThrow('no active loan');
  });
  it('issues and returns with mixed UUID/text recipient IDs while excluding inactive and other-school accounts',async()=>{
    const pupil=randomUUID(),guardian=randomUUID(),inactive=randomUUID(),outsider=randomUUID();
    await pool.query(`INSERT INTO student_portal_access VALUES($1,$2,$3,'active')`,[school,student,pupil]);
    await pool.query(`INSERT INTO student_guardians VALUES
      ('parent-link',$1,$2,$3,'active'),('inactive-link',$1,$2,$4,'active'),
      ('foreign-link',$5,$2,$6,'active')`,[school,student,guardian,inactive,other,outsider]);
    await pool.query(`INSERT INTO tenant_memberships VALUES
      ($1,$2,'active'),($1,$3,'active'),($1,$4,'suspended'),($5,$6,'active'),($1,$7,'active')`,
      [school,pupil,guardian,inactive,other,outsider,actor]);
    const {barcodes}=await register(3);
    const input={request_id:randomUUID(),barcodes:barcodes.slice(0,2),borrower_type:'student',subject_id:student,due_on:'2099-12-31'};
    const issued=await run(()=>service.issue(input));
    expect(issued.loans).toHaveLength(2);
    await run(()=>service.issue(input));
    await run(()=>service.returns({request_id:randomUUID(),barcodes:[barcodes[0]]}));
    const events=(await pool.query(`SELECT event FROM evidence WHERE tenant_id=$1 AND event->'event'->>'type' IN ('library.book_issued','library.book_returned')`,[school])).rows;
    expect(events).toHaveLength(3);
    for(const {event} of events){
      expect(event.notifications.map((n:any)=>n.targetUserId).sort()).toEqual([pupil,guardian].sort());
      expect(event.notifications.find((n:any)=>n.targetUserId===guardian).recipientGuardianId).toBe('parent-link');
    }
    await issue([barcodes[2]],{borrower_type:'staff',subject_id:staff});
    const staffEvent=(await pool.query(`SELECT event FROM evidence WHERE tenant_id=$1 AND event->'event'->>'type'='library.book_issued' ORDER BY ctid DESC LIMIT 1`,[school])).rows[0].event;
    expect(staffEvent.notifications.map((n:any)=>n.targetUserId)).toEqual([actor]);
    expect((await run(()=>service.history({subject_id:student,borrower_type:'student'}))).outstanding).toBe(1);
  });
  it('enforces staff identity, borrower limits and concurrent issue protection',async()=>{
    const {barcodes}=await register(3);
    await pool.query(`INSERT INTO library_borrower_limits(tenant_id,borrower_type,max_active_loans) VALUES($1,'student',2)`,[school]);
    await expect(issue(barcodes)).rejects.toThrow('Borrowing limit');
    const attempts=await Promise.allSettled([issue([barcodes[0]]),issue([barcodes[0]])]);
    expect(attempts.filter(a=>a.status==='fulfilled')).toHaveLength(1);
    await issue([barcodes[1]],{borrower_type:'staff',subject_id:staff});
    const history=await run(()=>service.history({subject_id:staff,borrower_type:'staff'}));
    expect(history.outstanding).toBe(1);expect(history.person.name).toBe('Amina Teacher');
    await expect(issue([barcodes[2]],{subject_id:randomUUID()})).rejects.toThrow('not found');
  });
  it('rolls back every book, ledger, audit and event on invalid batch or outbox failure',async()=>{
    const {barcodes}=await register();
    await expect(issue([barcodes[0],'UNKNOWN'])).rejects.toThrow('No books were issued');
    failEvent=true;await expect(issue(barcodes)).rejects.toThrow('Injected outbox failure');failEvent=false;
    expect((await run(()=>service.summary())).issued_copies).toBe(0);
    expect((await pool.query('SELECT count(*)::int n FROM library_copy_loans WHERE tenant_id=$1',[school])).rows[0].n).toBe(0);
    expect((await pool.query(`SELECT count(*)::int n FROM library_circulation_ledger WHERE tenant_id=$1 AND action='issue'`,[school])).rows[0].n).toBe(0);
  });
  it('allows only one concurrent return and makes an invalid multi-return fully atomic',async()=>{
    const {barcodes}=await register();await issue(barcodes.slice(0,2));
    await expect(run(()=>service.returns({barcodes,request_id:randomUUID()}))).rejects.toThrow('no active loan');
    expect((await run(()=>service.summary())).issued_copies).toBe(2);
    const attempts=await Promise.allSettled([1,2].map(()=>run(()=>service.returns({barcodes:[barcodes[0]],request_id:randomUUID()}))));
    expect(attempts.filter(a=>a.status==='fulfilled')).toHaveLength(1);
  });
  it('records loss without inventing a penalty and permanently retires copies',async()=>{
    const {barcodes,copies}=await register(2);await issue([barcodes[0]]);
    await run(()=>service.returns({barcodes:[barcodes[0]],condition:'lost',reason:'Reported missing',request_id:randomUUID()}));
    expect((await run(()=>service.summary())).lost_copies).toBe(1);
    expect((await run(()=>service.history({subject_id:student,borrower_type:'student'}))).outstanding).toBe(1);
    expect((await pool.query('SELECT count(*)::int n FROM library_fines WHERE tenant_id=$1',[school])).rows[0].n).toBe(0);
    await run(()=>service.incident({copy_id:copies[0].id,status:'retired',reason:'Replaced',replacement_copy_id:copies[1].id,request_id:randomUUID()}));
    expect((await run(()=>service.history({subject_id:student,borrower_type:'student'}))).outstanding).toBe(0);
    await expect(run(()=>service.incident({copy_id:copies[0].id,status:'available',reason:'Reuse',request_id:randomUUID()}))).rejects.toThrow('cannot be reused');
  });
  it('keeps lost loans outstanding, retries once and recovers a physical copy without duplicate penalties',async()=>{
    const {barcodes}=await register(1);await issue(barcodes);
    await pool.query(`INSERT INTO library_fine_rules(tenant_id,rule_type,amount_minor) VALUES($1,'lost',500)`,[school]);
    const request={barcodes,condition:'lost',reason:'Missing',request_id:randomUUID()};
    const first=await run(()=>service.returns(request));
    expect(first.returns[0].returned_at).toBeNull();
    expect(await run(()=>service.returns(request))).toEqual(JSON.parse(JSON.stringify(first)));
    await expect(run(()=>service.returns({...request,request_id:randomUUID()}))).rejects.toThrow('already recorded as lost');
    expect((await pool.query('SELECT count(*)::int n FROM library_fines WHERE tenant_id=$1',[school])).rows[0].n).toBe(1);
    await run(()=>service.returns({barcodes,condition:'good',request_id:randomUUID()}));
    expect((await run(()=>service.history({subject_id:student,borrower_type:'student'}))).outstanding).toBe(0);
    expect((await run(()=>service.scan(barcodes[0]))).status).toBe('available');
  });
  it('keeps a zero-loan borrower identifiable and rejects invalid report filters',async()=>{
    const report=await run(()=>reports.borrowerReport({subject_id:student,borrower_type:'student'}));
    expect(report.records).toEqual([]);expect(report.totals.outstanding).toBe(0);
    expect(report.selected_borrower?.borrower_id).toBe(student);
    for(const filters of [null,{search:[]},{search:'a'.repeat(201)},{type:'unknown'},{type:'outstanding',status:'returned'}]){
      await expect(run(()=>reports.borrowerReport(filters as never))).rejects.toMatchObject({status:400});
    }
  });
  it('prints all outstanding copies with renewed dates, loss status, class scope, branding and isolated history',async()=>{
    const {barcodes,copies}=await register(4);const issued=await issue(barcodes);
    await pool.query(`INSERT INTO student_allocations VALUES($1,$2,'Grade 9','East',true)`,[school,student]);
    await run(()=>service.renew({loan_id:issued.loans.find((loan:any)=>loan.barcode===barcodes[0]).id,due_on:'2100-01-31',request_id:randomUUID()}));
    await run(()=>service.returns({barcodes:[barcodes[1]],request_id:randomUUID()}));
    await run(()=>service.returns({barcodes:[barcodes[2]],condition:'lost',reason:'Missing',request_id:randomUUID()}));
    const report=await run(()=>reports.borrowerReport({type:'outstanding',subject_id:student,borrower_type:'student'}));
    expect(report.school.name).toBe('Library QA School');expect(report.generated_by).toBe('QA Librarian');
    expect(report.totals).toMatchObject({copies:3,outstanding:3,students:1});
    expect(report.records.find(r=>r.barcode===barcodes[0])?.due_date).toBe('2100-01-31');
    expect(report.records.find(r=>r.barcode===barcodes[2])?.status).toBe('Lost / unresolved');
    expect(report.records.some(r=>r.barcode===barcodes[1])).toBe(false);
    expect((await run(()=>reports.borrowerReport({type:'history'}))).records).toHaveLength(4);
    expect((await run(()=>reports.borrowerReport({class_name:'Grade 10'}))).records).toHaveLength(0);
    expect((await run(()=>reports.borrowerReport({class_name:'Grade 9',stream_name:'East'}))).records).toHaveLength(3);
    expect((await run(()=>reports.borrowerReport({}),other)).records).toHaveLength(0);
    await expect(run(()=>reports.borrowerReport({subject_id:student,borrower_type:'student'}),other)).rejects.toThrow('not found');
    await run(()=>service.incident({copy_id:copies[2].id,status:'retired',reason:'Loss resolved',request_id:randomUUID()}));
    expect((await run(()=>reports.borrowerReport({}))).records).toHaveLength(2);
    expect((await run(()=>reports.borrowerReport({type:'history'}))).records.find(r=>r.barcode===barcodes[2])?.status).toBe('Resolved loss');
    failEvent=true;await expect(run(()=>reports.borrowerReport({}))).rejects.toThrow('report audit failure');
  });
  it('applies only configured fines through the deployed legacy finance schema',async()=>{
    const {barcodes}=await register(1);await issue(barcodes);
    await pool.query(`INSERT INTO library_fine_rules(tenant_id,rule_type,amount_minor) VALUES($1,'lost',25000)`,[school]);
    await run(()=>service.returns({barcodes,condition:'lost',reason:'Lost in transit',request_id:randomUUID()}));
    const fine=(await pool.query(`SELECT * FROM library_fines WHERE tenant_id=$1`,[school])).rows[0];
    expect(fine).toMatchObject({school_id:school,amount:250,amount_minor:25000,status:'UNPAID'});
    expect(fine.borrower_id).toBeTruthy();expect(fine.copy_id).toBeTruthy();
    const events=(await pool.query(`SELECT event FROM evidence WHERE tenant_id=$1`,[school])).rows;
    expect(events.some(r=>r.event.event.type==='library.fine_created')).toBe(true);
  });
  it('snapshots stock, deduplicates scans and distinguishes issued copies and unknown codes',async()=>{
    const {barcodes}=await register(3);await issue([barcodes[2]]);
    const session=await run(()=>service.startStocktake({name:'Term stocktake',request_id:randomUUID()}));
    const first=await run(()=>service.stocktakeScan(session.id,{barcode:barcodes[0]}));expect(first.outcome).toBe('verified');
    const repeat=await run(()=>service.stocktakeScan(session.id,{barcode:barcodes[0]}));expect(repeat.duplicate).toBe(true);
    expect((await run(()=>service.stocktakeScan(session.id,{barcode:barcodes[2]}))).outcome).toBe('issued_but_present');
    expect((await run(()=>service.stocktakeScan(session.id,{barcode:'UNKNOWN'}))).outcome).toBe('unknown');
    const report=await run(()=>service.stocktakeReport(session.id));expect(report).toMatchObject({total:3,verified:2,issued:1,missing:1});
    await expect(run(()=>service.stocktakeReport(session.id),other)).rejects.toThrow('not found');
    await run(()=>service.completeStocktake(session.id,{request_id:randomUUID()}));
    await expect(run(()=>service.stocktakeScan(session.id,{barcode:barcodes[1]}))).rejects.toThrow('completed');
  });
  it('reapplying additive migration preserves identities, loans, and reservations',async()=>{
    const {barcodes}=await register();await issue(barcodes);const before=await run(()=>service.summary());
    await pool.query(SMART_LIBRARY_SCHEMA_SQL);
    expect(await run(()=>service.summary())).toEqual(before);
  });
  it('preserves legacy reservation numbering and required timestamps',async()=>{
    const {barcodes,title}=await register(1);await issue(barcodes);
    const loan=(await run(()=>service.history({subject_id:student,borrower_type:'student'}))).loans[0];
    const repository=new LibraryRepository(db as never);
    const first=await run(()=>repository.createReservation({tenant_id:school,catalog_item_id:title!,borrower_id:loan.borrower_id}));
    const second=await run(()=>repository.createReservation({tenant_id:school,catalog_item_id:title!,borrower_id:loan.borrower_id}));
    expect(first.queue_position).toBe(1);expect(second.queue_position).toBe(2);
    const rows=(await pool.query('SELECT status,updated_at FROM library_reservations WHERE tenant_id=$1',[school])).rows;
    expect(rows).toHaveLength(2);expect(rows.every(r=>r.status==='waiting'&&r.updated_at instanceof Date)).toBe(true);
    expect((await pool.query('SELECT updated_at FROM library_circulation_ledger WHERE id=$1',[loan.id])).rows[0].updated_at).toBeInstanceOf(Date);
  });
  it('legacy endpoints route through the same loan and inventory records',async()=>{
    const created=await run(()=>service.legacyAdd({title:'Legacy entry',copies:2}));
    const issueResult=await run(()=>service.legacyIssue({student_admission_no:'2451',book_id:created.id,due_on:'2099-12-31'}));
    expect(issueResult.loans).toHaveLength(1);
    await run(()=>service.legacyReturn({loan_id:issueResult.id}));
    expect((await run(()=>service.history({subject_id:student,borrower_type:'student'}))).outstanding).toBe(0);
    const departmentIssue=await run(()=>service.legacyDepartmentIssue({
      catalog_item_id:created.id,staff_identifier:staff,department:'Sciences',due_date:'2099-12-31',
    }));
    expect((await run(()=>service.history({subject_id:staff,borrower_type:'staff'}))).outstanding).toBe(1);
    await run(()=>service.legacyReturn({loan_id:departmentIssue.id}));
    expect(()=>service.legacyDepartmentIssue({catalog_item_id:created.id,staff_identifier:staff})).toThrow('Department');
    await run(()=>service.retireTitle(created.id));
    expect((await run(()=>service.summary())).retired_copies).toBe(2);
  });
  it('keeps library classifications separate from academics and matches titles without merging editions',async()=>{
    const academic=randomUUID(),classA=randomUUID(),classB=randomUUID();
    await pool.query(`INSERT INTO subjects VALUES($1,$2,'Mathematics','active')`,[academic,school]);
    await pool.query(`INSERT INTO class_sections VALUES($1,$3,'Grade 9','9','',true,'active'),($2,$3,'Grade 10','10','',true,'active')`,[classA,classB,school]);
    const subject=await run(()=>service.createSubject({name:'Fiction',request_id:randomUUID()}));
    const batch=await allocate(4),codes=(await pool.query('SELECT barcode FROM library_barcode_registry WHERE batch_id=$1 ORDER BY ordinal',[batch.id])).rows.map(r=>r.barcode);
    const input={title:'A School Book',edition:'Second edition',isbn:'ISBN-2',subject_ids:[subject.id,`academic:${academic}`],class_ids:[classA,classB]};
    const a=await run(()=>service.register({...input,barcode:codes[0],request_id:randomUUID()}));
    expect(a.catalogue.subjects).toHaveLength(2);expect(a.catalogue.subjects.every((s:any)=>!s.id.startsWith('academic:'))).toBe(true);
    const b=await run(()=>service.register({...input,title:' A  School Book ',barcode:codes[1],request_id:randomUUID()}));
    expect(a.catalog_item_id).toBe(b.catalog_item_id);expect(b.reused_title).toBe(true);
    const next=await run(()=>service.register({...input,edition:'Third edition',isbn:'ISBN-3',barcode:codes[2],request_id:randomUUID()}));
    expect(next.catalog_item_id).not.toBe(a.catalog_item_id);
    const novel=await run(()=>service.register({title:'Unrestricted novel',barcode:codes[3],request_id:randomUUID()}));
    const catalogue=await run(()=>service.catalogue({class_id:classA}));expect(catalogue).toHaveLength(2);
    expect(catalogue[0].subjects).toHaveLength(2);expect(catalogue[0].classes).toHaveLength(2);
    expect((await run(()=>service.catalogue({search:'Unrestricted'})))[0].subjects).toEqual([]);
    await expect(run(()=>service.updateTitle({...input,catalog_item_id:novel.catalog_item_id,request_id:randomUUID()}),other)).rejects.toThrow('not found');
    expect((await pool.query('SELECT count(*)::int n FROM subjects WHERE tenant_id=$1',[school])).rows[0].n).toBe(1);
    expect(await run(()=>service.classifications(),other)).toEqual({subjects:[],classes:[]});
    await run(()=>service.updateTitle({...input,title:'Corrected title',catalog_item_id:a.catalog_item_id,request_id:randomUUID()}));
    expect((await run(()=>service.scan(codes[0]))).title).toBe('Corrected title');
  });
  it('returns current title counts when an earlier successful registration is retried',async()=>{
    const batch=await allocate(2);
    const codes=(await run(()=>service.barcodes({batch_id:batch.id}))).map((row:any)=>row.barcode);
    const input={title:'Retry counts',barcode:codes[0],request_id:randomUUID()};
    const first=await run(()=>service.register(input));
    expect(first.catalogue.total_copies).toBe(1);
    await run(()=>service.register({catalog_item_id:first.catalog_item_id,barcode:codes[1],request_id:randomUUID()}));
    const retry=await run(()=>service.register(input));
    expect(retry.id).toBe(first.id);expect(retry.catalogue.total_copies).toBe(2);
    expect(retry.catalogue.available_copies).toBe(2);
  });
  it('registers 1000 reserved copies atomically with retries, rejects occupied ranges and honours copy restrictions',async()=>{
    const original=await register(1),batch=await allocate(1000);
    const input={request_id:randomUUID(),catalog_item_id:original.title,batch_id:batch.id,start:1,end:1000,lendable:false,shelf_location:'Reference'};
    const range=await run(()=>service.registrationRange(input));expect(range.count).toBe(1000);
    expect((await run(()=>service.registerBatch(input))).count).toBe(1000);
    expect((await run(()=>service.registerBatch(input))).count).toBe(1000);
    expect((await run(()=>service.summary())).total_copies).toBe(1001);
    await expect(run(()=>service.registerBatch({...input,request_id:randomUUID()}))).rejects.toThrow('assigned');
    await expect(issue([range.barcodes[0]])).rejects.toThrow('not available');
    const copy=await run(()=>service.scan(range.barcodes[0]));
    await run(()=>service.updateCopy({copy_id:copy.id,lendable:true,shelf_location:'Shelf A',reason:'Moved to lending stock',request_id:randomUUID()}));
    const stock=await run(()=>service.startStocktake({name:'Shelf verification',request_id:randomUUID()}));
    expect((await run(()=>service.stocktakeScan(stock.id,{barcode:copy.barcode,observed_shelf:'Shelf B'}))).outcome).toBe('misplaced');
    await issue([copy.barcode]);
    await expect(run(()=>service.registrationRange(input),other)).rejects.toThrow('range');
    expect((await pool.query('SELECT count(*)::int n FROM library_copy_loans WHERE tenant_id=$1',[school])).rows[0].n).toBe(1);
  },60000);
  it('renews the same loan with policy, idempotency, concurrency and history intact',async()=>{
    const {barcodes}=await register(2);const issued=await issue(barcodes,{due_on:'2098-01-01'});
    await run(()=>service.savePolicy({borrower_type:'student',max_active_loans:5,max_renewals:1,request_id:randomUUID()}));
    const loan=issued.loans[0],input={loan_id:loan.id,due_on:'2099-01-01',request_id:randomUUID()};
    const attempts=await Promise.allSettled([run(()=>service.renew(input)),run(()=>service.renew({...input,request_id:randomUUID()}))]);
    expect(attempts.filter(a=>a.status==='fulfilled')).toHaveLength(1);
    const winner=attempts[0].status==='fulfilled'?input:null;if(winner)await run(()=>service.renew(winner));
    expect((await pool.query('SELECT count(*)::int n FROM library_copy_loans WHERE tenant_id=$1',[school])).rows[0].n).toBe(2);
    expect((await pool.query('SELECT count(*)::int n FROM library_renewals WHERE tenant_id=$1',[school])).rows[0].n).toBe(1);
    const history=await run(()=>service.history({subject_id:student,borrower_type:'student'}));
    expect(history.loans.find((l:any)=>l.id===loan.id)?.renewal_count).toBe(1);
    await expect(run(()=>service.renew({...input,due_on:'2099-02-01',request_id:randomUUID()}),other)).rejects.toThrow('not found');
    await pool.query(`UPDATE students SET status='graduated' WHERE id=$1`,[student]);
    await expect(run(()=>service.renew({loan_id:issued.loans[1].id,due_on:'2099-01-01',request_id:randomUUID()}))).rejects.toThrow('eligible');
    await run(()=>service.returns({barcodes:[loan.barcode],request_id:randomUUID()}));
    await expect(run(()=>service.renew({...input,request_id:randomUUID()}))).rejects.toThrow('active loan');
    expect((await run(()=>service.history({subject_id:student,borrower_type:'student'}))).outstanding).toBe(1);
  });
});
