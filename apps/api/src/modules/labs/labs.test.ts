import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

import { DEFAULT_ROLE_CATALOG, PERMISSIONS_KEY } from '../../auth/auth.constants';
import { MODULE_ACCESS_KEY } from '../module-access/module-access.decorator';
import { LabsController } from './labs.controller';
import { LabsProcessor } from './labs.processor';
import { LabsRepository } from './repositories/labs.repository';
import { LabsSchemaService } from './labs-schema.service';
import { LabsService } from './labs.service';

test('LabsSchemaService creates tenant-safe lab, equipment, chemical, and attendance tables', async () => {
  let schemaSql = '';
  const service = new LabsSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      schemaSql += sql;
    },
  } as never);

  await service.onModuleInit();

  for (const table of [
    'lab_departments',
    'labs',
    'lab_sessions',
    'lab_attendance',
    'lab_equipment',
    'chemical_items',
    'lab_session_equipment_usage',
    'lab_session_chemical_usage',
    'chemical_disposal_requests',
    'lab_storage_locations',
    'lab_practical_requests',
    'lab_practical_request_items',
    'lab_issue_records',
    'lab_issue_lines',
    'lab_issue_returns',
    'lab_stock_movements',
    'lab_breakage_loss_records',
    'lab_stocktakes',
    'lab_stocktake_lines',
    'lab_safety_checks',
  ]) {
    assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schemaSql, new RegExp(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
  }

  assert.match(schemaSql, /expiry_date/);
  assert.match(schemaSql, /audit_log_reference/);
  assert.match(schemaSql, /uq_lab_stock_movements_submission/);
  assert.match(schemaSql, /uq_lab_safety_checks_submission/);
  assert.match(schemaSql, /last_review_submission_id/);
  assert.match(schemaSql, /last_preparation_submission_id/);
  assert.match(schemaSql, /DEPUTY_PRINCIPAL/);
  assert.match(schemaSql, /quantity_total TYPE numeric\(12, 3\)/);
  const addQuantityInUse = schemaSql.indexOf('ADD COLUMN IF NOT EXISTS quantity_in_use');
  const alterQuantityInUse = schemaSql.indexOf('ALTER COLUMN quantity_in_use TYPE');
  const addQuantityDamaged = schemaSql.indexOf('ADD COLUMN IF NOT EXISTS quantity_damaged');
  const alterQuantityDamaged = schemaSql.indexOf('ALTER COLUMN quantity_damaged TYPE');
  assert.ok(addQuantityInUse >= 0 && addQuantityInUse < alterQuantityInUse, 'legacy quantity_in_use must be added before its type is altered');
  assert.ok(addQuantityDamaged >= 0 && addQuantityDamaged < alterQuantityDamaged, 'legacy quantity_damaged must be added before its type is altered');
  assert.match(schemaSql, /app\.role[\s\S]+'system'/);
});

test('LabsController is gated by lab management module and lab permissions', () => {
  assert.deepEqual(Reflect.getMetadata(MODULE_ACCESS_KEY, LabsController), ['lab_management']);
  const handler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'createLabSession')?.value;

  assert.ok(handler);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, handler), ['labs:write']);

  const requestHandler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'createPracticalRequest')?.value;
  const requestListHandler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'getRequests')?.value;
  const itemHandler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'createLaboratoryItem')?.value;
  const importHandler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'importLaboratoryItems')?.value;
  const registerHandler = Object.getOwnPropertyDescriptor(LabsController.prototype, 'generateRegister')?.value;
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, requestHandler), ['labs:request']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, requestListHandler), ['labs:request']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, itemHandler), ['labs:inventory']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, importHandler), ['labs:inventory']);
  assert.deepEqual(Reflect.getMetadata(PERMISSIONS_KEY, registerHandler), ['reports:read', 'labs:read']);
});

test('Teacher roles can request practicals without receiving laboratory stock permissions', () => {
  for (const roleCode of [
    'teacher', 'class_teacher', 'grade_master', 'hod', 'dean_academics',
    'exams_manager', 'principal', 'deputy_principal', 'discipline_master',
    'boarding_master', 'school_counsellor',
  ]) {
    const role = DEFAULT_ROLE_CATALOG.find((entry) => entry.code === roleCode);
    assert.ok(role, `${roleCode} role must exist`);
    const permissions = role.permissions as readonly string[];
    assert.ok(permissions.includes('labs:request'), `${roleCode} should submit practical requisitions`);
  }
  for (const roleCode of ['teacher', 'class_teacher', 'hod', 'grade_master', 'school_counsellor']) {
    const role = DEFAULT_ROLE_CATALOG.find((entry) => entry.code === roleCode);
    assert.ok(role);
    assert.equal((role.permissions as readonly string[]).includes('labs:inventory'), false, `${roleCode} must not manage laboratory stock`);
  }
  const technician = DEFAULT_ROLE_CATALOG.find((entry) => entry.code === 'lab_technician');
  assert.ok(technician?.permissions.includes('labs:inventory'));
});

test('LabsService records ordinary Kenyan school stock without procurement fields or individual apparatus codes', async () => {
  const created: Array<Record<string, unknown>> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      findLaboratoryItemBySubmission: async () => null,
      findPotentialLaboratoryDuplicates: async () => [],
      createLaboratoryInventoryItem: async (input: Record<string, unknown>) => {
        created.push(input);
        return {
          id: `item-${created.length}`,
          item_name: input.name,
          quantity_available: input.quantity_total,
          unit: input.unit,
        };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  for (const item of [
    { item_type: 'apparatus', item_name: 'Test tubes', quantity: 100, unit: 'Pieces', category: 'Glassware' },
    { item_type: 'apparatus', item_name: 'Beakers', quantity: 20, unit: 'Pieces', category: 'Glassware' },
    { item_type: 'chemical', item_name: 'Hydrochloric acid', quantity: 5, unit: 'Bottles', category: 'Acids' },
    { item_type: 'consumable', item_name: 'Gloves', quantity: 10, unit: 'Boxes', category: 'Protective consumables' },
  ] as const) {
    await service.createLaboratoryItem({
      ...item,
      storage_location: 'Chemistry Laboratory → Cupboard 2',
      minimum_stock_level: 5,
    });
  }

  assert.equal(created.length, 4);
  assert.equal(created[0]?.tracking_method, 'quantity');
  assert.equal(created[1]?.tracking_method, 'quantity');
  assert.equal(created[2]?.unit, 'Bottles');
  assert.equal(created[3]?.unit, 'Boxes');
  for (const input of created) {
    assert.equal('supplier' in input, false);
    assert.equal('batch_number' in input, false);
    assert.equal('unit_cost' in input, false);
    assert.equal('purchase_price' in input, false);
    assert.equal('invoice_number' in input, false);
  }
});

test('LabsService rejects impossible Kenyan school calendar dates before writing stock', async () => {
  let writes = 0;
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      findLaboratoryItemBySubmission: async () => null,
      findPotentialLaboratoryDuplicates: async () => [],
      createLaboratoryInventoryItem: async () => {
        writes += 1;
        return {};
      },
    } as never,
  );

  await assert.rejects(
    service.createLaboratoryItem({
      item_type: 'chemical',
      item_name: 'School test reagent',
      category: 'Reagents',
      quantity: 1,
      unit: 'Bottles',
      storage_location: 'Chemistry Laboratory',
      minimum_stock_level: 1,
      expiry_date: '31/02/2026',
    }),
    /Expiry date must be a valid date in DD\/MM\/YYYY or YYYY-MM-DD format/,
  );
  assert.equal(writes, 0);
});

