// Read-only release evidence. No student names, contacts or credentials are printed.
const { Client } = require('pg');
async function main() {
  const connectionString=process.env.PROGRESSION_DATABASE_URL||process.env.DATABASE_PUBLIC_URL||process.env.DATABASE_URL;
  if(!connectionString) throw new Error('Provide the existing database environment to this read-only command.');
  const client=new Client({connectionString,connectionTimeoutMillis:15000});
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout='20s'");
    await client.query("SELECT set_config('app.role','system',true)");
    const queries={
      version:"SELECT version(),current_user,current_database()",
      columns:"SELECT table_name,column_name,data_type,udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=ANY($1::text[]) ORDER BY table_name,ordinal_position",
      policies:"SELECT tablename,policyname,qual,with_check FROM pg_policies WHERE schemaname='public' AND tablename IN ('schools','school_settings','student_academic_enrollments','students','tenant_memberships') ORDER BY tablename,policyname",
      views:"SELECT viewname,definition FROM pg_views WHERE schemaname='public' AND viewname IN ('schools','school_settings','dashboard_approval_requests')",
      calendars:`SELECT year.tenant_id,year.name,year.starts_on::text,year.ends_on::text,year.status,year.is_current,
        (SELECT count(*)::int FROM academic_terms term WHERE term.tenant_id=year.tenant_id AND term.academic_year_id=year.id) AS terms,
        (SELECT count(*)::int FROM student_class_assignments placement JOIN students student ON student.tenant_id=placement.tenant_id AND student.id::text=placement.student_id::text
          WHERE placement.tenant_id=year.tenant_id AND placement.academic_year_id=year.id AND placement.status='active' AND student.status='active') AS active_learners
        FROM academic_years year WHERE year.tenant_id=current_setting('app.tenant_id',true) AND archived_at IS NULL ORDER BY year.tenant_id,year.starts_on`,
      schools:"SELECT tenant_id AS slug,status,settings->>'institution_category' AS institution_type,settings->>'timezone' AS timezone FROM tenants ORDER BY tenant_id",
      readiness:`SELECT student.tenant_id,count(*)::int AS learners,
        count(*) FILTER(WHERE lower(student.status) IN ('active','enrolled') AND lower(student.student_status::text) NOT IN ('active','enrolled'))::int AS conflicting_statuses,
        count(*) FILTER(WHERE student.status='active' AND NOT EXISTS(SELECT 1 FROM student_academic_enrollments enrollment WHERE enrollment.tenant_id=student.tenant_id AND enrollment.student_id::text=student.id::text AND enrollment.status='active'))::int AS missing_current_enrollment
        FROM students student WHERE student.tenant_id=current_setting('app.tenant_id',true) GROUP BY tenant_id ORDER BY tenant_id`,
      tables:"SELECT to_regclass('public.academic_student_transitions')::text AS transitions,to_regclass('public.academic_progression_runs')::text AS runs",
      constraints:"SELECT rel.relname AS table_name,con.conname,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class rel ON rel.oid=con.conrelid WHERE rel.relname=ANY($1::text[]) AND con.contype IN ('c','u') ORDER BY rel.relname,con.conname",
      indexes:"SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) AND indexdef LIKE 'CREATE UNIQUE%' ORDER BY tablename,indexname",
    };
    const tableNames=['student_allocations','student_academic_enrollments','student_subject_enrollments','student_timetable_enrollments','academic_timetable_slots','academics_class_teachers','approval_rules','dashboard_approval_requests','academic_audit_logs','notifications'];
    for(const [name,sql] of Object.entries(queries).filter(([name])=>!['calendars','readiness'].includes(name))) console.log(JSON.stringify({check:name,rows:(await client.query(sql,['columns','constraints','indexes'].includes(name)?[tableNames]:[])).rows}));
    const schools=(await client.query(queries.schools)).rows;
    for(const school of schools) {
      await client.query("SELECT set_config('app.tenant_id',$1,true)",[school.slug]);
      for(const name of ['calendars','readiness']) console.log(JSON.stringify({check:name,rows:(await client.query(queries[name])).rows}));
      if(process.env.PROGRESSION_VERIFY_OVERVIEW==='1') {
        const {progressionOverview}=require('../../apps/api/src/modules/student-progression/progression-queries');
        const runtimeRole=process.env.PROGRESSION_RUNTIME_ROLE||'my_shule_runtime';
        await client.query('SET LOCAL ROLE "'+runtimeRole.replaceAll('"','""')+'"');
        await client.query("SELECT set_config('app.role','system',true)");
        const tx={$queryRawUnsafe:async(sql,...values)=>(await client.query(sql,values)).rows};
        const overview=await progressionOverview(tx,{tenantId:school.slug,userId:null,role:'system',permissions:[],system:true},{limit:25});
        console.log(JSON.stringify({check:'live_progression_read',tenant:school.slug,total:overview.total,counts:overview.counts,
          status:overview.automation.status,message:overview.automation.message,years:overview.years.length}));
        await client.query('RESET ROLE');
      }
    }
    await client.query('ROLLBACK');
  } finally {await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
