import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  collectPlanNodeTypes,
  QUERY_PLAN_REVIEWS,
  renderQueryPlanReviewMarkdown,
  resolveQueryPlanSslConfig,
  runQueryPlanReview,
  validateQueryPlanReviews,
} from './query-plan-review';
import {
  buildQueryPlanReviewLocalFixtureSql,
  QUERY_PLAN_REVIEW_LOCAL_FIXTURE_TABLES,
} from './query-plan-review-local-fixture';

test('query plan reviews cover active search hotspots and exclude retired attendance', () => {
  const reviewIds = QUERY_PLAN_REVIEWS.map((review) => review.id);

  assert.ok(reviewIds.includes('students-directory-search'));
  assert.ok(reviewIds.includes('admissions-application-search'));
  assert.ok(reviewIds.includes('inventory-item-search'));
  assert.ok(reviewIds.includes('academics-teacher-assignment-lookup'));
  assert.ok(reviewIds.includes('exam-marks-student-series'));
  assert.ok(reviewIds.includes('student-fee-allocation-history'));
  assert.ok(reviewIds.includes('support-status-subscription-queue'));
  assert.ok(reviewIds.includes('hr-staff-profile-directory'));
  assert.ok(reviewIds.includes('library-catalog-search'));
  assert.ok(reviewIds.includes('timetable-slot-lookup'));
  assert.ok(reviewIds.includes('support-ticket-search'));
  assert.equal(reviewIds.some((id) => id.includes('attendance')), false);
  assert.deepEqual(
    QUERY_PLAN_REVIEWS.find((review) => review.id === 'library-catalog-search')?.protectedTables,
    ['library_catalog_items'],
  );
  assert.deepEqual(validateQueryPlanReviews(QUERY_PLAN_REVIEWS), []);
});

test('query plan reviews avoid hard uuid casts for production schema compatibility', () => {
  for (const review of QUERY_PLAN_REVIEWS) {
    assert.doesNotMatch(
      review.sql,
      /::uuid\b/i,
      `${review.id} should let Postgres infer deployed ID column types`,
    );
  }
});

test('query plan validation rejects retired attendance reviews', () => {
  const errors = validateQueryPlanReviews([
    ...QUERY_PLAN_REVIEWS,
    {
      id: 'attendance-history-search',
      description: 'Retired attendance search path',
      sql: 'SELECT * FROM attendance_records WHERE tenant_id = $1',
      parameters: ['tenant-a'],
      protectedTables: ['attendance_records'],
    },
  ]);

  assert.deepEqual(errors, [
    'Query plan review attendance-history-search references retired attendance functionality.',
  ]);
});

test('collectPlanNodeTypes walks nested JSON plans', () => {
  const nodeTypes = collectPlanNodeTypes({
    'Node Type': 'Nested Loop',
    Plans: [
      { 'Node Type': 'Bitmap Index Scan' },
      {
        'Node Type': 'Hash Join',
        Plans: [{ 'Node Type': 'Index Scan' }],
      },
    ],
  });

  assert.deepEqual(nodeTypes, ['Nested Loop', 'Bitmap Index Scan', 'Hash Join', 'Index Scan']);
});

