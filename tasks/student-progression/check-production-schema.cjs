// Apply the release migration twice to a schema-only production snapshot on disposable localhost PostgreSQL.
const {spawnSync}=require('node:child_process');
const {Client}=require('pg');
const {COHORT_SCHEMA_SQL}=require('../../apps/api/src/modules/academics/cohort-schema');
const {PROGRESSION_SCHEMA_SQL}=require('../../apps/api/src/modules/student-progression/progression-schema');
async function main(){
  const url=new URL(process.env.DATABASE_URL);
  if(process.env.MYSHULE_DISPOSABLE_POSTGRES!=='1'||!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.startsWith('/my_shule_disposable_'))
    throw new Error('A disposable local database is required.');
  const restored=spawnSync(process.env.PROGRESSION_PG_RESTORE||'pg_restore',
    ['--no-owner','--no-privileges','--exit-on-error','--dbname',url.toString(),'output/student-progression-production-schema.dump'],{encoding:'utf8'});
  if(restored.status!==0) throw new Error(restored.stderr||String(restored.error));
  const client=new Client({connectionString:url.toString()});await client.connect();
  try{
    for(let pass=1;pass<=2;pass++){
      await client.query('BEGIN');
      try{await client.query(COHORT_SCHEMA_SQL);await client.query(PROGRESSION_SCHEMA_SQL);await client.query('COMMIT');}
      catch(error){await client.query('ROLLBACK');throw error;}
      console.log('Production schema migration pass '+pass+': passed');
    }
    const result=await client.query("SELECT count(*)::int AS tenant_tables FROM pg_class WHERE relname=ANY($1::text[]) AND relrowsecurity AND relforcerowsecurity",
      [['academic_progression_activation','academic_progression_runs','academic_progression_decisions','academic_student_transitions','academic_progression_items','academic_progression_commands']]);
    if(result.rows[0].tenant_tables!==6)throw new Error('Every new table must enforce school RLS.');
    console.log('Six progression tables enforce row-level security; no production records were copied.');
  }finally{await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