test('LabsService imports a school stock list with duplicate and row-level failure results', async () => {
  const created: string[] = [];
  const bySubmission = new Map<string, Record<string, unknown>>();
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      findLaboratoryItemBySubmission: async (_tenant: string, submissionId: string) => bySubmission.get(submissionId) ?? null,
      findPotentialLaboratoryDuplicates: async (_tenant: string, normalizedName: string) => {
        if (normalizedName.includes('brokenrow')) throw new Error('Storage location is missing');
        if (normalizedName.includes('beaker')) {
          return [{ id: 'beaker-1', item_source: 'equipment', item_name: 'Beakers', unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 2' }];
        }
        return [];
      },
      createLaboratoryInventoryItem: async (input: Record<string, unknown>) => {
        created.push(String(input.name));
        const item = { id: 'item-1', item_name: input.name, quantity_available: input.quantity_total, unit: input.unit };
        bySubmission.set(String(input.submission_id), item);
        return item;
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.importLaboratoryItems({
    submission_id: 'term-three-stock-import',
    items: [
      { source_row: 2, item_type: 'apparatus', item_name: 'Test tubes', category: 'Glassware', quantity: 100, unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 1', minimum_stock_level: 20 },
      { source_row: 3, item_type: 'apparatus', item_name: 'Beakers', category: 'Glassware', quantity: 20, unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 2', minimum_stock_level: 5 },
      { source_row: 7, item_type: 'consumable', item_name: 'Broken row', category: 'Consumables', quantity: 10, unit: 'Boxes', storage_location: 'Preparation Room', minimum_stock_level: 2 },
    ],
  });

  assert.deepEqual(created, ['Test tubes']);
  assert.equal(result.imported_count, 1);
  assert.equal(result.duplicate_count, 1);
  assert.equal(result.failed_count, 1);
  assert.deepEqual(result.results.map((row) => [row.row, row.status]), [[2, 'imported'], [3, 'duplicate'], [7, 'failed']]);
  assert.match(result.message, /1 item was added, 1 possible duplicate needs review, and 1 row failed/i);

  const retry = await service.importLaboratoryItems({
    submission_id: 'term-three-stock-import',
    items: [
      { source_row: 2, item_type: 'apparatus', item_name: 'Test tubes', category: 'Glassware', quantity: 100, unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 1', minimum_stock_level: 20 },
      { source_row: 3, item_type: 'apparatus', item_name: 'Beakers', category: 'Glassware', quantity: 20, unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 2', minimum_stock_level: 5 },
      { source_row: 7, item_type: 'consumable', item_name: 'Broken row', category: 'Consumables', quantity: 10, unit: 'Boxes', storage_location: 'Preparation Room', minimum_stock_level: 2 },
    ],
  });
  assert.equal(retry.imported_count, 1);
  assert.equal(retry.duplicate_count, 1);
  assert.deepEqual(created, ['Test tubes']);
});

test('LabsService keeps import idempotency tied to the original CSV row after an invalid row is fixed', async () => {
  const created: string[] = [];
  const bySubmission = new Map<string, Record<string, unknown>>();
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      findLaboratoryItemBySubmission: async (_tenant: string, submissionId: string) => bySubmission.get(submissionId) ?? null,
      findPotentialLaboratoryDuplicates: async () => [],
      createLaboratoryInventoryItem: async (input: Record<string, unknown>) => {
        const name = String(input.name);
        created.push(name);
        const item = {
          id: `item-${created.length}`,
          item_name: name,
          quantity_available: input.quantity_total,
          unit: input.unit,
        };
        bySubmission.set(String(input.submission_id), item);
        return item;
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const beakers = { source_row: 3, item_type: 'apparatus' as const, item_name: 'Beakers', category: 'Glassware', quantity: 20, unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 2', minimum_stock_level: 5 };
  const gloves = { source_row: 5, item_type: 'consumable' as const, item_name: 'Gloves', category: 'Protective consumables', quantity: 10, unit: 'Boxes', storage_location: 'Preparation Room', minimum_stock_level: 2 };

  // CSV row 2 failed client-side validation, so only rows 3 and 5 reached the first request.
  await service.importLaboratoryItems({
    submission_id: 'fixed-row-import',
    items: [beakers, gloves],
  });

  // The technician fixes row 2 and retries the same file. Existing rows must retain
  // their original idempotency IDs even though their filtered array positions moved.
  await service.importLaboratoryItems({
    submission_id: 'fixed-row-import',
    items: [
      { source_row: 2, item_type: 'apparatus', item_name: 'Test tubes', category: 'Glassware', quantity: 100, unit: 'Pieces', storage_location: 'Chemistry Laboratory → Cupboard 1', minimum_stock_level: 20 },
      beakers,
      gloves,
    ],
  });

  assert.deepEqual(created, ['Beakers', 'Gloves', 'Test tubes']);
  assert.deepEqual([...bySubmission.keys()].sort(), [
    'fixed-row-import:row:2',
    'fixed-row-import:row:3',
    'fixed-row-import:row:5',
  ]);
});

test('LabsService repairs audit and event governance on an idempotent item replay without writing stock again', async () => {
  let inventoryWrites = 0;
  const audits: Array<Record<string, unknown>> = [];
  const eventKeys: string[] = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      findLaboratoryItemBySubmission: async () => ({
        id: 'test-tubes-1',
        item_name: 'Test tubes',
        quantity_available: 100,
        unit: 'Pieces',
        tracking_method: 'quantity',
      }),
      createLaboratoryInventoryItem: async () => {
        inventoryWrites += 1;
        return { id: 'unexpected-item' };
      },
      appendAuditLog: async (input: Record<string, unknown>) => {
        audits.push(input);
      },
    } as never,
    {
      publish: async (event: { event_key: string }) => {
        eventKeys.push(event.event_key);
        return event;
      },
    } as never,
  );

  const result = await service.createLaboratoryItem({
    item_type: 'apparatus',
    item_name: 'Test tubes',
    category: 'Glassware',
    quantity: 100,
    unit: 'Pieces',
    storage_location: 'Chemistry Laboratory → Cupboard 1',
    minimum_stock_level: 20,
    submission_id: 'persisted-before-governance-failure',
  });

  assert.equal(inventoryWrites, 0);
  assert.equal(result.item.idempotent_replay, true);
  assert.equal(audits.length, 1);
  assert.equal((audits[0]?.metadata as Record<string, unknown>)?.submission_id, 'persisted-before-governance-failure');
  assert.equal((audits[0]?.metadata as Record<string, unknown>)?.idempotent_replay, true);
  assert.deepEqual(eventKeys, [
    'laboratory.item.created:test-tubes-1:persisted-before-governance-failure',
  ]);
});

test('LabsService warns about likely duplicate apparatus before changing stock', async () => {
  let stockMutations = 0;
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      findLaboratoryItemBySubmission: async () => null,
      findPotentialLaboratoryDuplicates: async () => [{
        id: 'beaker-1',
        item_source: 'equipment',
        item_name: 'Beaker',
        storage_location: 'Chemistry Laboratory → Cupboard 2',
        unit: 'Pieces',
      }],
      addLaboratoryStock: async () => {
        stockMutations += 1;
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.createLaboratoryItem({
    item_type: 'apparatus',
    item_name: 'Glass Beakers',
    category: 'Glassware',
    quantity: 20,
    unit: 'Pieces',
    storage_location: 'Chemistry Laboratory → Cupboard 2',
    minimum_stock_level: 5,
    duplicate_action: 'check',
  });

  assert.equal(result.duplicate, true);
  assert.deepEqual(result.actions, ['add_stock', 'view_existing', 'create_separate', 'cancel']);
  assert.equal(stockMutations, 0);
});

test('LabsService binds a teacher practical requisition to the authenticated school user', async () => {
  let saved: Record<string, unknown> | undefined;
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: '00000000-0000-4000-8000-000000000010', role: 'teacher' }) } as never,
    {
      getSchoolUserDisplayName: async () => 'Mr Kamau',
      createPracticalRequest: async (input: Record<string, unknown>) => {
        saved = input;
        return { id: 'request-1', ...input };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.createPracticalRequest({
    subject: 'Biology',
    class_name: 'Form 2 North',
    practical_date: '11/08/2026',
    lesson_time: '10:20',
    practical_title: 'Observe onion cells',
    teacher_id: '00000000-0000-4000-8000-000000000099',
    teacher_name: 'Spoofed Teacher',
    learner_groups: 10,
    items: [{ item_name: 'Microscopes', requested_quantity: 5, unit: 'Pieces', is_returnable: true }],
  });

  assert.equal(saved?.teacher_id, '00000000-0000-4000-8000-000000000010');
  assert.equal(saved?.teacher_name, 'Mr Kamau');
  assert.equal(saved?.actor_role, 'TEACHER');
  assert.match(result.message, /Biology practical request for Form 2 North was submitted/i);
});

test('LabsService rejects a caller-supplied teacher outside the active school membership', async () => {
  let createCalls = 0;
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      getSchoolUserDisplayName: async (tenantId: string, teacherId: string) => {
        assert.equal(tenantId, 'tenant-a');
        assert.equal(teacherId, '00000000-0000-4000-8000-000000000099');
        return null;
      },
      createPracticalRequest: async () => {
        createCalls += 1;
        return { id: 'request-1' };
      },
    } as never,
  );

  await assert.rejects(
    () => service.createPracticalRequest({
      subject: 'Biology',
      class_name: 'Form 2 North',
      practical_date: '11/08/2026',
      lesson_time: '10:20',
      practical_title: 'Observe onion cells',
      teacher_id: '00000000-0000-4000-8000-000000000099',
      teacher_name: 'Teacher From Another School',
      items: [{ item_name: 'Microscopes', requested_quantity: 5, unit: 'Pieces' }],
    }),
    /not an active member of this school/i,
  );
  assert.equal(createCalls, 0);
});

test('LabsService only returns the authenticated teacher own practical requests', async () => {
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher' }) } as never,
    {
      getPracticalRequests: async () => [
        { id: 'request-1', teacher_id: 'teacher-1', subject: 'Biology' },
        { id: 'request-2', teacher_id: 'teacher-2', subject: 'Chemistry' },
      ],
    } as never,
  );

  const requests = await service.getRequests();

  assert.deepEqual(requests, [{ id: 'request-1', teacher_id: 'teacher-1', subject: 'Biology' }]);
});

test('LabsService limits teaching-duty request lists while assessment-management roles can review the school queue', async () => {
  const queue = [
    { id: 'request-1', teacher_id: 'hod-1', subject: 'Biology' },
    { id: 'request-2', teacher_id: 'teacher-2', subject: 'Chemistry' },
  ];
  const repository = { getPracticalRequests: async () => queue } as never;
  const hodService = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'hod-1', role: 'hod' }) } as never,
    repository,
  );
  const examsService = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-1', role: 'exams_manager' }) } as never,
    repository,
  );

  assert.deepEqual(await hodService.getRequests(), [queue[0]]);
  assert.deepEqual(await examsService.getRequests(), queue);
});

