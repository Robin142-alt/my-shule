const fs = require('fs');
const path = 'c:/Users/user/Desktop/PROJECTS/Shule hub/apps/web/src/components/school/school-pages.tsx';
let content = fs.readFileSync(path, 'utf8');

const imports = `import { SchoolStudentsPage } from "./student-directory-workspace";
import { SchoolAcademicsPage } from "./academics-workspace-admin";
import { SchoolReportsPage } from "./reports-workspace";`;

content = content.replace('import { getSchoolWorkspace', imports + '\nimport { getSchoolWorkspace');

const renderCalls = `
      {!studentId && !renderRoleOperationalWorkspace && section === "students" ? <SchoolStudentsPage role={role} tenantSlug={tenantSlug} routeMode={routeMode} /> : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "academics" ? <SchoolAcademicsPage role={role} tenantSlug={tenantSlug} routeMode={routeMode} /> : null}
      {!studentId && !renderRoleOperationalWorkspace && section === "reports" ? <SchoolReportsPage role={role} tenantSlug={tenantSlug} /> : null}
`;

content = content.replace('{/* DEFAULT SECTION HANDLERS */}', '{/* DEFAULT SECTION HANDLERS */}' + renderCalls);

fs.writeFileSync(path, content);
console.log('Restored isolated workspaces.');
