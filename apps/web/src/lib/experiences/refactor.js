const fs = require('fs');
let content = fs.readFileSync('apps/web/src/lib/experiences/portal-data.ts', 'utf-8');

// First add the import
content = content.replace(/import \{ toPortalPath \} from "@\/lib\/routing\/experience-routes";/, 'import { toPortalPath } from "@/lib/routing/experience-routes";\nimport { shouldUseKisumuBoysDemoTenant } from "@/lib/demo/kisumu-boys-high-demo";');

// Replace exports
const arrayVars = [
  'portalFeeHistory',
  'portalAcademicRows',
  'portalParentChildren',
  'portalPublishedReportCards',
  'portalPublishedExamResults',
  'portalAcademicTargets',
  'portalTeacherComments',
  'portalMessages'
];

for (const varName of arrayVars) {
  content = content.replace(new RegExp('export const ' + varName + '(:.*?)? = \\['), 'const _' + varName + '$1 = [');
  content += '\nexport function get' + varName.charAt(0).toUpperCase() + varName.slice(1) + '(schoolId?: string | null) { return shouldUseKisumuBoysDemoTenant(schoolId) ? _' + varName + ' : []; }\n';
}

fs.writeFileSync('apps/web/src/lib/experiences/portal-data.ts', content);
