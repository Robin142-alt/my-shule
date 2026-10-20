// Read-only production migration audit. Credentials are accepted only on stdin
// from the deployment CLI; never logged or written to disk.
import pg from 'pg';
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const env=JSON.parse(raw);
const connectionString=env.DATABASE_PUBLIC_URL??env.DATABASE_URL;
if(!connectionString)throw new Error('PostgreSQL connection is unavailable.');
const client=new pg.Client({connectionString,connectionTimeoutMillis:15000});
try{
  await client.connect();await client.query('BEGIN READ ONLY');
  const result=await client.query(`
    SELECT
      (SELECT count(*)::int FROM library_catalog_items) AS titles,
      (SELECT count(*)::int FROM library_copies) AS copies,
      (SELECT count(*)::int FROM library_copies WHERE barcode IS NOT NULL) AS labelled_copies,
      (SELECT count(*)::int FROM (SELECT barcode FROM library_copies WHERE barcode IS NOT NULL GROUP BY barcode HAVING count(*)>1) d) AS global_barcode_collisions,
      (SELECT count(*)::int FROM library_circulation_ledger WHERE action='issue') AS historical_issues,
      (SELECT count(*)::int FROM (
        SELECT i.tenant_id,i.copy_id FROM library_circulation_ledger i
        WHERE i.action='issue' AND NOT EXISTS(SELECT 1 FROM library_circulation_ledger r
          WHERE r.tenant_id=i.tenant_id AND r.copy_id=i.copy_id AND r.borrower_id=i.borrower_id AND r.action='return' AND r.created_at>=i.created_at)
        GROUP BY i.tenant_id,i.copy_id HAVING count(*)>1
      ) d) AS duplicate_active_loans
  `);
  const columns=await client.query(`SELECT table_name,column_name,data_type,is_nullable,column_default
    FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[])
    ORDER BY table_name,ordinal_position`,[['library_catalog_items','library_copies','library_borrowers','library_circulation_ledger','library_fines','staff_profiles','students','student_allocations']]);
  const counts=result.rows[0];
  const legacy={};
  for(const table of ['library_books','library_book_copies','library_loans']){
    if((await client.query('SELECT to_regclass($1) AS table_name',[table])).rows[0].table_name){
      legacy[table]=(await client.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count;
    }
  }
  console.log(JSON.stringify({checked_at:new Date().toISOString(),read_only:true,counts,legacy,columns:columns.rows},null,2));
  await client.query('ROLLBACK');
  if(counts.global_barcode_collisions||counts.duplicate_active_loans)process.exitCode=2;
}finally{await client.end();}
