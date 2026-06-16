"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function ExamsReadinessWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.readiness || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "exam", header: "Exam", render: (row) => row.examName },
    { id: "term", header: "Term", render: (row) => row.term },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.isReady ? 'Ready' : 'Pending'} tone={row.isReady ? 'ok' : 'warning'} /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link" disabled={!row.isReady}>Publish</Button> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Exam Readiness</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="Exam Readiness"
        subtitle="Verify all marks are approved and trigger report cards."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
