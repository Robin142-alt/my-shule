import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { LEGAL_DOCUMENTS } from '../../../../../shared/legal/documents';
import { isLegalEnforcementActive, needsGuardian, outstandingDocuments, validateSelections } from './legal-policy';

test('rollout preparation is server-only and enforcement is the fail-closed default', () => {
  const previous = process.env.LEGAL_ROLLOUT_MODE;
  try {
    delete process.env.LEGAL_ROLLOUT_MODE; assert.equal(isLegalEnforcementActive(), true);
    process.env.LEGAL_ROLLOUT_MODE = 'unknown'; assert.equal(isLegalEnforcementActive(), true);
    process.env.LEGAL_ROLLOUT_MODE = 'prepare'; assert.equal(isLegalEnforcementActive(), false);
    process.env.LEGAL_ROLLOUT_MODE = 'active'; assert.equal(isLegalEnforcementActive(), true);
  } finally {
    if (previous === undefined) delete process.env.LEGAL_ROLLOUT_MODE;
    else process.env.LEGAL_ROLLOUT_MODE = previous;
  }
});

test('unknown age, future birth dates and children require guardian authorisation', () => {
  const now = new Date('2026-10-09T08:00:00Z');
  assert.equal(needsGuardian(null, now), true);
  assert.equal(needsGuardian('invalid', now), true);
  assert.equal(needsGuardian('2030-01-01', now), true);
  assert.equal(needsGuardian('2008-10-10', now), true);
  assert.equal(needsGuardian('2008-10-09', now), false);
});

test('only material acceptance generations require renewed acknowledgement', () => {
  const current = [{ id: 'terms-1.1', kind: 'terms', generation: 1 }];
  assert.deepEqual(outstandingDocuments(current, [{ kind: 'terms', generation: 1 }]), []);
  assert.equal(outstandingDocuments([{ ...current[0], generation: 2 }], [{ kind: 'terms', generation: 1 }]).length, 1);
});

test('acceptance requires exact current versions, affirmative booleans and no duplicates', () => {
  const current = [{ id: 'terms-1.0', kind: 'terms', generation: 1 }];
  assert.doesNotThrow(() => validateSelections([{ document_id: 'terms-1.0', checked: true }], current));
  for (const selections of [[], [{ document_id: 'terms-1.0', checked: false }], [{ document_id: 'terms-0.9', checked: true }], [{ document_id: 'terms-1.0', checked: 'true' }], [{ document_id: 'terms-1.0', checked: true }, { document_id: 'terms-1.0', checked: true }]]) {
    assert.throws(() => validateSelections(selections, current));
  }
});

test('published document hashes bind the exact approved source text', () => {
  for (const document of LEGAL_DOCUMENTS) {
    assert.equal(createHash('sha256').update(document.content).digest('hex'), document.sha256);
    assert.match(document.content, /Orbitlane Technologies/);
    assert.match(document.content, /orbitlanetechnology@gmail.com/);
    if ('sourceSha256' in document) assert.equal(createHash('sha256').update(readFileSync(`apps/web/public${document.sourceUrl}`)).digest('hex'),document.sourceSha256);
  }
});
