const fs = require('fs');
const path = require('path');
const sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
const navRegex = /const schoolNavMap: Record<SchoolExperienceRole(?: \| PortalViewer)?, ExperienceNavItem\[\]> = (\{[\s\S]*?\});/m;
const match = sd.match(navRegex);
if (!match) { console.log('No nav map found'); process.exit(1); }
const navMapStr = match[1].replace(/toSchoolPath\([^)]+\)/g, '\"#\"').replace(/\.\.\.supportSidebarItems,/g, '').replace(/icon: [a-zA-Z0-9_]+/g, 'icon: \"icon\"');
const navMap = eval('(' + navMapStr + ')');
let total = 0;
let missing = 0;
for (const [role, items] of Object.entries(navMap)) {
  const dir = path.join('apps/web/src/components/school', role);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const item of items) {
    if (item.id.startsWith('support-') || item.id === 'settings') continue;
    total++;
    const file = path.join(dir, item.id + '-workspace.tsx');
    if (!fs.existsSync(file)) {
      console.log('Missing: ' + file);
      missing++;
    }
  }
}
console.log('Total: ' + total + ', Missing: ' + missing);
