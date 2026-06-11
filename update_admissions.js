const fs = require('fs');
const filePath = 'apps/web/src/lib/operational/myshule-extreme-operating-system.ts';
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `    sidebar: ["Admissions Command Center", "Inquiries", "Applications", "Documents", "Interviews", "Approvals", "Reports"],`;
const replacementStr = `    sidebar: [
      "Overview",
      "Enquiries & Walk-ins",
      "Applications",
      "Applicant Profiles",
      "Documents & Verification",
      "Interviews & Assessments",
      "Selection & Offers",
      "Admission Fee Clearance",
      "Enrolment & Admission Numbers",
      "Class & Stream Placement",
      "Parents & Guardians",
      "Transfers & Re-admissions",
      "Communication",
      "Appointments & Visits",
      "Imports & Bulk Uploads",
      "Reports & Downloads",
      "Tasks & Follow-ups",
      "Admission Templates"
    ],`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced content.');
} else {
  console.error('Target string not found.');
  process.exit(1);
}