test('LabsService limits teacher issue visibility and blocks the technician home feed', async () => {
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher' }) } as never,
    {
      listPracticalIssues: async () => [
        { id: 'issue-1', teacher_id: 'teacher-1' },
        { id: 'issue-2', teacher_id: 'teacher-2' },
      ],
    } as never,
  );

  assert.deepEqual(await service.getIssues(), [{ id: 'issue-1', teacher_id: 'teacher-1' }]);
  await assert.rejects(() => service.getHome(), /not available to teachers/i);
});

test('LabsService blocks ordinary teachers from creating secure assessment preparation requests', async () => {
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'teacher-1', role: 'teacher' }) } as never,
    {} as never,
  );

  await assert.rejects(
    () => service.createPracticalRequest({
      subject: 'Chemistry',
      class_name: 'Form 4 West',
      practical_date: '12/08/2026',
      lesson_time: '09:00',
      practical_title: 'Confidential assessment preparation',
      teacher_name: 'Teacher One',
      is_assessment: true,
      authorized_roles: ['TEACHER'],
      items: [{ item_name: 'Test tubes', requested_quantity: 20, unit: 'Pieces' }],
    }),
    /limited to authorized laboratory and examination staff/i,
  );
});

test('LabsService notifies the linked teacher when practical availability is reviewed', async () => {
  const notifications: Array<Record<string, unknown>> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      reviewPracticalRequest: async () => ({
        id: 'request-1',
        teacher_id: 'teacher-1',
        subject: 'Chemistry',
        class_name: 'Form 3 East',
      }),
      appendAuditLog: async () => undefined,
    } as never,
    undefined,
    {
      createNotification: async (input: Record<string, unknown>) => {
        notifications.push(input);
      },
    } as never,
  );

  await service.reviewPracticalRequest('request-1', {
    status: 'partially_available',
    items: [],
  });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.recipient_user_id, 'teacher-1');
  assert.equal(notifications[0]?.source_module, 'laboratory');
  assert.match(String(notifications[0]?.body), /partially available/i);
});

