const fs = require('fs');
const files = [
  'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/student-directory-workspace.tsx',
  'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/academics-workspace-admin.tsx',
  'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/reports-workspace.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('import type { SchoolRouteMode } from "@/components/school/school-finance-page";', 'import type { SchoolRouteMode } from "@/components/school/school-pages";');
  fs.writeFileSync(file, content);
});
console.log('Fixed RouteMode imports');
