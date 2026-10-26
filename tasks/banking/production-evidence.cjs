// Read-only production inspection. Credentials stay in memory and child environment.
const {spawnSync}=require('node:child_process');
const {mkdirSync,writeFileSync,readFileSync}=require('node:fs');
const {Client}=require('pg');
function variables(service){
  const result=spawnSync('powershell.exe',['-NoProfile','-Command',`railway variables --service ${service} --environment production --json`],{encoding:'utf8',windowsHide:true});
  if(result.status!==0)throw new Error(`Cannot read ${service} environment`);
  return JSON.parse(result.stdout);
}
async function main(){
  const api=variables('my-shule-api'),postgres=variables('Postgres');
  const url=new URL(api.DATABASE_URL),publicEndpoint=new URL(postgres.DATABASE_PUBLIC_URL);
  // Only replace network coordinates: the public service URL selects a different DB.
  url.hostname=publicEndpoint.hostname;url.port=publicEndpoint.port;
  const client=new Client({connectionString:url.toString(),connectionTimeoutMillis:15000});
  await client.connect();mkdirSync('output/banking-release',{recursive:true});
  try{
    await client.query('BEGIN READ ONLY');await client.query("SET LOCAL statement_timeout='30s'");
    const identity=(await client.query('SELECT current_database() AS database,current_user AS user')).rows[0];
    if(identity.database!==decodeURIComponent(url.pathname.slice(1)))throw new Error('Wrong database selected');
    const tenants=(await client.query('SELECT tenant_id FROM tenants ORDER BY tenant_id')).rows;
    const report={captured_at:new Date().toISOString(),database:identity.database,schools:[],schema:[]};
    for(const {tenant_id:tenant} of tenants){
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[tenant]);
      const student=(await client.query('SELECT count(*)::text AS students FROM students WHERE tenant_id=$1',[tenant])).rows[0];
      const invoice=(await client.query('SELECT count(*)::text AS invoices,COALESCE(sum(total_amount_minor::numeric),0)::text AS invoiced,COALESCE(sum(amount_paid_minor::numeric),0)::text AS paid FROM invoices WHERE tenant_id=$1',[tenant])).rows[0];
      const receipts=(await client.query('SELECT count(*)::text AS receipts,COALESCE(sum(amount_minor::numeric),0)::text AS received FROM manual_fee_payments WHERE tenant_id=$1',[tenant])).rows[0];
      const journals=(await client.query('SELECT count(*)::text AS journals,COALESCE(sum(total_amount_minor::numeric),0)::text AS journal_total FROM transactions WHERE tenant_id=$1',[tenant])).rows[0];
      const imbalanced=(await client.query(`SELECT count(*)::int AS count FROM (SELECT transaction_id FROM ledger_entries WHERE tenant_id=$1
        GROUP BY transaction_id HAVING sum(CASE WHEN direction='debit' THEN amount_minor::numeric ELSE -amount_minor::numeric END)<>0) q`,[tenant])).rows[0].count;
      const history={};
      for(const table of ['student_fee_payment_allocations','student_fee_credits','manual_fee_payment_allocations','payment_intents',
        'mpesa_transactions','mpesa_c2b_payments','mpesa_payload_vault','finance_approval_requests','mpesa_reconciliation_discrepancies'])
        history[table]=(await client.query(`SELECT count(*)::text AS count FROM ${table} WHERE tenant_id=$1`,[tenant])).rows[0].count;
      report.schools.push({tenant,...student,...invoice,...receipts,...journals,imbalanced_journals:imbalanced,history_counts:history});
    }
    report.schema=(await client.query(`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname=ANY($1::text[]) ORDER BY relname`,
      [['fee_payment_corrections','fee_credit_refunds','fee_credit_applications','fee_credit_application_reversals','receipt_refund_evidence','legacy_fee_invoice_adoptions','bank_synchronization_cursors','payment_ingress_events']])).rows;
    await client.query('ROLLBACK');
    const phase=process.argv.includes('--after')?'after':'before';writeFileSync(`output/banking-release/${phase}.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify(report));
    if(phase==='after'){
      const baseline=JSON.parse(readFileSync('output/banking-release/before.json','utf8'));
      if(JSON.stringify(report.schools)!==JSON.stringify(baseline.schools))throw new Error('Production records changed since baseline; review the saved before/after evidence');
      for(const name of ['fee_payment_corrections','fee_credit_refunds','fee_credit_applications','fee_credit_application_reversals','receipt_refund_evidence']){
        const table=report.schema.find(row=>row.relname===name);
        if(!table?.relrowsecurity||!table.relforcerowsecurity)throw new Error(`Missing forced RLS for ${name}`);
      }
      console.log('Production migration verified: baseline records and financial totals preserved, new history tables enforce tenant RLS.');
    }
    if(process.argv.includes('--snapshot')){
      const result=spawnSync('C:/Program Files/PostgreSQL/18/bin/pg_dump.exe',['--schema-only','--format=custom','--no-owner','--no-privileges','--file=output/banking-release/production-schema.dump'],{
        encoding:'utf8',windowsHide:true,env:{...process.env,PGHOST:url.hostname,PGPORT:url.port,PGDATABASE:decodeURIComponent(url.pathname.slice(1)),
          PGUSER:decodeURIComponent(url.username),PGPASSWORD:decodeURIComponent(url.password),PGCONNECT_TIMEOUT:'15'}});
      if(result.status!==0)throw new Error('Schema-only snapshot failed; inspect database connectivity');
      console.log('Schema-only production snapshot saved; no row data copied.');
    }
  }finally{await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
