import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  renderImplementation300CertificationMarkdown,
  runImplementation300Certification,
} from './implementation300-certification';

describe('Implementation 300 certification', () => {
  it('passes against the current blueprint evidence registry', () => {
    const result = runImplementation300Certification({
      workspaceRoot: process.cwd(),
      generatedAt: '2026-05-22T00:00:00.000Z',
    });

    assert.equal(result.ok, true);
    assert.equal(result.section_count, 24);
    assert.equal(result.module_count, 28);
    assert.equal(result.scale_targets.minimumSchools, 1000);
  });

  it('fails when required blueprint evidence is missing', () => {
    const result = runImplementation300Certification({
      workspaceRoot: process.cwd(),
      sourceOverrides: {
        'apps/api/src/modules/module-access/module-access.constants.ts': '',
      },
    });

    assert.equal(result.ok, false);
    assert.ok(result.sections.some((section) => section.status === 'fail'));
  });

  it('renders a safe markdown certification artifact', () => {
    const result = runImplementation300Certification({
      workspaceRoot: process.cwd(),
      generatedAt: '2026-05-22T00:00:00.000Z',
    });
    const markdown = renderImplementation300CertificationMarkdown(result);

    assert.match(markdown, /Implementation 300 Blueprint Compliance Certification/);
    assert.match(markdown, /School onboarding workflow/);
    assert.match(markdown, /AI Insights/);
    assert.match(markdown, /1000/);
    assert.doesNotMatch(markdown, /SECRET|TOKEN|PASSWORD/i);
  });
});
