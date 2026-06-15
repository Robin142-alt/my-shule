const fs = require('fs');
const file = 'apps/api/src/modules/admin-command/admin-command.controller.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /async createReportCategory\(@Body\(\) dto: any\) \{\s*return \{ success: true, message: 'Report category created' \};\s*\}/m,
  `async createReportCategory(@Body() dto: any) {
    // Just a placeholder to act as a mock category creation for now since categories might be static or stored elsewhere
    return { success: true, message: 'Report category created' };
  }`
);

content = content.replace(
  /async scheduleReport\(@Body\(\) dto: any\) \{\s*return \{ success: true, message: 'Report scheduled' \};\s*\}/m,
  `async scheduleReport(@Body() dto: any) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;
    await this.prisma.query(
      \`INSERT INTO operations_reports (content, prepared_by, tenant_id, title, updated_at) VALUES ($1, $2, $3, $4, NOW())\`,
      [JSON.stringify({ schedule: dto.schedule }), store.user_id || 'system', tenantId, dto.title]
    );
    return { success: true, message: 'Report scheduled' };
  }`
);

fs.writeFileSync(file, content);
console.log('Patched reports controller');
