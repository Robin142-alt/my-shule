import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BillingService } from './billing.service';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { RequestContextService } from '../../common/request-context/request-context.service';

const context = new RequestContextService();
const asSchool = <T>(work: () => T) => context.run({ tenant_id: 'school-a', user_id: 'actor', is_authenticated: true } as never, work);
const base = { name: 'Term fees', academic_year: '2026', term: 'Term 3', grade_level: 'Grade 7', line_items: [{ code: 'tuition', label: 'Tuition', amount_minor: '10000' }] };
function serviceWith(repository: unknown) {
  return new BillingService(context, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, undefined, undefined, repository as never);
}
test('fee plan rejects empty, duplicated or oversized grade selections', async () => {
  for (const grade_levels of [[], [''], ['Grade 7', 'Grade 7'], Array(41).fill('Grade 7')]) {
    const errors = await validate(plainToInstance(CreateFeeStructureDto, { ...base, grade_levels }));
    assert.ok(errors.some(error => error.property === 'grade_levels'));
  }
});
test('fee plan stores validated grade selections and ignores forged scope metadata', async () => {
  let saved: any;
  const service = serviceWith({ create: async (input: unknown) => { saved = input; return { ...input as object, id: 'plan', created_at: new Date(), updated_at: new Date() }; } });
  const response = await asSchool(() => service.createFeeStructure({ ...base, grade_levels: ['Grade 7', 'Grade 8'], metadata: { billing_grade_levels: ['Form 4'] } } as never));
  assert.equal(saved.tenant_id, 'school-a');
  assert.deepEqual(saved.metadata.billing_grade_levels, ['Grade 7', 'Grade 8']);
  assert.deepEqual(response.grade_levels, ['Grade 7', 'Grade 8']);
  await asSchool(() => service.createFeeStructure({ ...base, metadata: { billing_grade_levels: ['Form 4'] } }));
  assert.deepEqual(saved.metadata.billing_grade_levels, ['Grade 7']);
});
test('roster options and multi-grade billing remain scoped to the authenticated school', async () => {
  const scopes: unknown[] = [];
  const service = serviceWith({
    listRosterOptions: async (school: string) => { assert.equal(school, 'school-a'); return []; },
    findById: async (school: string) => { assert.equal(school, 'school-a'); return { status: 'active', grade_level: 'Grade 7', class_name: null, metadata: { billing_grade_levels: ['Grade 7', 'Grade 8'] } }; },
    listBillableStudentsForFeeStructure: async (school: string, scope: unknown) => { assert.equal(school, 'school-a'); scopes.push(scope); return []; },
  });
  await asSchool(() => service.listFeeRosterOptions());
  await asSchool(() => service.listBillableStudentsForFeeStructure('plan'));
  assert.deepEqual(scopes, [{ grade_level: 'Grade 7', grade_levels: ['Grade 7', 'Grade 8'], class_name: null }]);
});
