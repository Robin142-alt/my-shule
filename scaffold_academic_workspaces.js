const fs = require('fs');
const path = require('path');

function generateWorkspace(dir, filename, componentName, title, description, datasetKey, mockColumns) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = `"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

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

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
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
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
  console.log('Generated ' + filename);
}

const teacherDir = path.join(__dirname, 'apps', 'web', 'src', 'components', 'school', 'teacher-dashboard');
const hodDir = path.join(__dirname, 'apps', 'web', 'src', 'components', 'school', 'hod-dashboard');
const examsDir = path.join(__dirname, 'apps', 'web', 'src', 'components', 'school', 'exams-dashboard');

// Teacher Workspaces
generateWorkspace(teacherDir, 'academic-setup-workspace.tsx', 'TeacherAcademicSetupWorkspace', 'Academic Setup', 'Request or define subjects, classes, and streams.', 'setups', `
    { id: "subject", header: "Subject/Learning Area", render: (row) => row.subjectName },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "curriculum", header: "Curriculum", render: (row) => row.curriculumType },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status || 'Pending'} tone={row.status === 'Approved' ? 'ok' : 'warning'} /> }
`);

generateWorkspace(teacherDir, 'subject-allocations-workspace.tsx', 'TeacherSubjectAllocationsWorkspace', 'Subject Allocations', 'View assigned classes and roles.', 'allocations', `
    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "role", header: "Role", render: (row) => row.role },
    { id: "canEnterMarks", header: "Mark Entry", render: (row) => <StatusPill label={row.canEnterMarks ? 'Allowed' : 'Restricted'} tone={row.canEnterMarks ? 'ok' : 'critical'} /> }
`);

generateWorkspace(teacherDir, 'mark-entry-workspace.tsx', 'TeacherMarkEntryWorkspace', 'Mark Entry (8-4-4)', 'Interface for numeric marks.', 'marks', `
    { id: "student", header: "Student", render: (row) => row.studentName },
    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "mark", header: "Mark", render: (row) => row.marksObtained },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone={row.status === 'APPROVED' ? 'ok' : 'warning'} /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Edit</Button> }
`);

generateWorkspace(teacherDir, 'cbc-assessment-workspace.tsx', 'TeacherCBCAssessmentWorkspace', 'CBC Assessment Entry', 'Interface for rubric descriptors and comments.', 'cbc', `
    { id: "student", header: "Student", render: (row) => row.studentName },
    { id: "strand", header: "Strand", render: (row) => row.strandName },
    { id: "level", header: "Level", render: (row) => row.level },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="info" /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Assess</Button> }
`);

// HOD Workspaces
generateWorkspace(hodDir, 'department-overview-workspace.tsx', 'HODDepartmentOverviewWorkspace', 'Department Overview', 'View subjects and teachers in the department.', 'overview', `
    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "teachers", header: "Allocated Teachers", render: (row) => row.teacherCount },
    { id: "curriculum", header: "Curriculum", render: (row) => row.curriculumScope },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.isActive ? 'Active' : 'Inactive'} tone="ok" /> }
`);

generateWorkspace(hodDir, 'review-queue-workspace.tsx', 'HODReviewQueueWorkspace', 'Marks Review Queue', 'Approve or return submitted marks from department teachers.', 'reviews', `
    { id: "teacher", header: "Teacher", render: (row) => row.teacherName },
    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "submittedAt", header: "Submitted At", render: (row) => row.submittedAt },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="warning" /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Review</Button> }
`);

// Exams Manager Workspaces
generateWorkspace(examsDir, 'academic-setup-approval-workspace.tsx', 'ExamsAcademicSetupApprovalWorkspace', 'Setup Approvals', 'Approve teacher setups, lock official subject lists.', 'approvals', `
    { id: "request", header: "Request", render: (row) => row.requestName },
    { id: "teacher", header: "Teacher", render: (row) => row.teacherName },
    { id: "date", header: "Date", render: (row) => row.date },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Review</Button> }
`);

generateWorkspace(examsDir, 'exam-readiness-workspace.tsx', 'ExamsReadinessWorkspace', 'Exam Readiness', 'Verify all marks are approved and trigger report cards.', 'readiness', `
    { id: "exam", header: "Exam", render: (row) => row.examName },
    { id: "term", header: "Term", render: (row) => row.term },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.isReady ? 'Ready' : 'Pending'} tone={row.isReady ? 'ok' : 'warning'} /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link" disabled={!row.isReady}>Publish</Button> }
`);
