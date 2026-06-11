"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsInterviewsWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.interviews || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "date", header: "Date", render: (row) => row.interviewDate },
    { id: "applicant", header: "Applicant", render: (row) => row.applicationId },
    { id: "interviewer", header: "Interviewer", render: (row) => row.interviewerName || "Pending" }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Interviews & Assessments</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Interviews & Assessments"
        subtitle="Scheduled interviews for applicants."
        rows={data}
        columns={columns}
        loading={false}
        getRowId={(row) => row.id}
        totalRows={data.length}
        page={1}
        pageSize={10}
        onPageChange={() => {}}
      />
    </div>
  );
}
