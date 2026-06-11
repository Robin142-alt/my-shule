const fs = require('fs');
const path = require('path');

const workspaces = [
    ["overview", "AdmissionsOverviewWorkspace", "Overview", "Daily command center for the Admission Officer."],
    ["enquiries", "AdmissionsEnquiriesWorkspace", "Enquiries & Walk-ins", "Log and track all incoming admission queries."],
    ["applications", "AdmissionsApplicationsWorkspace", "Applications", "Manage new, pending, and completed student applications."],
    ["applicant-profiles", "AdmissionsApplicantProfilesWorkspace", "Applicant Profiles", "Detailed view of individual applicant records."],
    ["documents", "AdmissionsDocumentsWorkspace", "Documents & Verification", "Upload and verify birth certificates, reports, and photos."],
    ["interviews", "AdmissionsInterviewsWorkspace", "Interviews & Assessments", "Schedule and record results for entrance exams or interviews."],
    ["selection", "AdmissionsSelectionWorkspace", "Selection & Offers", "Shortlist applicants and generate admission offer letters."],
    ["fee-clearance", "AdmissionsFeeClearanceWorkspace", "Admission Fee Clearance", "Track admission fee and deposit payments before final enrollment."],
    ["enrolment", "AdmissionsEnrolmentWorkspace", "Enrolment & Admission Numbers", "Assign official admission numbers and transition to active students."],
    ["placement", "AdmissionsPlacementWorkspace", "Class & Stream Placement", "Assign newly admitted students to their respective classes."],
    ["parents", "AdmissionsParentsWorkspace", "Parents & Guardians", "Link applicants to their parent or guardian records."],
    ["transfers", "AdmissionsTransfersWorkspace", "Transfers & Re-admissions", "Manage incoming transfer students and re-admitting former students."],
    ["communication", "AdmissionsCommunicationWorkspace", "Communication", "Send SMS and email updates to parents regarding admission status."],
    ["appointments", "AdmissionsAppointmentsWorkspace", "Appointments & Visits", "Schedule school tours and parent meetings."],
    ["imports", "AdmissionsImportsWorkspace", "Imports & Bulk Uploads", "Bulk upload applicants from external systems or spreadsheets."],
    ["reports", "AdmissionsReportsWorkspace", "Reports & Downloads", "Export lists of admitted students, pending applications, and statistics."],
    ["tasks", "AdmissionsTasksWorkspace", "Tasks & Follow-ups", "Internal to-do list for following up on missing documents or fees."],
    ["templates", "AdmissionsTemplatesWorkspace", "Admission Templates", "Manage templates for offer letters, rejection letters, and forms."]
];

const template = (componentName, title, description) => `"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function ${componentName}() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Summary Cards */}
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Status</div>
          <div className="mt-2 text-2xl font-black text-white">Active</div>
        </Card>
      </div>

      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">${title}</h2>
        </div>
        <div className="mt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-lg font-semibold text-white">${description}</p>
            <p className="mt-2 text-sm text-white/60">This workspace is currently under construction to match the MyShule production blueprint.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
`;

const dir = path.join(__dirname, "apps", "web", "src", "components", "school", "admissions-dashboard");

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

for (const [filePrefix, componentName, title, description] of workspaces) {
    const filePath = path.join(dir, `${filePrefix}-workspace.tsx`);
    fs.writeFileSync(filePath, template(componentName, title, description), "utf-8");
}

console.log("Created 18 admissions workspaces.");
