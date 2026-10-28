import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { normalizeClassExamConfiguration, classExamWindows } from './class-exam-configuration';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
test('independent 9/7/6 selections never create a Cartesian product', () => {
  const config = normalizeClassExamConfiguration([9,7,6].map((count, c) => ({
    class_section_id: id(c + 1), subject_ids: Array.from({length:count}, (_, s) => id(10+c*10+s)),
  })));
  assert.equal(classExamWindows(config).length, 22);
  assert.equal(classExamWindows(config).filter(w => w.class_section_id === id(2)).length, 7);
});
test('stream exceptions retain default subjects and independently exclude/add offerings', () => {
  const config = normalizeClassExamConfiguration([{class_section_id:id(1),subject_ids:[id(10)],
    stream_subjects:[{stream_id:id(2),subject_ids:[id(11)]}]}]);
  assert.deepEqual(classExamWindows(config), [
    {class_section_id:id(1),subject_id:id(10),stream_scope:{default:true,overrides:{[id(2)]:false}}},
    {class_section_id:id(1),subject_id:id(11),stream_scope:{default:false,overrides:{[id(2)]:true}}},
  ]);
});
test('rejects legacy global selection, duplicates and invalid identifiers; keeps empty draft class', () => {
  assert.throws(() => normalizeClassExamConfiguration(undefined));
  assert.throws(() => normalizeClassExamConfiguration([{class_section_id:id(1),subject_ids:[id(2),id(2)]}]));
  assert.throws(() => normalizeClassExamConfiguration([{class_section_id:'wrong',subject_ids:[]}]));
  assert.deepEqual(classExamWindows(normalizeClassExamConfiguration([{class_section_id:id(1),subject_ids:[]}])), []);
});
