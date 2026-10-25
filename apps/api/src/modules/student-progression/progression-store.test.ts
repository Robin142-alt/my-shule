import assert from 'node:assert/strict';
import test from 'node:test';
import { digest } from './progression-store';

test('optimistic versions survive PostgreSQL JSONB key ordering and date serialization',()=>{
  const before={student:{id:'learner',status:'active'},created:new Date('2026-10-25T08:00:00Z'),subjects:[{id:'math',active:true}]};
  const stored={subjects:[{active:true,id:'math'}],created:'2026-10-25T08:00:00.000Z',student:{status:'active',id:'learner'}};
  assert.equal(digest(before),digest(stored));
  assert.notEqual(digest(before),digest({...stored,student:{...stored.student,status:'withdrawn'}}));
});
