const fs = require('fs');
const path = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/';
const pagesPath = path + 'school-pages.tsx';
const lines = fs.readFileSync(pagesPath, 'utf8').split('\n');

const headerStart = 751;
const headerEnd = 774;

// 1. Export SchoolRouteMode
lines[88] = lines[88].replace('type SchoolRouteMode', 'export type SchoolRouteMode');

// 2. Extract SchoolPageHeader
const headerComponent = lines.slice(headerStart, headerEnd + 1).join('\n').replace('function SchoolPageHeader', 'export function SchoolPageHeader');
const headerFileContent = `import { LucideIcon } from "lucide-react";

` + headerComponent + `\n`;
fs.writeFileSync(path + 'school-page-header.tsx', headerFileContent);

// 3. Remove SchoolPageHeader from school-pages.tsx
const newLines = [];
for (let i = 0; i < lines.length; i++) {
  if (i >= headerStart && i <= headerEnd) continue;
  newLines.push(lines[i]);
}

// 4. Import SchoolPageHeader in school-pages.tsx
const importsStr = `import { SchoolPageHeader } from "./school-page-header";\n`;
const finalContent = newLines.join('\n').replace('import { getSchoolWorkspace', importsStr + 'import { getSchoolWorkspace');

fs.writeFileSync(pagesPath, finalContent);
console.log('Extracted SchoolPageHeader and exported SchoolRouteMode');
