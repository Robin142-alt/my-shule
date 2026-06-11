const fs = require('fs');
const path = require('path');

const DIR = path.join('apps', 'web', 'src', 'components', 'school', 'admissions-dashboard');

const generateWorkspace = (filename, componentName, title, description, datasetKey, mockColumns) => {
  const content = `"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function ${componentName}({ dataset }: { dataset?: any }) {
  const data = dataset?.${datasetKey} || [];

  const columns: OpsTableColumn<any>[] = [
${mockColumns}
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total ${title}</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="${title}"
        subtitle="${description}"
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
`;
  fs.writeFileSync(path.join(DIR, filename), content, 'utf8');
};

generateWorkspace('applications-workspace.tsx', 'AdmissionsApplicationsWorkspace', 'Applications', 'Review submitted admission applications.', 'applications', `
    { id: "applicant", header: "Applicant", render: (row) => row.studentName || "Unknown" },
    { id: "class", header: "Target Class", render: (row) => row.className || "Unassigned" },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status || "Pending"} tone={row.status === "approved" ? "ok" : "warning"} /> }
`);

generateWorkspace('documents-workspace.tsx', 'AdmissionsDocumentsWorkspace', 'Documents', 'Verification queue for uploaded documents.', 'documents', `
    { id: "applicant", header: "Applicant ID", render: (row) => row.applicationId },
    { id: "document", header: "Document Type", render: (row) => row.documentType },
    { id: "status", header: "Verification", render: (row) => <StatusPill label={row.verificationStatus} tone={row.verificationStatus === "verified" ? "ok" : "critical"} /> }
`);

generateWorkspace('placement-workspace.tsx', 'AdmissionsPlacementWorkspace', 'Class Allocations', 'Class and stream allocation for new students.', 'allocations', `
    { id: "application", header: "Application ID", render: (row) => row.applicationId },
    { id: "class", header: "Class", render: (row) => row.assignedClass },
    { id: "stream", header: "Stream", render: (row) => row.assignedStream },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === "confirmed" ? "ok" : "warning"} /> }
`);

generateWorkspace('parents-workspace.tsx', 'AdmissionsParentsWorkspace', 'Parents & Guardians', 'Linked guardian contacts and records.', 'parents', `
    { id: "name", header: "Parent Name", render: (row) => row.parentName },
    { id: "phone", header: "Phone Number", render: (row) => row.parentPhone },
    { id: "email", header: "Email", render: (row) => row.parentEmail || "N/A" }
`);

generateWorkspace('transfers-workspace.tsx', 'AdmissionsTransfersWorkspace', 'Transfers & Re-admissions', 'History of incoming and outgoing transfers.', 'transfers', `
    { id: "student", header: "Student Name", render: (row) => row.studentName },
    { id: "type", header: "Transfer Type", render: (row) => <StatusPill label={row.transferType} tone="info" /> },
    { id: "school", header: "Previous/Next School", render: (row) => row.transferSchool }
`);

generateWorkspace('interviews-workspace.tsx', 'AdmissionsInterviewsWorkspace', 'Interviews & Assessments', 'Scheduled interviews for applicants.', 'interviews', `
    { id: "date", header: "Date", render: (row) => row.interviewDate },
    { id: "applicant", header: "Applicant", render: (row) => row.applicationId },
    { id: "interviewer", header: "Interviewer", render: (row) => row.interviewerName || "Pending" }
`);

generateWorkspace('selection-workspace.tsx', 'AdmissionsSelectionWorkspace', 'Selection & Offers', 'Admissions offers and decision tracking.', 'offers', `
    { id: "applicant", header: "Application ID", render: (row) => row.applicationId },
    { id: "offerDate", header: "Offer Date", render: (row) => row.offerDate },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="ok" /> }
`);

generateWorkspace('appointments-workspace.tsx', 'AdmissionsAppointmentsWorkspace', 'Appointments & Visits', 'Parent visits and meetings.', 'appointments', `
    { id: "date", header: "Date", render: (row) => row.appointmentDate },
    { id: "parent", header: "Parent Name", render: (row) => row.parentName },
    { id: "purpose", header: "Purpose", render: (row) => row.purpose }
`);

generateWorkspace('tasks-workspace.tsx', 'AdmissionsTasksWorkspace', 'Tasks & Follow-ups', 'Admission officer workflow tasks.', 'tasks', `
    { id: "task", header: "Task", render: (row) => row.title },
    { id: "due", header: "Due Date", render: (row) => row.dueDate },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="warning" /> }
`);

generateWorkspace('templates-workspace.tsx', 'AdmissionsTemplatesWorkspace', 'Admission Templates', 'Letter and email templates.', 'templates', `
    { id: "name", header: "Template Name", render: (row) => row.templateName },
    { id: "type", header: "Type", render: (row) => row.type },
    { id: "subject", header: "Subject", render: (row) => row.subject }
`);

generateWorkspace('enquiries-workspace.tsx', 'AdmissionsEnquiriesWorkspace', 'Enquiries & Walk-ins', 'Log of walk-in enquiries.', 'enquiries', `
    { id: "date", header: "Date", render: (row) => row.createdAt || "Recent" },
    { id: "parent", header: "Parent Name", render: (row) => row.parentName },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status || "Open"} tone="info" /> }
`);

// Workspaces without OpsTable or custom layouts
const generateCustomWorkspace = (filename, componentName, title, description) => {
  const content = `"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function ${componentName}({ dataset }: { dataset?: any }) {
  return (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">${title}</h2>
        </div>
        <div className="mt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-lg font-semibold text-white">${description}</p>
            <p className="mt-2 text-sm text-white/60">This specialized UI layout is currently in scaffolding phase.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(DIR, filename), content, 'utf8');
};

generateCustomWorkspace('overview-workspace.tsx', 'AdmissionsOverviewWorkspace', 'Overview Dashboard', 'High-level metrics and admission summary.');
generateCustomWorkspace('applicant-profiles-workspace.tsx', 'AdmissionsApplicantProfilesWorkspace', 'Applicant Profiles', 'Detailed drill-down grid for applicant records.');
generateCustomWorkspace('fee-clearance-workspace.tsx', 'AdmissionsFeeClearanceWorkspace', 'Fee Clearance', 'Financial tracking for initial admission payments.');
generateCustomWorkspace('enrolment-workspace.tsx', 'AdmissionsEnrolmentWorkspace', 'Enrolment & Admission Numbers', 'Admission number generator and final enrolment.');
generateCustomWorkspace('communication-workspace.tsx', 'AdmissionsCommunicationWorkspace', 'Communication Hub', 'Bulk SMS and email center for admission updates.');
generateCustomWorkspace('imports-workspace.tsx', 'AdmissionsImportsWorkspace', 'Imports & Bulk Uploads', 'CSV/Excel uploader for bulk admissions data.');
generateCustomWorkspace('reports-workspace.tsx', 'AdmissionsReportsWorkspace', 'Reports & Downloads', 'Generate printable PDFs and export spreadsheets.');

console.log('Successfully generated all 18 workspaces.');
