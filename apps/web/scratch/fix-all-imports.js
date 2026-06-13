const fs = require('fs');
const path = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/';
const pagesPath = path + 'school-pages.tsx';

// 1. Export getMissingFieldError
let pagesContent = fs.readFileSync(pagesPath, 'utf8');
pagesContent = pagesContent.replace('function getMissingFieldError', 'export function getMissingFieldError');
fs.writeFileSync(pagesPath, pagesContent);

// 2. Fix imports in the extracted workspaces
const files = [
  path + 'student-directory-workspace.tsx',
  path + 'academics-workspace-admin.tsx',
  path + 'reports-workspace.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace('import type { SchoolExperienceRole } from "@/lib/auth/roles";', '');
  content = content.replace('import { getMissingFieldError } from "@/lib/forms/validation";', 'import { getMissingFieldError } from "@/components/school/school-pages";');
  fs.writeFileSync(file, content);
});

console.log('Fixed imports and exported getMissingFieldError');
