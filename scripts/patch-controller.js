const fs = require('fs');
const file = 'apps/api/src/modules/admin-command/admin-command.controller.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /async logAbsence\(@Body\(\) dto: \{ studentId: string; date: string; reason: string; isExcused: boolean \}\) \{\s*return \{ success: true, message: 'Absence logged' \};\s*\}/m,
  `async logAbsence(@Body() dto: { studentId: string; date: string; reason: string; isExcused: boolean }) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    
    // Find student's class
    const studentRes = await this.prisma.query(
      \`SELECT current_class_id FROM students WHERE id = $1 AND school_id = $2\`,
      [dto.studentId, tenantId]
    );
    const classId = studentRes.rows[0]?.current_class_id || '00000000-0000-0000-0000-000000000000';

    await this.prisma.query(
      \`INSERT INTO academics_attendance (attendance_date, class_id, status, student_id, submitted_by, tenant_id, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())\`,
      [dto.date, classId, dto.isExcused ? 'absent_excused' : 'absent', dto.studentId, store.user_id || 'system', tenantId]
    );

    return { success: true, message: 'Absence logged' };
  }`
);

content = content.replace(
  /async reportIncident\(@Body\(\) dto: \{ studentId: string; category: string; severity: any; description: string \}\) \{\s*return \{ success: true, message: 'Incident reported' \};\s*\}/m,
  `async reportIncident(@Body() dto: { studentId: string; category: string; severity: any; description: string }) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;

    await this.prisma.query(
      \`INSERT INTO admin_incidents (created_by, description, involved_parties, severity, tenant_id, title, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())\`,
      [store.user_id || 'system', dto.description, dto.studentId, dto.severity, tenantId, dto.category]
    );

    return { success: true, message: 'Incident reported' };
  }`
);

fs.writeFileSync(file, content);
console.log('Patched controller methods');
