const fs = require('fs');
const path = require('path');
const sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
const navRegex = /const schoolNavMap: Record<SchoolExperienceRole(?: \| PortalViewer)?, ExperienceNavItem\[\]> = (\{[\s\S]*?\});/m;
const match = sd.match(navRegex);
if (!match) { console.log('No nav map found'); process.exit(1); }
const navMapStr = match[1].replace(/toSchoolPath\([^)]+\)/g, '\"#\"').replace(/\.\.\.supportSidebarItems,/g, '').replace(/icon: [a-zA-Z0-9_]+/g, 'icon: \"icon\"');
const navMap = eval('(' + navMapStr + ')');
let upgraded = 0;

function generateTemplate(componentName, workspaceId) {
  return `"use client";

import { DocxOperationalWorkspace } from "@/components/school/docx-operational-workspace";

export function ${componentName}() {
  return <DocxOperationalWorkspace moduleId="${workspaceId}" />;
}
`;
}

for (const [role, items] of Object.entries(navMap)) {
  const dir = path.join('apps/web/src/components/school', role);
  for (const item of items) {
    if (item.id.startsWith('support-') || item.id === 'settings') continue;
    const file = path.join(dir, item.id + '-workspace.tsx');
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('OperationalBlueprintWorkspace')) {
        const componentName = item.id.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Workspace';
        // We will pass item.id to moduleId, DocxOperationalWorkspace internally handles mapping logic 
        fs.writeFileSync(file, generateTemplate(componentName, item.id), 'utf-8');
        upgraded++;
      }
    }
  }
}
console.log('Successfully patched ' + upgraded + ' workspace files to use DocxOperationalWorkspace.');
