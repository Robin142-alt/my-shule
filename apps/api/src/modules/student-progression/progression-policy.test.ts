import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarEligibility, resolveNextClass, activeLearner, localDay } from './progression-policy';

const year = { id: '2026', name: '2026', starts_on: '2026-01-01', ends_on: '2026-12-31', status: 'active' };
const terms = [{ starts_on: '2026-01-10', ends_on: '2026-04-10', status: 'closed' }, { starts_on: '2026-05-01', ends_on: '2026-11-20', status: 'active' }];
const next = { ...year, id: '2027', name: '2027', starts_on: '2027-01-01', ends_on: '2027-12-31' };
const section = (grade: number, curriculum_model = 'CBC') => ({ id: `${curriculum_model}-${grade}`, name: `${curriculum_model === '8-4-4' ? 'Form' : 'Grade'} ${grade}`, grade_level: String(grade), curriculum_model, academic_level_id: 'level' });

test('school local midnight ends the whole final day, independently of host timezone', () => {
  assert.equal(localDay(new Date('2026-12-31T21:01:00Z'), 'Africa/Nairobi'), '2027-01-01');
  assert.equal(calendarEligibility(year, terms, [year,next], 'Africa/Nairobi', new Date('2026-12-31T20:59:59Z')).due, false);
  assert.equal(calendarEligibility(year, terms, [year,next], 'Africa/Nairobi', new Date('2026-12-31T21:00:00Z')).due, true);
  assert.equal(calendarEligibility(year, terms, [year,next], 'America/New_York', new Date('2026-12-31T21:00:00Z')).due, false);
});
test('empty, fabricated, overlapping and out-of-range calendars are blocked', () => {
  const at = new Date('2027-01-02T12:00:00Z');
  assert.ok(calendarEligibility(year, [], [year,next], 'Africa/Nairobi', at).blocker);
  assert.ok(calendarEligibility({...year, starts_on:year.ends_on}, terms, [next], 'Africa/Nairobi', at).blocker);
  assert.ok(calendarEligibility(year, [...terms,{starts_on:'2026-03-01',ends_on:'2026-06-01'}], [year,next], 'Africa/Nairobi', at).blocker);
  assert.ok(calendarEligibility(year, [{starts_on:'2026-02-01',ends_on:'2027-02-01'}], [year,next], 'Africa/Nairobi', at).blocker);
  assert.ok(calendarEligibility(year, terms, [year,{...next,starts_on:'2026-12-20'}], 'Africa/Nairobi', at).blocker);
  assert.ok(calendarEligibility(year, terms, [year,next], 'Invalid/Timezone', at).blocker);
});
test('CBC and legacy pathways progress without crossing curricula', () => {
  assert.equal(resolveNextClass(section(7), [section(8),section(2,'8-4-4')]).target?.id, 'CBC-8');
  assert.equal(resolveNextClass(section(2,'8-4-4'), [section(3),section(3,'8-4-4')]).target?.id, '8-4-4-3');
  assert.equal(resolveNextClass(section(8,'CBE'), [section(9,'CBE')]).target?.id, 'CBE-9');
});
test('final grades complete, never invent Form 5 or Grade 13', () => {
  assert.equal(resolveNextClass(section(4,'8-4-4'), []).completion, 'graduated');
  assert.equal(resolveNextClass(section(12), []).completion, 'graduated');
  assert.ok(resolveNextClass(section(8), [section(10)]).blocker);
});
test('missing classes never imply an institution boundary without explicit school offering evidence', () => {
  assert.ok(resolveNextClass(section(9), []).blocker);
  assert.equal(resolveNextClass(section(9), [], {institution_end:'Grade 9'}).completion, 'completed');
  assert.equal(resolveNextClass(section(6), [], {institution_end:'Grade 6'}).completion, 'completed');
});
test('repeating terminal learners stay in their grade and duplicates are ambiguous', () => {
  assert.equal(resolveNextClass(section(12), [section(12)], {}, true).target?.id, 'CBC-12');
  assert.ok(resolveNextClass(section(7), [section(8),{...section(8),id:'second'}]).blocker);
});
test('configured custom sequence is honored but missing information fails visibly', () => {
  const source = {...section(1,'Custom'), grade_level:'Foundation', name:'Foundation'};
  const target = {...source,id:'advanced',name:'Advanced',grade_level:'Advanced'};
  assert.equal(resolveNextClass(source,[target],{sequence:['Foundation','Advanced']}).target?.id,'advanced');
  assert.ok(resolveNextClass(source,[target]).blocker);
});
test('both student lifecycle representations must permit enrollment', () => {
  assert.equal(activeLearner({status:'active',student_status:'ACTIVE'}),true);
  for(const status of ['SUSPENDED','TRANSFERRED_OUT','WITHDRAWN','GRADUATED','ALUMNI','INACTIVE'])
    assert.equal(activeLearner({status:'active',student_status:status}),false);
  assert.equal(activeLearner({status:'withdrawn',student_status:'ACTIVE'}),false);
});
