const fs = require('fs');
const files = [
  'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/student-directory-workspace.tsx',
  'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/academics-workspace-admin.tsx',
  'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/reports-workspace.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('import { MetricGrid } from "@/components/school/metric-grid";', 'import { MetricGrid } from "@/components/experience/metric-grid";');
  content = content.replace('import { StatusPill } from "@/components/school/status-pill";', 'import { StatusPill } from "@/components/ui/status-pill";');
  fs.writeFileSync(file, content);
});
console.log('Fixed imports');
