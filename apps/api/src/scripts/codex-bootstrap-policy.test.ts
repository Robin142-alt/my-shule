import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const workspaceRoot = process.cwd();

test('root AGENTS.md preserves the MyShule autonomous ERP bootstrap contract', () => {
  const source = readFileSync(join(workspaceRoot, 'AGENTS.md'), 'utf8');

  for (const marker of [
    'CODEx Master Bootstrap',
    'AGP Governance',
    'Autonomous Runtime Execution',
    'Agent Governance Protocol',
    'Tenant Isolation Layer',
    'Event Bus Initialization',
    'Database Contract Layer',
    'Widget Registry Initialization',
    'Self-Healing Autonomous Agents',
    'Cloud-Native Execution Layer',
    'Global Execution Loop',
  ]) {
    assert.match(source, new RegExp(escapeRegExp(marker), 'i'), `missing bootstrap marker: ${marker}`);
  }
});

test('web agent instructions inherit the root MyShule bootstrap before Next.js rules', () => {
  const source = readFileSync(join(workspaceRoot, 'apps/web/AGENTS.md'), 'utf8');
  const bootstrapIndex = source.indexOf('MyShule Root Bootstrap Applies');
  const nextIndex = source.indexOf('BEGIN:nextjs-agent-rules');

  assert.notEqual(bootstrapIndex, -1);
  assert.notEqual(nextIndex, -1);
  assert.equal(bootstrapIndex < nextIndex, true);
  assert.match(source, /repository root `AGENTS\.md` MyShule Codex Core Bootstrap/);
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
