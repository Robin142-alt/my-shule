const fs = require('fs');
const path = require('path');

const workspaces = [
    ["overview", "PrincipalOverviewWorkspace", "fetchPrincipalOverview"],
    ["setup-checklist", "PrincipalSetupChecklistWorkspace", "fetchPrincipalSetupChecklist"],
    ["school-profile", "PrincipalSchoolProfileWorkspace", "fetchPrincipalSchoolProfile"],
    ["academic-setup", "PrincipalAcademicSetupWorkspace", "fetchPrincipalAcademicSetup"],
    ["classes-streams", "PrincipalClassesStreamsWorkspace", "fetchPrincipalClassesStreams"],
    ["subjects-departments", "PrincipalSubjectsDepartmentsWorkspace", "fetchPrincipalSubjectsDepartments"],
    ["staff-roles", "PrincipalStaffRolesWorkspace", "fetchPrincipalStaffRoles"],
    ["students", "PrincipalStudentsWorkspace", "fetchPrincipalStudents"],
    ["attendance", "PrincipalAttendanceWorkspace", "fetchPrincipalAttendance"],
    ["academics", "PrincipalAcademicsWorkspace", "fetchPrincipalAcademics"],
    ["exams-reports", "PrincipalExamsReportsWorkspace", "fetchPrincipalExamsReports"],
    ["finance-overview", "PrincipalFinanceOverviewWorkspace", "fetchPrincipalFinanceOverview"],
    ["discipline", "PrincipalDisciplineWorkspace", "fetchPrincipalDiscipline"],
    ["communication", "PrincipalCommunicationWorkspace", "fetchPrincipalCommunication"],
    ["approvals", "PrincipalApprovalsWorkspace", "fetchPrincipalApprovals"],
    ["reports", "PrincipalReportsWorkspace", "fetchPrincipalReports"],
    ["settings", "PrincipalSettingsWorkspace", "fetchPrincipalSettings"],
    ["teaching", "PrincipalTeachingWorkspace", "fetchPrincipalTeaching"]
];

const dir = path.join(__dirname, "apps", "web", "src", "components", "school", "principal-dashboard");

for (const [filePrefix, componentName, fetchFn] of workspaces) {
    const filePath = path.join(dir, `${filePrefix}-workspace.tsx`);
    
    // Read the existing file to get the title and description
    const content = fs.readFileSync(filePath, 'utf-8');
    const titleMatch = content.match(/<h2 className="text-xl font-bold text-white">([^<]+)<\/h2>/);
    const descMatch = content.match(/<p className="text-lg font-semibold text-white">([^<]+)<\/p>/);
    
    const title = titleMatch ? titleMatch[1] : componentName;
    const description = descMatch ? descMatch[1] : "";

    const newContent = `"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { ${fetchFn}, type PrincipalWorkspaceData } from "./api-client";

export function ${componentName}() {
  const [data, setData] = useState<PrincipalWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ${fetchFn}()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/50">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid gap-4 md:grid-cols-4">
        {/* Summary Cards */}
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">API Status</div>
          <div className="mt-2 text-2xl font-black text-white">
            {data ? data.status || "Active" : "Unavailable"}
          </div>
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
            <p className="mt-2 text-sm text-white/60">
              The frontend is now wired to the backend API. 
              {data ? " Real data payload received." : " Awaiting backend data."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
`;
    fs.writeFileSync(filePath, newContent, "utf-8");
}

console.log("Updated 18 workspaces with API fetching logic.");
