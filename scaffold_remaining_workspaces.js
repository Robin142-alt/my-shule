const fs = require('fs');
const path = require('path');
const sd = fs.readFileSync('apps/web/src/lib/experiences/school-data.ts', 'utf-8');
const navRegex = /const schoolNavMap: Record<SchoolExperienceRole(?: \| PortalViewer)?, ExperienceNavItem\[\]> = (\{[\s\S]*?\});/m;
const match = sd.match(navRegex);
if (!match) { console.log('No nav map found'); process.exit(1); }
const navMapStr = match[1].replace(/toSchoolPath\([^)]+\)/g, '\"#\"').replace(/\.\.\.supportSidebarItems,/g, '').replace(/icon: [a-zA-Z0-9_]+/g, 'icon: \"icon\"');
const navMap = eval('(' + navMapStr + ')');
let missing = 0;

function generateTemplate(componentName) {
  return `"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function ${componentName}() {
  return (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">${componentName.replace(/([A-Z])/g, ' $1').trim()}</h2>
        </div>
        <div className="mt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-lg font-semibold text-white">This workspace is under construction to match the platform blueprint.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
`;
}

for (const [role, items] of Object.entries(navMap)) {
  const dir = path.join('apps/web/src/components/school', role);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  for (const item of items) {
    if (item.id.startsWith('support-') || item.id === 'settings') continue;
    const file = path.join(dir, item.id + '-workspace.tsx');
    if (!fs.existsSync(file)) {
      const componentName = item.id.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('') + 'Workspace';
      fs.writeFileSync(file, generateTemplate(componentName), 'utf-8');
      missing++;
    }
  }
}
console.log('Successfully scaffolded ' + missing + ' missing TSX files.');
