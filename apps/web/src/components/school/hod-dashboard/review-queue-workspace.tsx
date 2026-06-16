"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function HODReviewQueueWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.reviews || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "teacher", header: "Teacher", render: (row) => row.teacherName },
    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "submittedAt", header: "Submitted At", render: (row) => row.submittedAt },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="warning" /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Review</Button> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Marks Review Queue</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="Marks Review Queue"
        subtitle="Approve or return submitted marks from department teachers."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