test('LabsService does not notify an ordinary teacher about secure assessment preparation', async () => {
  const notifications: Array<Record<string, unknown>> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      reviewPracticalRequest: async () => ({
        id: 'assessment-1',
        teacher_id: 'teacher-1',
        subject: 'Chemistry',
        class_name: 'Candidate Group A',
        is_assessment: true,
      }),
      appendAuditLog: async () => undefined,
    } as never,
    undefined,
    {
      createNotification: async (input: Record<string, unknown>) => {
        notifications.push(input);
      },
    } as never,
  );

  await service.reviewPracticalRequest('assessment-1', {
    status: 'preparing',
    items: [],
  });

  assert.equal(notifications.length, 0);
});

test('LabsService permits a secure assessment notification to the same authorized staff actor', async () => {
  const notifications: Array<Record<string, unknown>> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-user', role: 'exams_manager' }) } as never,
    {
      reviewPracticalRequest: async () => ({
        id: 'assessment-1', teacher_id: 'exam-user', subject: 'Chemistry',
        class_name: 'Candidate Group A', is_assessment: true,
      }),
      appendAuditLog: async () => undefined,
    } as never,
    undefined,
    { createNotification: async (input: Record<string, unknown>) => notifications.push(input) } as never,
  );

  await service.reviewPracticalRequest('assessment-1', { status: 'preparing', items: [] });

  assert.equal(notifications.length, 1);
  assert.equal(notifications[0]?.recipient_user_id, 'exam-user');
});

