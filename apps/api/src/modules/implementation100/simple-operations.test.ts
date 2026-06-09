import assert from 'node:assert/strict';
import test from 'node:test';

import { SimpleOperationsRepository } from './simple-operations';

test('SimpleOperationsRepository returns explicit columns for create and status updates', async () => {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const repository = new SimpleOperationsRepository({
    query: async (text: string, values: unknown[]) => {
      queries.push({ text, values });
      return {
        rows: [
          {
            id: '00000000-0000-0000-0000-000000000901',
            tenant_id: values[0],
            title: values[1] ?? 'Projector',
            category: null,
            owner_name: null,
            status: values[4] ?? values[2] ?? 'active',
            priority: 'normal',
            due_date: null,
            metric_count: 0,
            notes: null,
            metadata: {},
            created_by_user_id: null,
            created_at: new Date('2026-05-31T06:30:00.000Z'),
            updated_at: new Date('2026-05-31T06:30:00.000Z'),
          },
        ],
      };
    },
  } as never, {
    mainTable: 'assets',
    auditTable: 'asset_audit_logs',
  });

  await repository.createRecord({
    tenant_id: 'tenant-a',
    title: 'Science projector',
    status: 'active',
    created_by_user_id: null,
  });
  await repository.updateStatus({
    tenant_id: 'tenant-a',
    record_id: '00000000-0000-0000-0000-000000000901',
    status: 'maintenance',
  });

  assert.doesNotMatch(queries[0]?.text ?? '', /RETURNING\s+\*/i);
  assert.doesNotMatch(queries[1]?.text ?? '', /RETURNING\s+\*/i);
  assert.match(queries[0]?.text ?? '', /RETURNING\s+id::text,/);
  assert.match(queries[1]?.text ?? '', /RETURNING\s+id::text,/);
  assert.match(queries[0]?.text ?? '', /tenant_id/);
  assert.match(queries[1]?.text ?? '', /updated_at/);
});
