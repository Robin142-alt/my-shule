import { Client } from 'pg';
import { inferLegacyGradingCurriculum, normalizeCurriculum, validateGradingRules } from '../modules/academics/curriculum-grading';

/** Recover only missing keys from the same school's own policy history. Run without --apply to preview. */
export async function recoverCurriculumBands(db: Client, tenant: string, policyId: string, apply: boolean) {
  await db.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
  try {
    await db.query("SELECT set_config('app.tenant_id',$1,true)", [tenant]);
    const policy = (await db.query(`SELECT * FROM academics_grading_systems WHERE tenant_id=$1 AND id::text=$2
      ${apply ? 'FOR UPDATE' : ''}`, [tenant, policyId])).rows[0];
    if (!policy || policy.status !== 'draft' || !policy.is_active || policy.archived_at) throw new Error('Recovery requires an active, unarchived draft policy.');
    const history = (await db.query(`SELECT id,new_values FROM academic_audit_logs WHERE tenant_id=$1
      AND entity_type='grading_system' AND entity_id=$2 ORDER BY created_at DESC,id DESC`, [tenant,policyId])).rows;
    const saved = { ...policy.rules_by_curriculum };
    const recovered: Record<string, string> = {};
    for (const name of (policy.curriculum_models ?? []).map(normalizeCurriculum)) {
      if (Object.keys(saved).some(key => normalizeCurriculum(key) === name)) continue;
      const source = [{ id:'current legacy scale', new_values:policy }, ...history].find(({new_values}) =>
        new_values && (Array.isArray(new_values.rules_by_curriculum?.[name]) || inferLegacyGradingCurriculum(name,new_values.rules) === name));
      if (!source) throw new Error(`No verified historical ${name} scale for this policy. Save the school's bands in Academic Setup.`);
      const bands = source.new_values.rules_by_curriculum?.[name] ?? source.new_values.rules;
      validateGradingRules(bands);
      saved[name] = bands;
      recovered[name] = source.id;
    }
    if (apply && Object.keys(recovered).length) {
      const updated = (await db.query(`UPDATE academics_grading_systems SET rules_by_curriculum=$3::jsonb,
        version=version+1,updated_at=NOW() WHERE tenant_id=$1 AND id::text=$2 RETURNING *`,[tenant,policyId,JSON.stringify(saved)])).rows[0];
      await db.query(`INSERT INTO academic_audit_logs(school_id,tenant_id,entity_type,entity_id,action,previous_values,new_values,reason,metadata)
        VALUES($1,$1,'grading_system',$2,'academics.grading_system_recovered',$3,$4,'Restored missing curriculum bands from this policy history',$5)`,
      [tenant,policyId,JSON.stringify(policy),JSON.stringify(updated),JSON.stringify({sources:recovered})]);
    }
    await db.query(apply ? 'COMMIT' : 'ROLLBACK');
    return {tenant,policyId,applied:apply && !!Object.keys(recovered).length,recovered,
      bands:Object.fromEntries(Object.entries(saved).map(([name,bands])=>[name,Array.isArray(bands)?bands.length:null]))};
  } catch (error) { await db.query('ROLLBACK'); throw error; }
}

if (require.main === module) {
  const [tenant,policyId,mode] = process.argv.slice(2);
  if (!tenant || !policyId || (mode && mode !== '--apply')) throw new Error('Usage: recover-curriculum-bands <tenant> <policy-id> [--apply]');
  const client = new Client({connectionString:process.env.DATABASE_URL});
  client.connect().then(() => recoverCurriculumBands(client,tenant,policyId,mode==='--apply'))
    .then(result=>console.log(JSON.stringify(result))).catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>client.end());
}
