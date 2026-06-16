"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function ExamsAcademicSetupApprovalWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.approvals || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "request", header: "Request", render: (row) => row.requestName },
    { id: "teacher", header: "Teacher", render: (row) => row.teacherName },
    { id: "date", header: "Date", render: (row) => row.date },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Review</Button> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Setup Approvals</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="Setup Approvals"
        subtitle="Approve teacher setups, lock official subject lists."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
