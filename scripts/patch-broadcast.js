const fs = require('fs');
const file = 'apps/api/src/modules/admin-command/admin-command.controller.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /async createCommunicationBroadcast\(@Body\(\) dto: \{ audience: string; message: string; channels: string\[\] \}\) \{\s*return \{ success: true, message: 'Broadcast created' \};\s*\}/m,
  `async createCommunicationBroadcast(@Body() dto: { audience: string; message: string; channels: string[] }) {
    const store = this.requestContext.requireStore();
    const tenantId = store.tenant_id;

    await this.prisma.query(
      \`INSERT INTO communication_sms_outbox (message, recipient_phone, sent_by, status, tenant_id, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW())\`,
      [dto.message, dto.audience, store.user_id || 'system', 'Pending', tenantId]
    );

    return { success: true, message: 'Broadcast created' };
  }`
);

fs.writeFileSync(file, content);
console.log('Patched broadcast controller');
