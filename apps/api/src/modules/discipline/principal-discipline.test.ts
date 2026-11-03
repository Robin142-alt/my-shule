import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from 'class-validator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { CreateDisciplineIncidentDto } from './dto/discipline.dto';
import { DisciplineService } from './discipline.service';
import { DisciplineRepository } from './repositories/discipline.repository';
import { AdminCommandRepository } from '../admin-command/repositories/admin-command.repository';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const input = { student_id: id(1), class_id: id(2), academic_term_id: id(3), academic_year_id: id(4), offense_category_id: id(5), title: 'Case', severity: 'medium' as const, occurred_at: '2026-11-02T07:00:00Z', description: 'Recorded incident' };
const actor = { tenant_id: 'tenant-a', user_id: id(6), role: 'principal', permissions: ['discipline:read','discipline:write'], request_id:'test', session_id:null, client_ip:null, user_agent:null, method:'POST', path:'/discipline/incidents', started_at:new Date().toISOString(), is_authenticated:true };

test('incident contract accepts all canonical severities and rejects the old uppercase labels', async () => {
  for (const severity of ['low', 'medium', 'high', 'critical']) assert.equal((await validate(Object.assign(new CreateDisciplineIncidentDto(), input, { severity }))).length, 0);
  for (const severity of ['MINOR', 'MAJOR', 'CRITICAL']) assert.ok((await validate(Object.assign(new CreateDisciplineIncidentDto(), input, { severity }))).some(error => error.property === 'severity'));
});

test('incident creation rejects foreign or inconsistent learner, school, class, term and staff references before writing', async () => {
  const context = new RequestContextService(); let writes = 0; let checked = false;
  const repository = {
    findTenantSchoolId: async () => id(7),
    hasIncidentReferences: async (tenant: string, dto: unknown, staff: string) => { assert.equal(tenant, 'tenant-a'); assert.equal(dto, input); assert.equal(staff, actor.user_id); checked = true; return false; },
    findOffenseCategoryById: async () => ({ id:id(5), default_points:0 }),
    generateIncidentNumber: async () => 'DIS-1', createIncident: async () => { writes++; return {id:id(8)}; }, createAuditLog: async () => undefined,
  };
  const service = new DisciplineService(context, {} as never, {} as never, repository as never);
  await context.run(actor, async () => {
    await assert.rejects(() => service.createIncident(input), /school|learner|academic/i);
    assert.equal(checked, true); assert.equal(writes, 0);
    await assert.rejects(() => service.createIncident({...input, school_id:id(99)}), /school/i);
  });
  await context.run({...actor, permissions:['discipline:read']}, () => assert.rejects(() => service.createIncident(input), /permission/i));
});

test('incident search covers admission numbers and learner names while retaining tenant and staff visibility', async () => {
  let sql = ''; let values: unknown[] = [];
  const repository = new DisciplineRepository({ executeWithTenant: async (tenant: string, _actor: unknown, callback: Function) => {
    assert.equal(tenant, 'tenant-a'); return callback({ $queryRawUnsafe: async (query: string, ...params: unknown[]) => { sql=query; values=params; return []; } });
  }} as never);
  await repository.listIncidents({ tenant_id:'tenant-a', actor_user_id:id(6), can_read_all:false, query:{q:'ADM-42', limit:25} });
  assert.match(sql, /student\.admission_number ILIKE/);
  assert.match(sql, /student\.tenant_id = discipline_incidents\.tenant_id/);
  assert.match(sql, /reporting_staff_id = \$13::uuid/);
  assert.equal(values[0], 'tenant-a'); assert.equal(values[10], 'ADM-42'); assert.equal(values[11], false);
});

test('legacy incident intake binds the school as SQL tenant and rejects a foreign learner without an insert', async () => {
  let parameters: unknown[] = [];
  const repository = new AdminCommandRepository({ executeWithTenant: async (tenant: string, _actor: unknown, callback: Function) => {
    assert.equal(tenant, id(7)); return callback({$queryRawUnsafe:async (sql:string,...params:unknown[])=>{
      parameters=params;assert.match(sql,/WHERE EXISTS \(SELECT 1 FROM students WHERE tenant_id = \$1 AND id::text = \$7/);return [];
    }});
  }} as never);
  assert.equal(await repository.reportIncident({tenant_id:id(7),user_id:id(6),student_id:id(1),category:'Conduct',severity:'medium',description:'Recorded details'}),undefined);
  assert.equal(parameters[0],id(7));assert.equal(parameters[6],id(1));
});
