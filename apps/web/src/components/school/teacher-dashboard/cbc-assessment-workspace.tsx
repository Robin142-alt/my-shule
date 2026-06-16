"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function TeacherCBCAssessmentWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.cbc || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "student", header: "Student", render: (row) => row.studentName },
    { id: "strand", header: "Strand", render: (row) => row.strandName },
    { id: "level", header: "Level", render: (row) => row.level },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status} tone="info" /> },
    { id: "action", header: "Action", render: (row) => <Button variant="link">Assess</Button> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total CBC Assessment Entry</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="CBC Assessment Entry"
        subtitle="Interface for rubric descriptors and comments."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
