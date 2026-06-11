const fs = require('fs');
const path = require('path');

const filePath = path.join('apps', 'web', 'src', 'components', 'modules', 'admissions', 'admissions-module-screen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
const importsToAdd = `
import { AdmissionsOverviewWorkspace } from "@/components/school/admissions-dashboard/overview-workspace";
import { AdmissionsEnquiriesWorkspace } from "@/components/school/admissions-dashboard/enquiries-workspace";
import { AdmissionsApplicationsWorkspace } from "@/components/school/admissions-dashboard/applications-workspace";
import { AdmissionsApplicantProfilesWorkspace } from "@/components/school/admissions-dashboard/applicant-profiles-workspace";
import { AdmissionsDocumentsWorkspace } from "@/components/school/admissions-dashboard/documents-workspace";
import { AdmissionsInterviewsWorkspace } from "@/components/school/admissions-dashboard/interviews-workspace";
import { AdmissionsSelectionWorkspace } from "@/components/school/admissions-dashboard/selection-workspace";
import { AdmissionsFeeClearanceWorkspace } from "@/components/school/admissions-dashboard/fee-clearance-workspace";
import { AdmissionsEnrolmentWorkspace } from "@/components/school/admissions-dashboard/enrolment-workspace";
import { AdmissionsPlacementWorkspace } from "@/components/school/admissions-dashboard/placement-workspace";
import { AdmissionsParentsWorkspace } from "@/components/school/admissions-dashboard/parents-workspace";
import { AdmissionsTransfersWorkspace } from "@/components/school/admissions-dashboard/transfers-workspace";
import { AdmissionsCommunicationWorkspace } from "@/components/school/admissions-dashboard/communication-workspace";
import { AdmissionsAppointmentsWorkspace } from "@/components/school/admissions-dashboard/appointments-workspace";
import { AdmissionsImportsWorkspace } from "@/components/school/admissions-dashboard/imports-workspace";
import { AdmissionsReportsWorkspace } from "@/components/school/admissions-dashboard/reports-workspace";
import { AdmissionsTasksWorkspace } from "@/components/school/admissions-dashboard/tasks-workspace";
import { AdmissionsTemplatesWorkspace } from "@/components/school/admissions-dashboard/templates-workspace";
`;

if (!content.includes('AdmissionsOverviewWorkspace')) {
  content = content.replace('import { FormSection }', importsToAdd.trim() + '\nimport { FormSection }');
}

const switchReplacement = `        {(() => {
          switch (activeSection) {
            case "overview": return <AdmissionsOverviewWorkspace />;
            case "enquiries": return <AdmissionsEnquiriesWorkspace />;
            case "applications": return <AdmissionsApplicationsWorkspace />;
            case "applicant-profiles": return <AdmissionsApplicantProfilesWorkspace />;
            case "documents": return <AdmissionsDocumentsWorkspace />;
            case "interviews": return <AdmissionsInterviewsWorkspace />;
            case "selection": return <AdmissionsSelectionWorkspace />;
            case "fee-clearance": return <AdmissionsFeeClearanceWorkspace />;
            case "enrolment": return <AdmissionsEnrolmentWorkspace />;
            case "placement": return <AdmissionsPlacementWorkspace />;
            case "parents": return <AdmissionsParentsWorkspace />;
            case "transfers": return <AdmissionsTransfersWorkspace />;
            case "communication": return <AdmissionsCommunicationWorkspace />;
            case "appointments": return <AdmissionsAppointmentsWorkspace />;
            case "imports": return <AdmissionsImportsWorkspace />;
            case "reports": return <AdmissionsReportsWorkspace />;
            case "tasks": return <AdmissionsTasksWorkspace />;
            case "templates": return <AdmissionsTemplatesWorkspace />;
            default: return <AdmissionsOverviewWorkspace />;
          }
        })()}`;

const startReplace = content.indexOf('{activeSection === "dashboard" ? (');
const reportsSection = content.indexOf('{activeSection === "reports" ? (');

if (startReplace !== -1 && reportsSection !== -1) {
  let endReplace = content.indexOf(') : null}', reportsSection) + 9;
  
  content = content.substring(0, startReplace) + switchReplacement + content.substring(endReplace);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully replaced monolithic ui with workspace components.');
} else {
  console.log('Could not find startReplace or reportsSection');
}
