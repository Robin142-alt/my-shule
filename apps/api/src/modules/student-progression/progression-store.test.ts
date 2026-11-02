import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeProgression, digest, validateMembership } from './progression-store';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from '../../guards/rbac.guard';
import { StudentProgressionController } from './student-progression.controller';

test('the existing tenant owner can open progression through both route and service authorization', () => {
  const actor = { tenantId: 'school-a', userId: 'owner-a', role: 'owner', permissions: ['*:*'] };
  const guard = new RbacGuard(new Reflector(), { requireStore: () => ({ ...actor, is_authenticated: true }) } as any);
  assert.equal(guard.canActivate({ getHandler: () => StudentProgressionController.prototype.overview, getClass: () => StudentProgressionController } as any), true);
  assert.doesNotThrow(() => authorizeProgression(actor));
  assert.doesNotThrow(() => authorizeProgression(actor, true));
});

test('leadership access still requires capability, school identity and active membership', async () => {
  const actor = { tenantId: 'school-a', userId: 'leader', role: 'owner', permissions: ['academics:read'] };
  assert.doesNotThrow(() => authorizeProgression(actor));
  assert.throws(() => authorizeProgression(actor, true), /cannot perform/);
  assert.throws(() => authorizeProgression({ ...actor, role: 'teacher', permissions: ['*:*'] }), /leadership/);
  assert.throws(() => authorizeProgression({ ...actor, tenantId: '' }), /school identity/);
  assert.throws(() => authorizeProgression({ ...actor, userId: null }), /leadership/);
  const calls: unknown[][] = [];
  await assert.rejects(validateMembership({ $queryRawUnsafe: async (...args: unknown[]) => { calls.push(args); return []; } } as any, actor), /active school membership/);
  assert.deepEqual(calls[0].slice(1), ['school-a', 'leader']);
});

test('optimistic versions survive PostgreSQL JSONB key ordering and date serialization',()=>{
  const before={student:{id:'learner',status:'active'},created:new Date('2026-10-25T08:00:00Z'),subjects:[{id:'math',active:true}]};
  const stored={subjects:[{active:true,id:'math'}],created:'2026-10-25T08:00:00.000Z',student:{status:'active',id:'learner'}};
  assert.equal(digest(before),digest(stored));
  assert.notEqual(digest(before),digest({...stored,student:{...stored.student,status:'withdrawn'}}));
});
