import assert from 'node:assert/strict';
import test from 'node:test';

import { CounsellingController } from './counselling.controller';
import { CounsellingService } from './counselling.service';

test('CounsellingService overview is calculated from tenant-scoped counselling data', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new CounsellingService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          open_cases: 4,
          new_referrals: 2,
          appointments_today: 1,
          follow_ups_due: 3,
          high_priority: 1,
          parent_contacts_pending: 5,
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getOverview('tenant-a');

  assert.equal(result.openCases, 4);
  assert.equal(result.newReferrals, 2);
  assert.equal(result.followUpsDue, 3);
  assert.match(queries[0].sql, /counselling_referrals/);
  assert.match(queries[0].sql, /counselling_sessions/);
  assert.match(queries[0].sql, /tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
});

test('CounsellingService returns referrals with student names using tenant scope', async () => {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const service = new CounsellingService({
    query: async (sql: string, params: unknown[]) => {
      queries.push({ sql, params });
      return {
        rows: [{
          id: 'referral-a',
          learner: 'Amina Otieno',
          admission_number: 'ADM-001',
          status: 'open',
          reason: 'Anxiety follow-up',
          risk_level: 'high',
          created_at: '2026-06-20T09:15:00.000Z',
        }],
        rowCount: 1,
      };
    },
  } as never);

  const result = await service.getReferrals('tenant-a');

  assert.equal(result.length, 1);
  assert.equal(result[0].learner, 'Amina Otieno');
  assert.match(queries[0].sql, /FROM counselling_referrals/);
  assert.match(queries[0].sql, /JOIN students/);
  assert.match(queries[0].sql, /referral\.tenant_id = \$1/);
  assert.equal(queries[0].params[0], 'tenant-a');
});

test('CounsellingController uses request tenant context instead of hardcoded tenants', async () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const controller = new CounsellingController(
    {
      getReferrals: async (...args: unknown[]) => {
        calls.push({ method: 'getReferrals', args });
        return [{ id: 'referral-a' }];
      },
    } as never,
    { requireStore: () => ({ tenant_id: 'tenant-a', user_id: 'counsellor-a' }) } as never,
  );

  const result = await controller.getReferrals();

  assert.deepEqual(result, [{ id: 'referral-a' }]);
  assert.deepEqual(calls, [{ method: 'getReferrals', args: ['tenant-a'] }]);
});
