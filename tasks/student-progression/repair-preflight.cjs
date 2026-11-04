// Read-only tenant-scoped aggregates. Never prints student identities or credentials.
const {Client}=require('pg');
async function main(){
  const client=new Client({connectionString:process.env.PROGRESSION_DATABASE_URL,connectionTimeoutMillis:15000});
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout='20s'");
    await client.query("SELECT set_config('app.role','platform_owner',true)");
    const schools=(await client.query("SELECT tenant_id FROM tenants WHERE lower(status) IN ('active','trial','trialing','approved') ORDER BY tenant_id")).rows;
    for(const {tenant_id:tenant} of schools){
      if(process.env.PROGRESSION_TENANT&&process.env.PROGRESSION_TENANT!==tenant)continue;
      await client.query("SELECT set_config('app.tenant_id',$1,true),set_config('app.role','system',true)",[tenant]);
      const calendar=(await client.query(`SELECT year.name,year.status,year.starts_on::text,year.ends_on::text,
        (SELECT count(*)::int FROM class_sections c WHERE c.tenant_id=$1 AND c.academic_year_id::text=year.id::text AND c.is_active AND c.status='active') AS classes,
        (SELECT count(*)::int FROM class_streams s JOIN class_sections c ON c.tenant_id=s.tenant_id AND c.id::text=s.class_section_id::text WHERE c.tenant_id=$1 AND c.academic_year_id::text=year.id::text AND s.is_active AND s.status='active') AS streams,
        (SELECT count(*)::int FROM academics_class_teachers t WHERE t.tenant_id=$1 AND t.academic_year_id::text=year.id::text AND t.is_active) AS class_teachers,
        (SELECT count(*)::int FROM teacher_subject_assignments t JOIN class_sections c ON c.tenant_id=t.tenant_id AND c.id::text=t.class_section_id::text WHERE t.tenant_id=$1 AND c.academic_year_id::text=year.id::text AND t.status='active') AS subject_teachers,
        (SELECT count(*)::int FROM class_subject_assignments a JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text WHERE a.tenant_id=$1 AND c.academic_year_id::text=year.id::text AND a.status='active') AS subjects
        FROM academic_years year WHERE year.tenant_id=$1 AND year.archived_at IS NULL ORDER BY starts_on`,[tenant])).rows;
      const integrity=(await client.query(`SELECT count(*)::int AS paired_active_records,
        count(*) FILTER(WHERE e.class_section_id IS NULL)::int AS missing_enrollment_class,
        count(*) FILTER(WHERE e.academic_year_id IS NULL)::int AS missing_enrollment_year,
        count(*) FILTER(WHERE e.class_section_id::text IS DISTINCT FROM a.class_section_id::text OR e.stream_id::text IS DISTINCT FROM a.stream_id::text)::int AS placement_disagreements,
        count(*) FILTER(WHERE e.class_section_id IS NULL AND e.cohort_placement_id=a.cohort_placement_id AND lower(btrim(e.class_name))=lower(btrim(c.name)))::int AS corroborated_null_class
        FROM students s JOIN student_class_assignments a ON a.tenant_id=s.tenant_id AND a.student_id::text=s.id::text AND a.status='active'
        JOIN student_academic_enrollments e ON e.tenant_id=s.tenant_id AND e.student_id::text=s.id::text AND e.status='active'
        JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text
        WHERE s.tenant_id=$1 AND s.status IN ('active','enrolled')`,[tenant])).rows[0];
      console.log(JSON.stringify({tenant,calendar,integrity}));
      if(process.env.PROGRESSION_DETAILS==='1') console.log(JSON.stringify({tenant,placement_patterns:(await client.query(`SELECT
        e.class_name AS enrollment_class,c.name AS placement_class,e.stream_name AS enrollment_stream,st.name AS placement_stream,
        e.academic_year AS enrollment_year,y.name AS placement_year,
        e.cohort_placement_id IS NOT DISTINCT FROM a.cohort_placement_id AS cohort_matches,
        s.current_class_id::text IS NOT DISTINCT FROM a.class_section_id::text AS student_class_matches,
        s.current_stream_id::text IS NOT DISTINCT FROM a.stream_id::text AS student_stream_matches,
        e.cohort_placement_id IS NULL AS enrollment_cohort_missing,a.cohort_placement_id IS NULL AS placement_cohort_missing,
        count(*)::int AS learners
        FROM students s JOIN student_class_assignments a ON a.tenant_id=s.tenant_id AND a.student_id::text=s.id::text AND a.status='active'
        JOIN student_academic_enrollments e ON e.tenant_id=s.tenant_id AND e.student_id::text=s.id::text AND e.status='active'
        JOIN class_sections c ON c.tenant_id=a.tenant_id AND c.id::text=a.class_section_id::text
        JOIN academic_years y ON y.tenant_id=a.tenant_id AND y.id::text=a.academic_year_id::text
        LEFT JOIN class_streams st ON st.tenant_id=a.tenant_id AND st.id::text=a.stream_id::text
        WHERE s.tenant_id=$1 AND s.status IN ('active','enrolled') GROUP BY 1,2,3,4,5,6,7,8,9,10,11 ORDER BY 1,2,3`,[tenant])).rows}));
    }
    await client.query('ROLLBACK');
  }finally{await client.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
