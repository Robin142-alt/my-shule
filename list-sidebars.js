const fs = require('fs');
const content = fs.readFileSync('apps/web/src/lib/operational/myshule-extreme-operating-system.ts', 'utf-8');
const blueprintsMatch = content.match(/const roleBlueprints: OperationalRoleBlueprint\[\] = \[([\s\S]*?)^];/m);
if (blueprintsMatch) {
  const blueprintsStr = blueprintsMatch[1];
  const items = blueprintsStr.split('roleBlueprint({');
  items.forEach(item => {
    if (!item.trim()) return;
    const idMatch = item.match(/id: \"([^\"]+)\"/);
    const sidebarMatch = item.match(/sidebar: \[([\s\S]*?)\]/);
    if (idMatch) {
      console.log('## ' + idMatch[1]);
      if (sidebarMatch) {
        const sidebars = sidebarMatch[1].match(/\"([^\"]+)\"/g);
        if (sidebars) {
          sidebars.forEach(s => console.log('- ' + s.replace(/\"/g, '')));
        }
      }
      console.log('');
    }
  });
}
