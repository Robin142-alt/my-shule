const fs = require('fs');
const filePath = 'apps/api/src/modules/platform/platform-onboarding.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `    if (!schoolName || !adminName) {
      throw new BadRequestException('School name and administrator name are required.');
    }

    const transactionResult = await this.databaseService.withRequestTransaction(async () => {`;

const replacementStr = `    if (!schoolName || !adminName) {
      throw new BadRequestException('School name and administrator name are required.');
    }

    const emailConflict = await this.databaseService.query(
      \`
        SELECT tm.tenant_id 
        FROM tenant_memberships tm
        INNER JOIN users u ON u.id = tm.user_id
        WHERE lower(u.email) = $1
        LIMIT 1
      \`,
      [adminEmail]
    );

    if (emailConflict.rows.length > 0) {
      throw new BadRequestException('This email is already registered under another school. Use a different email address for this school.');
    }

    const invitationConflict = await this.databaseService.query(
      \`
        SELECT tenant_id 
        FROM auth_action_tokens
        WHERE lower(email) = $1
          AND purpose = 'invite_acceptance'
          AND consumed_at IS NULL
        LIMIT 1
      \`,
      [adminEmail]
    );

    if (invitationConflict.rows.length > 0) {
      throw new BadRequestException('This email is already registered under another school. Use a different email address for this school.');
    }

    const transactionResult = await this.databaseService.withRequestTransaction(async () => {`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced content.');
} else {
  console.error('Target string not found.');
  process.exit(1);
}