test('runQueryPlanReview flags sequential scans on protected tables', async () => {
  const result = await runQueryPlanReview({
    reviews: [
      {
        id: 'students-directory-search',
        description: 'Student directory search',
        sql: 'SELECT * FROM students WHERE tenant_id = $1',
        parameters: ['tenant-a'],
        protectedTables: ['students'],
      },
    ],
    query: async () => ({
      rows: [
        {
          'QUERY PLAN': [
            {
              Plan: {
                'Node Type': 'Seq Scan',
                'Relation Name': 'students',
              },
            },
          ],
        },
      ],
    }),
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.results[0]?.warnings, [
    'Sequential scan on protected table students.',
  ]);
});

test('runQueryPlanReview passes index-backed plans', async () => {
  const result = await runQueryPlanReview({
    reviews: [
      {
        id: 'support-ticket-search',
        description: 'Support ticket search',
        sql: 'SELECT * FROM support_tickets WHERE tenant_id = $1',
        parameters: ['tenant-a'],
        protectedTables: ['support_tickets'],
      },
    ],
    query: async (sql, values) => {
      assert.match(sql, /^EXPLAIN \(FORMAT JSON\)/);
      assert.deepEqual(values, ['tenant-a']);

      return {
        rows: [
          {
            'QUERY PLAN': [
              {
                Plan: {
                  'Node Type': 'Bitmap Heap Scan',
                  'Relation Name': 'support_tickets',
                  Plans: [
                    {
                      'Node Type': 'Bitmap Index Scan',
                      'Index Name': 'ix_support_tickets_search_vector',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };
    },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.results[0]?.nodeTypes, [
    'Bitmap Heap Scan',
    'Bitmap Index Scan',
  ]);
});

test('resolveQueryPlanSslConfig verifies database TLS by default', () => {
  assert.deepEqual(
    resolveQueryPlanSslConfig({ DATABASE_SSL: 'true' }, 'postgresql://db.example.test/app'),
    { rejectUnauthorized: true },
  );
  assert.deepEqual(
    resolveQueryPlanSslConfig({}, 'postgresql://db.example.test/app?sslmode=require'),
    { rejectUnauthorized: true },
  );
  assert.deepEqual(
    resolveQueryPlanSslConfig(
      { DATABASE_SSL: 'true', DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' },
      'postgresql://localhost/app',
    ),
    { rejectUnauthorized: false },
  );
  assert.equal(
    resolveQueryPlanSslConfig({}, 'postgresql://localhost/app'),
    undefined,
  );
});

test('renderQueryPlanReviewMarkdown records durable pass and warning evidence', () => {
  const markdown = renderQueryPlanReviewMarkdown({
    ok: false,
    results: [
      {
        id: 'students-directory-search',
        description: 'Student directory search should use the student full-text index.',
        nodeTypes: ['Limit', 'Index Scan'],
        warnings: [],
      },
      {
        id: 'library-catalog-search',
        description: 'Library catalog lookup remains tenant scoped.',
        nodeTypes: ['Seq Scan'],
        warnings: ['Sequential scan on protected table library_catalog_items.'],
      },
    ],
  }, '2026-05-21T00:00:00.000Z');

  assert.match(markdown, /# Query Plan Review/);
  assert.match(markdown, /Status: fail/);
  assert.match(markdown, /students-directory-search/);
  assert.match(markdown, /library_catalog_items/);
  assert.match(markdown, /Sequential scan on protected table library_catalog_items/);
});

test('local query-plan fixture creates every reviewed table and protected-table index', () => {
  const fixtureSql = buildQueryPlanReviewLocalFixtureSql();
  const fixtureTables = new Set(QUERY_PLAN_REVIEW_LOCAL_FIXTURE_TABLES.map((table) => table.name));

  for (const tableName of [
    'students',
    'admission_applications',
    'inventory_items',
    'teacher_subject_assignments',
    'exam_marks',
    'student_fee_payment_allocations',
    'support_status_subscriptions',
    'staff_profiles',
    'library_catalog_items',
    'timetable_slots',
    'support_tickets',
    'discipline_incidents',
    'counselling_sessions',
  ]) {
    assert.equal(fixtureTables.has(tableName), true, `${tableName} must be in the local fixture`);
    assert.match(
      fixtureSql,
      new RegExp(`CREATE TABLE IF NOT EXISTS ${tableName}\\b`),
      `${tableName} must be created`,
    );
  }

  for (const review of QUERY_PLAN_REVIEWS) {
    for (const protectedTable of review.protectedTables) {
      assert.match(
        fixtureSql,
        new RegExp(`CREATE INDEX IF NOT EXISTS [\\s\\S]+${protectedTable}`),
        `${protectedTable} must have an index in the local fixture`,
      );
    }
  }

  assert.doesNotMatch(fixtureSql, /attendance/i);
});
