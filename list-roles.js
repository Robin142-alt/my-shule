const fs = require('fs');
const tsCode = fs.readFileSync('apps/web/src/lib/operational/myshule-extreme-operating-system.ts', 'utf8');

const matchRoleBlueprints = tsCode.match(/const roleBlueprints\s*:\s*OperationalRoleBlueprint\[\]\s*=\s*\[([\s\S]*?)\n\];/);

let md = '# MyShule Roles and Sidebars\n\n';

if (matchRoleBlueprints) {
  const items = [];
  const regex = /id:\s*['"]([^'"]+)['"][\s\S]*?sidebar:\s*\[([\s\S]*?)\]/g;
  let m;
  while ((m = regex.exec(matchRoleBlueprints[1])) !== null) {
     const role = m[1];
     const sidebarStr = m[2];
     const sidebars = sidebarStr.split(',').map(s => s.trim().replace(/['"]/g, '')).filter(s => s);
     items.push({role, sidebars});
  }
  
  items.forEach(item => {
      md += `## Role: \`${item.role}\`\n\n**Sidebars:**\n`;
      item.sidebars.forEach(s => {
          md += `- ${s}\n`;
      });
      md += '\n';
  });
}

const defsMatch = tsCode.match(/const addedModuleContracts[\s\S]*?\];/);
if (defsMatch) {
   md += '# All Generated Modules\n\n';
   // Let's also read the generated workspace definitions to list them
   const defsCode = fs.readFileSync('apps/web/src/lib/operational/generated-workspace-definitions.ts', 'utf8');
   const modRegex = /id:\s*['"]([^'"]+)['"],\n\s*title:\s*['"]([^'"]+)['"]/g;
   let m;
   md += '| Module ID | Title |\n|---|---|\n';
   while ((m = modRegex.exec(defsCode)) !== null) {
      md += `| \`${m[1]}\` | ${m[2]} |\n`;
   }
}

fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/4fd7d609-567f-4cfb-9e32-4318d2661eb8/dashboards_and_sidebars.md', md);
console.log('Successfully written to artifact');
