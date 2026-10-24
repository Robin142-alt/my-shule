import assert from 'node:assert/strict';
import { test } from 'node:test';
import { combinePapers, examGradeOverride } from './exam-result-policy';

test('combines unequal maxima and preserves explicit weighting', () => {
  const papers = [{ score: 10, max_score: 20, score_status: 'entered' }, { score: 60, max_score: 80, score_status: 'entered' }];
  assert.equal(combinePapers(papers).percentage, 70);
  assert.equal(combinePapers(papers.map(p => ({ ...p, weight: 1 }))).percentage, 62.5);
  assert.equal(combinePapers([{ score: 120, max_score: 150, score_status: 'entered' }]).percentage, 80);
});

test('Y overrides X anywhere and resolving evidence restores the result', () => {
  assert.equal(examGradeOverride(['entered', 'X']), 'X');
  assert.equal(examGradeOverride(['X', 'entered', 'Y']), 'Y');
  assert.equal(examGradeOverride(['Y', 'X']), 'Y');
  assert.equal(examGradeOverride(['entered', 'entered']), null);
  assert.equal(combinePapers([{ score: null, max_score: 20, score_status: 'X' }, { score: 100, max_score: 100, score_status: 'entered' }]).percentage, null);
});

test('missing is distinct from zero and exemptions do not penalize other papers', () => {
  assert.equal(combinePapers([{ score: 0, max_score: 80, score_status: 'entered' }]).percentage, 0);
  assert.equal(combinePapers([{ score: null, max_score: 80, score_status: 'entered' }]).status, 'X');
  assert.equal(combinePapers([{ score: 40, max_score: 80, score_status: 'entered' }, { score: null, max_score: 20, score_status: 'exempt' }]).percentage, 50);
});
