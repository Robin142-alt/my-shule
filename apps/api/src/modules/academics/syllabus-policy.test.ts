import { test } from 'node:test';
import assert from 'node:assert/strict';
import { syllabusProgress, validateSyllabusContent } from './syllabus-policy';

const content = () => ({ topics: [{ id: 'topic', title: 'Numbers', expected_on: '2026-03-20', archived: false,
  subtopics: [
    { id: 'one', title: 'Integers', required: true, archived: false },
    { id: 'two', title: 'Fractions', required: true, archived: false },
    { id: 'extra', title: 'Extension', required: false, archived: false },
  ] }], milestones: [{ id: 'checkpoint', title: 'First checkpoint', due_on: '2026-03-10', subtopic_ids: ['one'] }] });

test('only completed required subtopics contribute to progress; elapsed time never completes work', () => {
  const plan = content();
  assert.equal(syllabusProgress(plan, [], '2026-03-25').percentage, 0);
  const progress = syllabusProgress(plan, [{ subtopic_id: 'one', completed: true }, { subtopic_id: 'extra', completed: true }], '2026-03-25');
  assert.equal(progress.percentage, 50);
  assert.equal(progress.completed_topics, 0);
  assert.deepEqual(progress.remaining.map(x => x.id), ['two']);
  assert.equal(progress.overdue.length, 1);
  assert.equal(syllabusProgress(plan, [{ subtopic_id: 'one', completed: true }, { subtopic_id: 'two', completed: true }], '2026-03-25').completed_topics, 1);
});

test('milestones flag outstanding targeted subtopics and unticking restores outstanding work', () => {
  assert.equal(syllabusProgress(content(), [], '2026-03-11').status, 'Behind');
  assert.equal(syllabusProgress(content(), [], '2026-03-11').expected_percentage, 50);
  assert.equal(syllabusProgress(content(), [{ subtopic_id: 'one', completed: true }], '2026-03-11').status, 'On track');
  assert.equal(syllabusProgress(content(), [{ subtopic_id: 'two', completed: true }], '2026-03-11').status, 'Behind');
  assert.equal(syllabusProgress(content(), [{ subtopic_id: 'one', completed: false }], '2026-03-11').milestones[0].status, 'Overdue');
});

test('empty and retired requirements are never reported as completed', () => {
  const plan = content();
  plan.topics[0].archived = true;
  const progress = syllabusProgress(plan, [{ subtopic_id: 'one', completed: true }], '2026-03-25');
  assert.equal(progress.percentage, 0);
  assert.equal(progress.status, 'No required subtopics');
  assert.equal(progress.completed_topics, 0);
});

test('milestones retain evidence of late delivery using the Kenyan school date', () => {
  const progress = syllabusProgress(content(), [{ subtopic_id: 'one', completed: true, completed_at: '2026-03-10T22:00:00Z' }], '2026-03-11');
  assert.equal(progress.milestones[0].status, 'Completed late');
  assert.equal(progress.status, 'On track');
});

test('revisions preserve prior IDs, reject duplicates and invalid milestone references and dates', () => {
  const bounds = { starts_on: '2026-01-01', ends_on: '2026-04-30' };
  const plan = content();
  assert.equal(validateSyllabusContent(plan, bounds, plan).topics.length, 1);
  assert.throws(() => validateSyllabusContent({ topics: [], milestones: [] }, bounds, plan), /preserve|retain/i);
  const duplicate = content(); duplicate.topics[0].subtopics[1].id = 'one';
  assert.throws(() => validateSyllabusContent(duplicate, bounds), /unique/i);
  const invalid = content(); invalid.milestones[0].subtopic_ids = ['missing'];
  assert.throws(() => validateSyllabusContent(invalid, bounds), /subtopic/i);
  invalid.milestones[0].subtopic_ids = ['one']; invalid.milestones[0].due_on = '2026-02-30';
  assert.throws(() => validateSyllabusContent(invalid, bounds), /date/i);
  invalid.milestones[0].due_on = '2027-01-01';
  assert.throws(() => validateSyllabusContent(invalid, bounds), /term/i);
});
