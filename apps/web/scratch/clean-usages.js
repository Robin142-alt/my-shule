const fs = require('fs');
const lines = fs.readFileSync('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-pages.tsx', 'utf8').split('\n');
const newLines = lines.filter(line => 
  !line.includes('<SchoolStudentsPage role={role}') &&
  !line.includes('<SchoolAcademicsPage role={role}') &&
  !line.includes('<SchoolReportsPage role={role}')
);
fs.writeFileSync('c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-pages.tsx', newLines.join('\n'));
console.log('Cleaned school-pages.tsx usages');
