"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function TeacherSubjectAllocationsWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.allocations || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "role", header: "Role", render: (row) => row.role },
    { id: "canEnterMarks", header: "Mark Entry", render: (row) => <StatusPill label={row.canEnterMarks ? 'Allowed' : 'Restricted'} tone={row.canEnterMarks ? 'ok' : 'critical'} /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Subject Allocations</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="Subject Allocations"
        subtitle="View assigned classes and roles."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
