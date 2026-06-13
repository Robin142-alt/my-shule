const fs = require('fs');

const path = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/';

function addImports(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add SchoolExperienceRole
  if (!content.includes('SchoolExperienceRole')) {
    content = content.replace('import { getSchoolWorkspace } from "@/lib/experiences/school-data";', 'import { getSchoolWorkspace, type SchoolExperienceRole, buildSchoolStudentHref } from "@/lib/experiences/school-data";');
  } else if (!content.includes('import { getSchoolWorkspace, type SchoolExperienceRole')) {
    content = content.replace('import { getSchoolWorkspace }', 'import { getSchoolWorkspace, type SchoolExperienceRole, buildSchoolStudentHref }');
  }
  
  // Add useEffect if missing
  if (content.includes('import { useState }') && !content.includes('useEffect')) {
    content = content.replace('import { useState }', 'import { useState, useEffect }');
  }
  
  // Add Link
  if (!content.includes('import Link')) {
    content = 'import Link from "next/link";\n' + content;
  }
  
  // Add buildBillingApiPath
  if (content.includes('buildBillingApiPath') && !content.includes('import { buildBillingApiPath')) {
    content = 'import { buildBillingApiPath } from "@/lib/data/billing-api";\n' + content;
  }
  
  fs.writeFileSync(file, content);
}

['student-directory-workspace.tsx', 'academics-workspace-admin.tsx', 'reports-workspace.tsx'].forEach(f => addImports(path + f));

console.log('Added missing imports to extracted workspaces');
