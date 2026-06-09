const fs = require('fs');
const filePath = 'apps/api/src/auth/auth.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `    if (memberships.length > 1) {
      throw new UnauthorizedException('Multiple school workspaces are linked to this account. Choose a school after sign-in.');
    }

    throw new UnauthorizedException('User does not have access to an active school workspace');`;

const replacementStr = `    if (memberships.length > 1) {
      throw new UnauthorizedException('Multiple school memberships detected for this account. Contact Super Admin.');
    }

    throw new UnauthorizedException('School access pending.');`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced content.');
} else {
  console.error('Target string not found.');
  process.exit(1);
}