test('LabsRepository prevents terminal practical requests from returning to preparation', async () => {
  let itemUpdates = 0;
  const transaction = {
    $executeRawUnsafe: async () => {
      itemUpdates += 1;
      return 1;
    },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FROM lab_practical_requests') && sql.includes('FOR UPDATE')) {
        return [{ id: 'request-1', status: 'completed' }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  await assert.rejects(
    () => repository.preparePracticalRequest({
      tenant_id: 'tenant-a',
      request_id: 'request-1',
      items: [{ request_item_id: 'line-1', item_name: 'Beakers', unit: 'Pieces', prepared_quantity: 10 }],
    }),
    /completed and cannot be prepared again/i,
  );
  assert.equal(itemUpdates, 0);
});

test('LabsRepository replays review and ready preparation submissions before terminal-state checks', async () => {
  let operation: 'review' | 'preparation' = 'review';
  let mutationWrites = 0;
  const transaction = {
    $executeRawUnsafe: async () => {
      mutationWrites += 1;
      return 1;
    },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FROM lab_practical_requests') && sql.includes('FOR UPDATE')) {
        return operation === 'review'
          ? [{
              id: 'request-1', status: 'rejected',
              last_review_submission_id: 'review-retry-1',
              last_preparation_submission_id: null,
            }]
          : [{
              id: 'request-1', status: 'ready',
              last_review_submission_id: null,
              last_preparation_submission_id: 'preparation-retry-1',
            }];
      }
      if (sql.includes('FROM lab_practical_requests r')) {
        return [{
          id: 'request-1', status: operation === 'review' ? 'rejected' : 'ready',
          subject: 'Chemistry', class_name: 'Form 3 East',
          practical_title: 'Rates of reaction', items: [],
        }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  const reviewReplay = await repository.reviewPracticalRequest({
    tenant_id: 'tenant-a', request_id: 'request-1', actor_role: 'LAB_TECHNICIAN',
    status: 'rejected', reason: 'Unavailable', items: [], submission_id: 'review-retry-1',
  });
  operation = 'preparation';
  const preparationReplay = await repository.preparePracticalRequest({
    tenant_id: 'tenant-a', request_id: 'request-1', actor_role: 'LAB_TECHNICIAN',
    mark_ready: true, items: [{
      item_name: 'Extra test tubes', unit: 'Pieces', prepared_quantity: 5,
    }], submission_id: 'preparation-retry-1',
  });

  assert.equal(reviewReplay.idempotent_replay, true);
  assert.equal(preparationReplay.idempotent_replay, true);
  assert.equal(mutationWrites, 0);
});

test('Scenario A: a partial morning practical can be prepared and marked ready without re-entering lesson details', async () => {
  let preparation: Record<string, unknown> | undefined;
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      preparePracticalRequest: async (input: Record<string, unknown>) => {
        preparation = input;
        return {
          id: 'request-1', subject: 'Chemistry', class_name: 'Form 3 East',
          practical_title: 'Acid and carbonate reaction', status: 'ready',
        };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.preparePracticalRequest('request-1', {
    mark_ready: true,
    preparation_note: 'Only 15 of 20 beakers are available; teacher informed.',
    items: [
      { request_item_id: 'line-1', item_name: 'Test tubes', unit: 'Pieces', prepared_quantity: 40 },
      { request_item_id: 'line-2', item_name: 'Beakers', unit: 'Pieces', prepared_quantity: 15 },
      { request_item_id: 'line-3', item_name: 'Hydrochloric acid', unit: 'Millilitres', prepared_quantity: 500 },
    ],
  });

  assert.equal(preparation?.request_id, 'request-1');
  assert.equal(preparation?.mark_ready, true);
  assert.deepEqual((preparation?.items as Array<Record<string, unknown>>).map((item) => item.prepared_quantity), [40, 15, 500]);
  assert.match(result.message, /Chemistry practical for Form 3 East is ready for issue/i);
});

test('LabsService re-runs governed side effects with stable keys after a preparation response is lost', async () => {
  let repositoryCalls = 0;
  let auditCalls = 0;
  const eventKeys: string[] = [];
  const notificationKeys: string[] = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      preparePracticalRequest: async (input: Record<string, unknown>) => {
        repositoryCalls += 1;
        assert.equal(input.submission_id, 'preparation-response-loss-1');
        return {
          id: 'request-1', subject: 'Chemistry', class_name: 'Form 3 East',
          practical_title: 'Rates of reaction', status: 'ready', teacher_id: 'teacher-1',
          idempotent_replay: repositoryCalls > 1,
        };
      },
      appendAuditLog: async () => {
        auditCalls += 1;
      },
    } as never,
    {
      publish: async (event: { event_key: string }) => {
        eventKeys.push(event.event_key);
      },
    } as never,
    {
      createNotification: async (input: { notification_key: string }) => {
        notificationKeys.push(input.notification_key);
      },
    } as never,
  );
  const dto = {
    mark_ready: true,
    submission_id: 'preparation-response-loss-1',
    items: [{ request_item_id: 'line-1', item_name: 'Test tubes', unit: 'Pieces', prepared_quantity: 20 }],
  };

  await service.preparePracticalRequest('request-1', dto);
  await service.preparePracticalRequest('request-1', dto);

  assert.equal(repositoryCalls, 2);
  assert.equal(auditCalls, 2);
  assert.equal(eventKeys.length, 2);
  assert.equal(eventKeys[0], eventKeys[1]);
  assert.equal(notificationKeys.length, 2);
  assert.equal(notificationKeys[0], notificationKeys[1]);
});

test('LabsService rejects return figures that exceed the issue and records breakage from a valid return', async () => {
  let received = 0;
  const issue = {
    id: 'issue-1',
    items: [{ id: 'line-1', item_name: 'Test tubes', quantity_issued: 40 }],
  };
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      getIssueForReturn: async () => issue,
      receivePracticalReturn: async () => {
        received += 1;
        return {
          ...issue,
          status: 'returned',
          items: [{ ...issue.items[0], returned_good: 37, broken: 3, missing: 0 }],
        };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );
  const line = {
    issue_line_id: 'line-1',
    returned_good: 37,
    used_or_consumed: 0,
    broken: 3,
    missing: 0,
    still_with_teacher: 0,
    sent_for_maintenance: 0,
    spilled_or_wasted: 0,
  };

  await assert.rejects(
    () => service.receivePracticalReturn('issue-1', { items: [{ ...line, missing: 1 }] }),
    /exceed the quantity issued/i,
  );
  const result = await service.receivePracticalReturn('issue-1', { items: [line] });
  assert.equal(received, 1);
  assert.match(result.message, /3 items were broken/i);
  assert.match(result.message, /37 were returned in good condition/i);
});

test('LabsRepository reuses one database transaction for stock and movement writes', async () => {
  let directQueries = 0;
  const transactionSql: string[] = [];
  const transaction = {
    $executeRawUnsafe: async () => 1,
    $queryRawUnsafe: async (sql: string) => {
      transactionSql.push(sql);
      if (sql.includes('INSERT INTO lab_equipment')) {
        return [{ id: 'item-1', name: 'Test tubes', quantity_available: '100', unit: 'Pieces' }];
      }
      if (sql.includes('INSERT INTO lab_stock_movements')) return [{ id: 'movement-1' }];
      return [];
    },
  };
  const repository = new LabsRepository({
    query: async () => {
      directQueries += 1;
      return { rows: [], rowCount: 0 };
    },
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  await repository.createLaboratoryInventoryItem({
    tenant_id: 'tenant-a',
    item_source: 'equipment',
    item_type: 'apparatus',
    name: 'Test tubes',
    quantity_total: 100,
    unit: 'Pieces',
    submission_id: 'submission-1',
  });

  assert.equal(directQueries, 1, 'only the idempotency lookup runs before the transaction');
  assert.equal(transactionSql.filter((sql) => sql.includes('INSERT INTO lab_equipment')).length, 1);
  assert.equal(transactionSql.filter((sql) => sql.includes('INSERT INTO lab_stock_movements')).length, 1);
});

test('Scenario C: issuing prepared items updates stock and writes one movement in the same transaction', async () => {
  let available = 8;
  let movementWrites = 0;
  const transaction = {
    $executeRawUnsafe: async (sql: string) => {
      if (sql.includes('UPDATE lab_practical_request_items')) return 1;
      if (sql.includes('UPDATE lab_practical_requests')) return 1;
      return 1;
    },
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      if (sql.includes('FROM lab_practical_requests') && sql.includes('FOR UPDATE')) {
        return [{ id: 'request-1', status: 'ready' }];
      }
      if (sql.includes('INSERT INTO lab_issue_records')) return [{ id: 'issue-1' }];
      if (sql.includes('FROM lab_practical_request_items') && sql.includes('FOR UPDATE')) {
        return [{
          id: 'request-line-1', item_id: 'item-1', item_source: 'equipment',
          item_name: 'Microscopes', unit: 'Pieces', prepared_quantity: '3', is_returnable: true,
        }];
      }
      if (sql.includes('UPDATE lab_equipment') && sql.includes('quantity_available = quantity_available -')) {
        const before = available;
        available -= Number(params[2]);
        return [{ quantity_before: String(before), quantity_after: String(available) }];
      }
      if (sql.includes('INSERT INTO lab_issue_lines')) return [{ id: 'issue-line-1' }];
      if (sql.includes('INSERT INTO lab_stock_movements')) {
        movementWrites += 1;
        return [{ id: 'movement-1' }];
      }
      if (sql.includes('FROM lab_issue_records issue')) {
        return [{
          id: 'issue-1', practical_request_id: 'request-1', received_by: 'Mr Kamau',
          status: 'issued', subject: 'Biology', class_name: 'Form 2 North',
          practical_title: 'Microscope work', teacher_id: 'teacher-1', teacher_name: 'Mr Kamau',
          items: [{ id: 'issue-line-1', item_name: 'Microscopes', quantity_issued: '3', is_returnable: true }],
        }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    query: async (sql: string) => {
      if (sql.includes('SELECT id::text FROM lab_issue_records')) return { rows: [], rowCount: 0 };
      throw new Error(`Unexpected direct query: ${sql}`);
    },
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  const issue = await repository.createPracticalIssue({
    tenant_id: 'tenant-a', request_id: 'request-1', received_by: 'Mr Kamau',
    submission_id: 'biology-issue-1', issued_by: 'user-1',
    items: [{ request_item_id: 'request-line-1', quantity_issued: 3, is_returnable: true }],
  });

  assert.equal(available, 5);
  assert.equal(movementWrites, 1);
  assert.equal(issue.status, 'issued');
});

test('LabsRepository locks practical status and blocks a second issue with a different submission', async () => {
  let issueWrites = 0;
  const transaction = {
    $executeRawUnsafe: async () => 1,
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FROM lab_practical_requests') && sql.includes('FOR UPDATE')) {
        return [{ id: 'request-1', status: 'issued' }];
      }
      if (sql.includes('SELECT id::text FROM lab_issue_records')) return [];
      if (sql.includes('INSERT INTO lab_issue_records')) {
        issueWrites += 1;
        return [{ id: 'issue-2' }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    query: async (sql: string) => {
      if (sql.includes('SELECT id::text FROM lab_issue_records')) return { rows: [], rowCount: 0 };
      throw new Error(`Unexpected direct query: ${sql}`);
    },
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  await assert.rejects(
    () => repository.createPracticalIssue({
      tenant_id: 'tenant-a',
      request_id: 'request-1',
      received_by: 'Mr Kamau',
      submission_id: 'different-issue-submission',
      issued_by: 'user-1',
      items: [{ request_item_id: 'line-1', quantity_issued: 3, is_returnable: true }],
    }),
    /issued and cannot be issued/i,
  );
  assert.equal(issueWrites, 0);
});

test('LabsService lets an issued practical replay the same issue submission after response loss', async () => {
  let issueCalls = 0;
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      getPracticalRequest: async () => ({
        id: 'request-1', status: 'issued', subject: 'Biology', class_name: 'Form 2 North',
        teacher_id: 'teacher-1', is_assessment: false,
      }),
      createPracticalIssue: async (input: Record<string, unknown>) => {
        issueCalls += 1;
        assert.equal(input.submission_id, 'issue-response-loss-1');
        return {
          id: 'issue-1', idempotent_replay: true,
          items: [{ quantity_issued: 3, is_returnable: true }],
        };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.confirmPracticalIssue('request-1', {
    received_by: 'Mr Kamau',
    submission_id: 'issue-response-loss-1',
    items: [{ request_item_id: 'line-1', quantity_issued: 3, is_returnable: true }],
  });

  assert.equal(issueCalls, 1);
  assert.equal(result.issue.idempotent_replay, true);
  assert.match(result.message, /3 returnable items are expected back/i);
});

test('LabsRepository hides secure assessment mutations from an unauthorized inventory role', async () => {
  let mutationWrites = 0;
  const transaction = {
    $executeRawUnsafe: async () => {
      mutationWrites += 1;
      return 1;
    },
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      if (sql.includes('FROM lab_practical_requests') && sql.includes('FOR UPDATE')) {
        assert.match(sql, /is_assessment = FALSE OR upper\(\$3\) = ANY\(authorized_roles\)/);
        assert.equal(params[2], 'STOREKEEPER');
        return [];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  await assert.rejects(
    () => repository.preparePracticalRequest({
      tenant_id: 'tenant-a',
      request_id: 'secure-assessment-1',
      actor_role: 'STOREKEEPER',
      items: [],
      mark_ready: true,
    }),
    /not found in this school/i,
  );
  assert.equal(mutationWrites, 0);
});

test('LabsRepository applies the assessment role allowlist to issue reads', async () => {
  const repository = new LabsRepository({
    query: async (sql: string, params: unknown[]) => {
      assert.match(sql, /request\.is_assessment = FALSE OR upper\(\$3\) = ANY\(request\.authorized_roles\)/);
      assert.deepEqual(params, ['tenant-a', 'issue-1', 'STOREKEEPER']);
      return { rows: [], rowCount: 0 };
    },
  } as never);

  assert.equal(await repository.getIssueForReturn('tenant-a', 'issue-1', 'STOREKEEPER'), null);
});

test('LabsRepository applies the assessment role allowlist to linked breakage and loss reads', async () => {
  const repository = new LabsRepository({
    query: async (sql: string, params: unknown[]) => {
      assert.match(sql, /incident\.practical_request_id IS NULL/);
      assert.match(sql, /request\.is_assessment = FALSE/);
      assert.match(sql, /upper\(\$2\) = ANY\(request\.authorized_roles\)/);
      assert.deepEqual(params, ['tenant-a', 'TEACHER']);
      return { rows: [], rowCount: 0 };
    },
  } as never);

  assert.deepEqual(await repository.listBreakageLoss('tenant-a', 'TEACHER'), []);
});

test('Scenario E: submitting a counted location adjusts stock and records the difference', async () => {
  let available = 75;
  let submitted = false;
  let movementWrites = 0;
  let lifecycleLocks = 0;
  const transaction = {
    $executeRawUnsafe: async (sql: string, ...params: unknown[]) => {
      if (sql.includes('UPDATE lab_equipment')) {
        available = Number(params[2]);
      }
      if (sql.includes('UPDATE lab_stocktakes')) submitted = true;
      return 1;
    },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FROM lab_stocktakes') && sql.includes('FOR UPDATE')) {
        lifecycleLocks += 1;
        return [{ id: 'stocktake-1', status: submitted ? 'submitted' : 'in_progress' }];
      }
      if (sql.includes('INSERT INTO lab_stock_movements')) {
        movementWrites += 1;
        return [{ id: 'movement-1' }];
      }
      if (sql.includes('UPDATE lab_stocktakes') && sql.includes('RETURNING')) {
        submitted = true;
        return [{ id: 'stocktake-1' }];
      }
      if (sql.includes('FROM lab_stocktakes stocktake')) {
        return [{
          id: 'stocktake-1', location_name: 'Chemistry Laboratory → Cupboard 1',
          status: submitted ? 'submitted' : 'in_progress',
          items: [{
            id: 'stocktake-line-1', item_id: 'item-1', item_source: 'equipment',
            item_name: 'Test tubes', unit: 'Pieces', expected_quantity: '75',
            counted_quantity: '72', condition: 'serviceable', difference: '-3',
          }],
        }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  const stocktake = await repository.submitStocktake({
    tenant_id: 'tenant-a', stocktake_id: 'stocktake-1', submitted_by: 'user-1',
    notes: 'End-of-term physical count',
  });

  assert.equal(available, 72);
  assert.equal(movementWrites, 1);
  assert.equal(lifecycleLocks, 1);
  assert.equal(stocktake.status, 'submitted');
});

test('LabsRepository does not reopen or re-adjust a submitted stocktake', async () => {
  let inventoryUpdates = 0;
  let movementWrites = 0;
  let lineUpdates = 0;
  const submittedStocktake = {
    id: 'stocktake-1', location_name: 'Chemistry Laboratory → Cupboard 1',
    status: 'submitted', items: [{
      id: 'line-1', item_id: 'item-1', item_source: 'equipment', item_name: 'Test tubes',
      unit: 'Pieces', expected_quantity: '75', counted_quantity: '72', difference: '-3',
    }],
  };
  const transaction = {
    $executeRawUnsafe: async (sql: string) => {
      if (sql.includes('UPDATE lab_equipment') || sql.includes('UPDATE chemical_items')) inventoryUpdates += 1;
      return 1;
    },
    $queryRawUnsafe: async (sql: string) => {
      if (sql.includes('FROM lab_stocktakes') && sql.includes('FOR UPDATE')) {
        return [{ id: 'stocktake-1', status: 'submitted' }];
      }
      if (sql.includes('FROM lab_stocktakes stocktake')) return [submittedStocktake];
      if (sql.includes('UPDATE lab_stocktake_lines')) {
        lineUpdates += 1;
        return [{ id: 'line-1' }];
      }
      if (sql.includes('INSERT INTO lab_stock_movements')) {
        movementWrites += 1;
        return [{ id: 'movement-2' }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);

  await assert.rejects(
    () => repository.saveStocktake({
      tenant_id: 'tenant-a', stocktake_id: 'stocktake-1',
      items: [{ line_id: 'line-1', counted_quantity: 70 }],
    }),
    /already been submitted and cannot be changed/i,
  );
  const replay = await repository.submitStocktake({
    tenant_id: 'tenant-a', stocktake_id: 'stocktake-1', submitted_by: 'user-1',
    items: [{ line_id: 'line-1', counted_quantity: 70 }],
  });

  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.status, 'submitted');
  assert.equal(lineUpdates, 0);
  assert.equal(inventoryUpdates, 0);
  assert.equal(movementWrites, 0);
});

test('LabsService sends counted lines through the atomic submit path so response-loss retries can replay', async () => {
  let saveCalls = 0;
  let submitInput: Record<string, unknown> = {};
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      saveStocktake: async () => {
        saveCalls += 1;
      },
      submitStocktake: async (input: Record<string, unknown>) => {
        submitInput = input;
        return {
          id: 'stocktake-1', location_name: 'Chemistry Laboratory → Cupboard 1',
          status: 'submitted', idempotent_replay: true,
          items: [{ id: 'line-1', difference: '-3' }],
        };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const result = await service.submitStocktake('stocktake-1', {
    items: [{ line_id: 'line-1', counted_quantity: 72, condition: 'Good' }],
    notes: 'End-of-term count',
  });

  assert.equal(saveCalls, 0);
  assert.deepEqual(submitInput.items, [{ line_id: 'line-1', counted_quantity: 72, condition: 'Good' }]);
  assert.equal(submitInput.stocktake_id, 'stocktake-1');
  assert.equal(result.stocktake.idempotent_replay, true);
});

test('LabsRepository makes a retried Add Stock submission idempotent', async () => {
  let quantity = 55;
  let movementExists = false;
  let movementWrites = 0;
  const query = async (sql: string) => {
    if (sql.includes('SELECT id::text FROM lab_stock_movements')) {
      return { rows: movementExists ? [{ id: 'movement-1' }] : [], rowCount: movementExists ? 1 : 0 };
    }
    if (sql.includes('SELECT id::text, name AS item_name')) {
      return { rows: [{ id: 'item-1', item_name: 'Test tubes', quantity_available: String(quantity), quantity_total: String(quantity), unit: 'Pieces' }], rowCount: 1 };
    }
    throw new Error(`Unexpected direct query: ${sql}`);
  };
  const transaction = {
    $executeRawUnsafe: async () => 1,
    $queryRawUnsafe: async (sql: string, ...params: unknown[]) => {
      if (sql.includes('UPDATE lab_equipment')) {
        const added = Number(params[2]);
        const before = quantity;
        quantity += added;
        return [{ id: 'item-1', item_name: 'Test tubes', unit: 'Pieces', quantity_before: String(before), quantity_available: String(quantity) }];
      }
      if (sql.includes('INSERT INTO lab_stock_movements')) {
        movementExists = true;
        movementWrites += 1;
        return [{ id: 'movement-1' }];
      }
      throw new Error(`Unexpected transaction query: ${sql}`);
    },
  };
  const repository = new LabsRepository({
    query,
    withRequestTransaction: async (callback: (tx: typeof transaction) => unknown) => callback(transaction),
  } as never);
  const input = {
    tenant_id: 'tenant-a', item_source: 'equipment', item_id: 'item-1',
    quantity_added: 30, submission_id: 'slow-network-retry-1', recorded_by: 'user-1',
  };

  const first = await repository.addLaboratoryStock(input);
  const retry = await repository.addLaboratoryStock(input);

  assert.equal(first.quantity_available, '85');
  assert.equal(retry.quantity_available, '85');
  assert.equal(retry.idempotent_replay, true);
  assert.equal(movementWrites, 1);
});

test('Scenario F: retried stock submissions reuse the same domain event key', async () => {
  const eventKeys: string[] = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1', role: 'lab_technician' }) } as never,
    {
      addLaboratoryStock: async () => ({ id: 'item-1', item_name: 'Test tubes', quantity_available: '85', unit: 'Pieces' }),
      appendAuditLog: async () => undefined,
    } as never,
    {
      publish: async (event: { event_key: string }) => {
        eventKeys.push(event.event_key);
      },
    } as never,
  );
  const dto = { quantity_added: 30, submission_id: 'slow-network-retry-1' };

  await service.addLaboratoryStock('equipment', 'item-1', dto);
  await service.addLaboratoryStock('equipment', 'item-1', dto);

  assert.equal(eventKeys.length, 2);
  assert.equal(eventKeys[0], eventKeys[1]);
});

test('LabsRepository keeps the printable laboratory heading separate from an explicit location filter', async () => {
  const repository = new LabsRepository({
    query: async (sql: string) => {
      if (sql.includes('FROM tenants')) {
        return { rows: [{ name: 'Lakeview Secondary School', logo_url: '/api/school/identity/logo' }], rowCount: 1 };
      }
      if (sql.includes('FROM users')) {
        return { rows: [{ generated_by: 'Jane Atieno' }], rowCount: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  } as never);
  repository.listLaboratoryInventory = async () => ({
    items: [
      {
        id: 'item-1', item_source: 'equipment', item_type: 'apparatus', item_name: 'Test tubes',
        storage_location: 'Chemistry Laboratory → Cupboard 2', status: 'Available',
      },
      {
        id: 'item-2', item_source: 'equipment', item_type: 'apparatus', item_name: 'Beakers',
        storage_location: 'Biology Laboratory → Cabinet A', status: 'Available',
      },
    ],
    locations: [],
  });

  const schoolWide = await repository.getRegisterData('tenant-a', 'stock_book', {
    laboratory: 'School Laboratory',
    generated_by: '00000000-0000-4000-8000-000000000001',
  });
  const cupboardOnly = await repository.getRegisterData('tenant-a', 'stock_book', {
    laboratory: 'School Laboratory',
    location_filter: 'Cupboard 2',
    generated_by: '00000000-0000-4000-8000-000000000001',
  });

  assert.equal(schoolWide.laboratory, 'School Laboratory');
  assert.equal(schoolWide.location_filter, null);
  assert.equal(schoolWide.school_logo, '/api/school/identity/logo');
  assert.equal(schoolWide.generated_by, 'Jane Atieno');
  assert.deepEqual(schoolWide.rows.map((row) => row.item_name), ['Test tubes', 'Beakers']);
  assert.equal(cupboardOnly.location_filter, 'Cupboard 2');
  assert.deepEqual(cupboardOnly.rows.map((row) => row.item_name), ['Test tubes']);
});

test('LabsService keeps secure assessment checklist registers scoped to the current actor role', async () => {
  let reportActorRole = '';
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'exam-user', role: 'exams_manager' }) } as never,
    {
      getRegisterData: async (_tenantId: string, _reportType: string, input: Record<string, unknown>) => {
        reportActorRole = String(input.actor_role ?? '');
        return {
          document_number: 'LAB-PRACTICAL-CHECKLIST-1',
          report_type: 'practical_preparation_checklist',
          rows: [],
        };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  await service.generateRegister({ report_type: 'practical_preparation_checklist' });

  assert.equal(reportActorRole, 'EXAMS_MANAGER');
});

test('LabsService emits a stable safety follow-up event for laboratory leadership without claiming delivery', async () => {
  const events: Array<{ event_key: string; payload: Record<string, unknown> }> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'lab-user', role: 'lab_technician' }) } as never,
    {
      saveSafetyCheck: async () => ({
        id: 'safety-check-1', status: 'follow_up_required', next_due_date: '2026-09-01',
      }),
      appendAuditLog: async () => undefined,
    } as never,
    {
      publish: async (event: { event_key: string; payload: Record<string, unknown> }) => {
        events.push(event);
      },
    } as never,
  );
  const dto = {
    location_name: 'Chemistry Laboratory',
    checked_on: '09/08/2026',
    next_due_date: '01/09/2026',
    checklist: [{ label: 'Fire extinguishers are accessible', checked: false }],
    submission_id: 'safety-submission-1',
  };

  const first = await service.saveSafetyCheck(dto);
  await service.saveSafetyCheck(dto);

  assert.match(first.message, /remain visible/i);
  assert.equal(events.length, 2);
  assert.equal(events[0]?.event_key, events[1]?.event_key);
  assert.match(events[0]?.event_key ?? '', /laboratory\.safety_check\.follow_up_required:safety-check-1:safety-submission-1/);
  assert.deepEqual(events[0]?.payload.target_roles, ['LAB_TECHNICIAN', 'PRINCIPAL', 'DEPUTY_PRINCIPAL']);
  assert.deepEqual(events[0]?.payload.notifications, []);
  assert.equal((events[0]?.payload.payload as Record<string, unknown>)?.follow_up_required, true);
});

test('Laboratory home flags a chemical approaching expiry even when its quantity is healthy', async () => {
  const repository = new LabsRepository({} as never);
  const expiresSoon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  repository.getPracticalRequests = async () => [];
  repository.listPracticalIssues = async () => [];
  repository.listBreakageLoss = async () => [];
  repository.listSafetyChecks = async () => [];
  repository.listLaboratoryInventory = async () => ({
    items: [{
      id: 'chemical-1', item_source: 'chemical', item_name: 'Hydrochloric acid',
      quantity_available: '5', unit: 'Bottles', storage_location: 'Chemical Store',
      expiry_date: expiresSoon, status: 'Available',
    }],
    locations: [],
  });

  const home = await repository.getLaboratoryHome('tenant-a', 'LAB_TECHNICIAN');

  assert.equal(home.attention.length, 1);
  assert.equal(home.attention[0]?.type, 'Expiring Chemical');
  assert.match(home.attention[0]?.detail, /Expires on/);
});

test('LabsService rejects expired chemical issue before repository mutation', async () => {
  const calls: string[] = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      findChemicalForIssue: async () => ({
        id: 'chemical-1',
        status: 'expired',
        expiry_date: '2026-05-18',
        quantity_available: '10',
      }),
      issueChemicalToSession: async () => {
        calls.push('issued');
      },
    } as never,
  );

  await assert.rejects(
    () =>
      service.issueChemical('session-1', {
        chemical_id: 'chemical-1',
        quantity_used: 1,
      }),
    /Expired chemicals cannot be issued/i,
  );
  assert.deepEqual(calls, []);
});

test('LabsService auto-records missing mandatory lab attendance before completing a session', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const service = new LabsService(
    { getStore: () => ({ tenant_id: 'tenant-a', user_id: 'user-1' }) } as never,
    {
      getLabSessionForCompletion: async () => ({
        id: 'session-1',
        is_mandatory: true,
      }),
      markMissingMandatoryAttendanceAbsent: async (input: Record<string, unknown>) => {
        calls.push({ method: 'markMissingMandatoryAttendanceAbsent', ...input });
        return [{ id: 'attendance-1', student_id: 'student-1', status: 'absent' }];
      },
      recordMandatoryLabAttendanceEffects: async (input: Record<string, unknown>) => {
        calls.push({ method: 'recordMandatoryLabAttendanceEffects', ...input });
        return { behavior_events: 1, participation_metrics: 1 };
      },
      completeLabSession: async (input: Record<string, unknown>) => {
        calls.push({ method: 'completeLabSession', ...input });
        return { id: 'session-1', status: 'completed' };
      },
      appendAuditLog: async () => undefined,
    } as never,
  );

  const completed = await service.completeLabSession('session-1');

  assert.deepEqual(completed, { id: 'session-1', status: 'completed' });
  assert.deepEqual(calls, [
    {
      method: 'markMissingMandatoryAttendanceAbsent',
      tenant_id: 'tenant-a',
      session_id: 'session-1',
      recorded_by: 'user-1',
    },
    {
      method: 'completeLabSession',
      tenant_id: 'tenant-a',
      session_id: 'session-1',
    },
    {
      method: 'recordMandatoryLabAttendanceEffects',
      tenant_id: 'tenant-a',
      session_id: 'session-1',
      actor_user_id: 'user-1',
    },
  ]);
});

test('LabsProcessor runs chemical expiry, equipment reconciliation, and lab discipline checks', async () => {
  const calls: Array<Record<string, unknown>> = [];
  const contexts: Array<Record<string, unknown>> = [];
  const processor = new LabsProcessor({
    refreshChemicalExpiryStatuses: async (input: Record<string, unknown>) => {
      calls.push({ method: 'refreshChemicalExpiryStatuses', ...input });
      return { expired: 3, near_expiry: 2 };
    },
    flagOverdueEquipmentUsage: async (input: Record<string, unknown>) => {
      calls.push({ method: 'flagOverdueEquipmentUsage', ...input });
      return { unreconciled: 4 };
    },
    flagMandatoryAttendanceDisciplineGaps: async (input: Record<string, unknown>) => {
      calls.push({ method: 'flagMandatoryAttendanceDisciplineGaps', ...input });
      return { auto_absent: 5, behavior_events: 3, participation_metrics: 8 };
    },
  } as never, undefined, {
    getStore: () => undefined,
    run: (context: Record<string, unknown>, callback: () => unknown) => {
      contexts.push(context);
      return callback();
    },
  } as never);

  const chemicalResult = await processor.runChemicalExpiryCheck({ nearExpiryDays: 21 });
  const reconciliationResult = await processor.runEquipmentReconciliationCheck({ overdueHours: 6 });
  const disciplineResult = await processor.runMandatoryAttendanceDisciplineCheck({ lookbackDays: 4 });

  assert.equal(processor.queueName, 'labs-maintenance');
  assert.deepEqual(chemicalResult, {
    expired: 3,
    near_expiry: 2,
    near_expiry_days: 21,
  });
  assert.deepEqual(reconciliationResult, {
    unreconciled: 4,
    overdue_hours: 6,
  });
  assert.deepEqual(disciplineResult, {
    auto_absent: 5,
    behavior_events: 3,
    participation_metrics: 8,
    lookback_days: 4,
  });
  assert.deepEqual(calls, [
    { method: 'refreshChemicalExpiryStatuses', near_expiry_days: 21 },
    { method: 'flagOverdueEquipmentUsage', overdue_hours: 6 },
    { method: 'flagMandatoryAttendanceDisciplineGaps', lookback_days: 4 },
  ]);
  assert.equal(contexts[0]?.role, 'system');
  assert.equal(contexts[0]?.path, '/internal/labs/maintenance');
});
