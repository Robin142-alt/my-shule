const fs = require('fs');
const file = 'apps/api/src/modules/admin-command/repositories/admin-command.repository.ts';
let content = fs.readFileSync(file, 'utf8');

// Patch getStaffOverview
content = content.replace(
  /async getStaffOverview\(tenantId: string\) \{[\s\S]*?return \{[\s\S]*?status: "active",[\s\S]*?totalStaff: activeStaff,[\s\S]*?teachingStaff: activeStaff,[\s\S]*?supportStaff: 0,[\s\S]*?onLeave: 0,[\s\S]*?staffDistribution: \[\],[\s\S]*?recentOnboarding: \[\][\s\S]*?\};[\s\S]*?\}/m,
  `async getStaffOverview(tenantId: string) {
    const summaryResult = await this.executeSql(
      \`
        SELECT
          COUNT(*)::int AS total_staff,
          COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active_staff,
          COUNT(*) FILTER (WHERE role_id IN (SELECT id FROM user_roles WHERE name ILIKE '%teacher%'))::int AS teaching_staff,
          COUNT(*) FILTER (WHERE role_id IN (SELECT id FROM user_roles WHERE name ILIKE '%admin%' OR name ILIKE '%support%'))::int AS support_staff,
          COUNT(*) FILTER (WHERE status = 'ON_LEAVE')::int AS on_leave
        FROM school_memberships
        WHERE school_id = $1
      \`,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    const totalStaff = summaryResult.rows[0]?.total_staff || 0;
    const activeStaff = summaryResult.rows[0]?.active_staff || 0;
    const teachingStaff = summaryResult.rows[0]?.teaching_staff || 0;
    const supportStaff = summaryResult.rows[0]?.support_staff || 0;
    const onLeave = summaryResult.rows[0]?.on_leave || 0;

    const distributionResult = await this.executeSql(
      \`
        SELECT
          (SELECT name FROM user_roles WHERE id = m.role_id) AS label,
          COUNT(*)::int AS value
        FROM school_memberships m
        WHERE school_id = $1
        GROUP BY role_id
      \`,
      [tenantId],
    ).catch(() => ({ rows: [] }));

    return {
      status: "active",
      totalStaff: activeStaff > 0 ? activeStaff : totalStaff,
      teachingStaff,
      supportStaff,
      onLeave,
      staffDistribution: distributionResult.rows.map(r => ({ label: r.label || 'Staff', value: r.value })),
      recentOnboarding: []
    };
  }`
);

fs.writeFileSync(file, content);
console.log('Patched getStaffOverview');
