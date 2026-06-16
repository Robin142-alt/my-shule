"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function TeacherAcademicSetupWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.setups || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "subject", header: "Subject/Learning Area", render: (row) => row.subjectName },
    { id: "class", header: "Class", render: (row) => row.className },
    { id: "curriculum", header: "Curriculum", render: (row) => row.curriculumType },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.status || 'Pending'} tone={row.status === 'Approved' ? 'ok' : 'warning'} /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Academic Setup</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="Academic Setup"
        subtitle="Request or define subjects, classes, and streams."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
