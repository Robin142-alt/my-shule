import { randomUUID } from 'node:crypto';
import { Pool, PoolClient } from 'pg';
import { LibrarianCommandService } from '../src/modules/admin-command/librarian-command.service';
import { AdminCommandOperationsService } from '../src/modules/admin-command/admin-command-operations.service';
import { ReportSnapshotSchemaService } from '../src/common/reports/report-snapshot-schema.service';
import { libraryReportPeriod } from '../src/modules/admin-command/library-report-data';

describe('Library report persistence and school isolation', () => {
  let pool: Pool, transaction: PoolClient | undefined, service: LibrarianCommandService;
  let tenant = 'library-school-a';
  const actor = randomUUID(), book = randomUUID(), copy = randomUUID(), borrower = randomUUID(), student = randomUUID();
  const query = (sql: string, params: any[] = []) => (transaction ?? pool).query(sql, params);
  const prisma = { query, withRequestTransaction: async (callback: () => Promise<unknown>) => {
    const client = await pool.connect();
    transaction = client;
    try { await client.query('BEGIN'); const result = await callback(); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { transaction = undefined; client.release(); }
  } };

  beforeAll(async () => {
    const url = new URL(process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL!);
    if (!['localhost', '127.0.0.1'].includes(url.hostname) || !url.pathname.includes('disposable')) throw new Error('Use disposable local PostgreSQL');
    pool = new Pool({ connectionString: url.toString(), options: '-c search_path=library_report_test,public' });
    await query('CREATE SCHEMA library_report_test');
    await new ReportSnapshotSchemaService({ runSchemaBootstrap: query } as never).onModuleInit();
    await query(`
      CREATE TABLE tenants(tenant_id text PRIMARY KEY,name text);
      CREATE TABLE users(id uuid,tenant_id text,display_name text);
      CREATE TABLE audit_logs(id uuid DEFAULT gen_random_uuid(),tenant_id text,actor_user_id uuid,request_id text,action text,resource_type text,resource_id uuid,metadata jsonb);
      CREATE TABLE notifications(tenant_id text,notification_key text,recipient_role text,type text,title text,body text,status text,metadata jsonb,updated_at timestamptz, UNIQUE(tenant_id,notification_key));
      CREATE TABLE workflow_events(id uuid DEFAULT gen_random_uuid(),tenant_id text,source_user_id uuid,source_role text,target_roles jsonb,event_type text,entity_type text,entity_id text,title text,message text,priority text,payload jsonb);
      CREATE TABLE academic_terms(tenant_id text,starts_on date,ends_on date);
      CREATE TABLE library_catalog_items(id uuid,tenant_id text,title text,author text,isbn text,category text);
      CREATE TABLE library_copies(id uuid,tenant_id text,catalog_item_id uuid,status text,shelf_location text,accession_number text);
      CREATE TABLE library_borrowers(id uuid,tenant_id text,subject_id uuid,borrower_type text,scan_code text);
      CREATE TABLE students(id uuid,tenant_id text,first_name text,last_name text,admission_number text,current_class_id text);
      CREATE TABLE staff_profiles(id uuid,tenant_id text,display_name text,staff_number text);
      CREATE TABLE student_allocations(tenant_id text,student_id uuid,class_name text,is_current boolean);
      CREATE TABLE library_circulation_ledger(id uuid DEFAULT gen_random_uuid(),tenant_id text,copy_id uuid,borrower_id uuid,action text,metadata jsonb DEFAULT '{}',created_at timestamptz DEFAULT NOW());
      CREATE TABLE library_fines(id uuid DEFAULT gen_random_uuid(),tenant_id text,borrower_id uuid,copy_id uuid,reason text,amount_minor int,billing_reference text,created_at timestamptz DEFAULT NOW());
      INSERT INTO tenants VALUES ('library-school-a','Library School A'),('library-school-b','Library School B');
    `);
    for (const school of ['library-school-a', 'library-school-b']) {
      await query('INSERT INTO users VALUES ($1,$2,$3)', [actor, school, `${school} Librarian`]);
      await query("INSERT INTO library_catalog_items VALUES ($1,$2,$3,'Author','ISBN','Textbooks')", [book, school, school === 'library-school-a' ? 'Mathematics' : 'Private other-school title']);
      await query("INSERT INTO library_copies VALUES ($1,$2,$3,'available','Shelf 1','ACC001')", [copy, school, book]);
      await query("INSERT INTO library_borrowers VALUES ($1,$2,$3,'student','ADM001')", [borrower, school, student]);
      await query("INSERT INTO students VALUES ($1,$2,'Test','Learner','ADM001','Grade 7')", [student, school]);
      await query("INSERT INTO library_circulation_ledger(tenant_id,copy_id,borrower_id,action,metadata) VALUES ($1,$2,$3,'issue','{\"due_on\":\"2020-01-01\"}')", [school, copy, borrower]);
      await query("INSERT INTO library_circulation_ledger(tenant_id,copy_id,borrower_id,action,created_at) VALUES ($1,$2,$3,'return',NOW()+interval '1 second')", [school, copy, borrower]);
      await query("INSERT INTO library_circulation_ledger(tenant_id,copy_id,borrower_id,action,created_at) VALUES ($1,$2,$3,'issue','2000-01-01')", [school, copy, borrower]);
      await query("INSERT INTO library_fines(tenant_id,borrower_id,copy_id,reason,amount_minor) VALUES ($1,$2,$3,'overdue',5000)", [school, borrower, copy]);
      await query("INSERT INTO academic_terms VALUES($1,CURRENT_DATE-10,CURRENT_DATE+10)", [school]);
    }
    service = new LibrarianCommandService({ getStore: () => ({ tenant_id: tenant, user_id: actor, role: 'librarian' }) } as never,
      prisma as never, new AdminCommandOperationsService(prisma as never));
  });
  afterAll(async () => { await pool?.end(); });
  beforeEach(() => { tenant = 'library-school-a'; });

  it.each(['circulation', 'most_borrowed', 'borrower_activity', 'inventory', 'stock_status', 'overdue', 'fines'])(
    'generates, persists, lists and downloads %s from the selected school', async (type) => {
      const created = await service.generateReport({ report_type: type, period: 'today', format: 'pdf' });
      expect(Buffer.from(created.artifact.content_base64, 'base64').subarray(0, 4).toString()).toBe('%PDF');
      expect(JSON.stringify(created.report.sections)).not.toContain('Private other-school');
      if (type === 'most_borrowed') expect((created.report.sections[type] as any).records).toEqual([{ book_title: 'Mathematics', times_borrowed: 1 }]);
      if (type === 'circulation') expect((created.report.sections[type] as any).records).toHaveLength(2);
      const listed = await service.getReports();
      const saved = listed.reports.find((row) => row.report_type === type);
      expect(saved).toMatchObject({ status: 'Ready', generated_by: 'library-school-a Librarian', file_format: 'pdf' });
      expect((await service.downloadReport(saved.id)).report.artifact.content_base64).toBe(created.artifact.content_base64);
      expect((await query("SELECT * FROM workflow_events WHERE tenant_id=$1 AND entity_id=$2 AND event_type='library.report.generated'", [tenant, created.snapshotId])).rows).toHaveLength(1);
      expect((await query('SELECT * FROM notifications WHERE tenant_id=$1 AND metadata->>\'snapshotId\'=$2', [tenant, created.snapshotId])).rows).toHaveLength(2);
      expect((await query('SELECT * FROM report_snapshot_audit_logs WHERE tenant_id=$1 AND snapshot_id=$2', [tenant, created.snapshotId])).rows).toHaveLength(1);
      tenant = 'library-school-b';
      expect((await service.getReports()).reports).toHaveLength(0);
      await expect(service.downloadReport(saved.id)).rejects.toThrow('not found in this school');
    },
  );

  it.each(['csv', 'xlsx'])('produces real %s bytes and preserves old generic reports', async (format) => {
    const report = await service.generateReport({ report_type: 'inventory', format });
    const bytes = Buffer.from(report.artifact.content_base64, 'base64');
    expect(bytes.length).toBeGreaterThan(20);
    if (format === 'xlsx') expect(bytes.subarray(0, 2).toString()).toBe('PK');
    else expect(bytes.toString()).toContain('Mathematics');
    const operations = new AdminCommandOperationsService(prisma as never);
    const legacy = await operations.generateReportSnapshot({ tenantId: tenant, module: 'librarian-command',
      reportId: 'library-operations', title: 'Previously generated report', generatedByUserId: actor, sections: { books: [] } });
    expect((await service.getReports()).reports).toEqual(expect.arrayContaining([expect.objectContaining({ report_name: 'Previously generated report', period: 'Not recorded' })]));
    expect((await service.downloadReport(legacy.snapshotId)).report.artifact.content_base64).toBe(legacy.artifact.content_base64);
  });

  it('uses configured term dates and rejects missing configuration', async () => {
    expect((await libraryReportPeriod(query, tenant, 'this_term')).start_date).toBeTruthy();
    await query('DELETE FROM academic_terms WHERE tenant_id=$1', [tenant]);
    await expect(service.generateReport({ report_type: 'circulation', period: 'this_term' })).rejects.toThrow('Configure term dates');
  });

  it('rolls back report, notifications and audits if its workflow event cannot be recorded', async () => {
    const before = (await service.getReports()).metrics.total_reports;
    await query("ALTER TABLE workflow_events ADD CONSTRAINT reject_test_event CHECK (event_type <> 'library.report.generated') NOT VALID");
    await expect(service.generateReport({ report_type: 'inventory' })).rejects.toThrow();
    expect((await service.getReports()).metrics.total_reports).toBe(before);
    await query('ALTER TABLE workflow_events DROP CONSTRAINT reject_test_event');
  });
});
