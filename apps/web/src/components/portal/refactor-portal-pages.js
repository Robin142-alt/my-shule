const fs = require('fs');
let content = fs.readFileSync('apps/web/src/components/portal/portal-pages.tsx', 'utf-8');

// 1. Update imports
content = content.replace(/portalAcademicTargets,\s*portalFeeHistory,\s*portalMessages,\s*portalParentChildren,\s*portalPublishedExamResults,\s*portalPublishedReportCards,\s*portalTeacherComments,/, 
  'getPortalAcademicTargets, getPortalFeeHistory, getPortalMessages, getPortalParentChildren, getPortalPublishedExamResults, getPortalPublishedReportCards, getPortalTeacherComments,');

if (!content.includes('import { getCurrentSchoolId }')) {
  content = content.replace(/import { toPortalPath } from "@\/lib\/routing\/experience-routes";/, 
    'import { toPortalPath } from "@/lib/routing/experience-routes";\nimport { getCurrentSchoolId } from "@/lib/routing/workspace-context";');
}

// 2. Replace usages inside components
content = content.replace(/portalFeeHistory/g, 'getPortalFeeHistory(getCurrentSchoolId())');
content = content.replace(/portalMessages/g, 'getPortalMessages(getCurrentSchoolId())');
content = content.replace(/portalParentChildren/g, 'getPortalParentChildren(getCurrentSchoolId())');
content = content.replace(/portalPublishedExamResults/g, 'getPortalPublishedExamResults(getCurrentSchoolId())');
content = content.replace(/portalPublishedReportCards/g, 'getPortalPublishedReportCards(getCurrentSchoolId())');
content = content.replace(/portalTeacherComments/g, 'getPortalTeacherComments(getCurrentSchoolId())');
content = content.replace(/portalAcademicTargets/g, 'getPortalAcademicTargets(getCurrentSchoolId())');

// Note: `getPortalFeeHistory` itself has "portalFeeHistory" in it, so we need to fix getters getting double matched.
// It became `getgetPortalFeeHistory(getCurrentSchoolId())(getCurrentSchoolId())`. We must run a clean up.
content = content.replace(/getgetPortalFeeHistory\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalFeeHistory(getCurrentSchoolId())');
content = content.replace(/getgetPortalMessages\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalMessages(getCurrentSchoolId())');
content = content.replace(/getgetPortalParentChildren\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalParentChildren(getCurrentSchoolId())');
content = content.replace(/getgetPortalPublishedExamResults\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalPublishedExamResults(getCurrentSchoolId())');
content = content.replace(/getgetPortalPublishedReportCards\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalPublishedReportCards(getCurrentSchoolId())');
content = content.replace(/getgetPortalTeacherComments\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalTeacherComments(getCurrentSchoolId())');
content = content.replace(/getgetPortalAcademicTargets\(getCurrentSchoolId\(\)\)\(getCurrentSchoolId\(\)\)/g, 'getPortalAcademicTargets(getCurrentSchoolId())');

fs.writeFileSync('apps/web/src/components/portal/portal-pages.tsx', content);
