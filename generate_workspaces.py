import os

workspaces = [
    ("overview", "PrincipalOverviewWorkspace", "Overview", "Principal command center and decision queue."),
    ("setup-checklist", "PrincipalSetupChecklistWorkspace", "Setup Checklist", "School setup progress and required actions."),
    ("school-profile", "PrincipalSchoolProfileWorkspace", "School Profile", "Official school identity, campuses, and documents."),
    ("academic-setup", "PrincipalAcademicSetupWorkspace", "Academic Setup", "Academic years, terms, and curriculum rules."),
    ("classes-streams", "PrincipalClassesStreamsWorkspace", "Classes & Streams", "School class structure and capacity management."),
    ("subjects-departments", "PrincipalSubjectsDepartmentsWorkspace", "Subjects & Departments", "Academic departments and teacher subject allocation."),
    ("staff-roles", "PrincipalStaffRolesWorkspace", "Staff & Roles", "Staff directory, invites, and role assignments."),
    ("students", "PrincipalStudentsWorkspace", "Students", "Student population and admissions oversight."),
    ("attendance", "PrincipalAttendanceWorkspace", "Attendance", "School-wide attendance and chronic absenteeism."),
    ("academics", "PrincipalAcademicsWorkspace", "Academics", "Syllabus coverage and department performance."),
    ("exams-reports", "PrincipalExamsReportsWorkspace", "Exams & Report Cards", "Exams tracking and report card publishing."),
    ("finance-overview", "PrincipalFinanceOverviewWorkspace", "Finance Overview", "Expected fees, arrears, and finance approvals."),
    ("discipline", "PrincipalDisciplineWorkspace", "Discipline", "Serious discipline cases and escalations."),
    ("communication", "PrincipalCommunicationWorkspace", "Communication", "Official school broadcasts and messaging."),
    ("approvals", "PrincipalApprovalsWorkspace", "Approvals", "Central queue for all principal approvals."),
    ("reports", "PrincipalReportsWorkspace", "Reports", "Generate and export school-wide reports."),
    ("settings", "PrincipalSettingsWorkspace", "Settings", "School-level operational configurations."),
    ("teaching", "PrincipalTeachingWorkspace", "My Teaching", "Teacher dashboard for principal's assigned classes."),
]

template = """\"use client\";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function {component_name}() {{
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
          <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="mt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-lg font-semibold text-white">{description}</p>
            <p className="mt-2 text-sm text-white/60">This workspace is currently under construction to match the MyShule production blueprint.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}}
"""

directory = r"c:\Users\user\Desktop\PROJECTS\Shule hub\apps\web\src\components\school\principal-dashboard"

for file_prefix, component_name, title, description in workspaces:
    file_path = os.path.join(directory, f"{file_prefix}-workspace.tsx")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(template.format(component_name=component_name, title=title, description=description))

print("Created 18 workspaces.")
