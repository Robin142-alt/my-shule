"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";
import { Button } from "@/components/ui/button";

export function HODDepartmentOverviewWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.overview || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "subject", header: "Subject", render: (row) => row.subjectName },
    { id: "teachers", header: "Allocated Teachers", render: (row) => row.teacherCount },
    { id: "curriculum", header: "Curriculum", render: (row) => row.curriculumScope },
    { id: "status", header: "Status", render: (row) => <StatusPill label={row.isActive ? 'Active' : 'Inactive'} tone="ok" /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Department Overview</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">Refresh</Button>
        <Button size="sm">Add New</Button>
      </div>

      <OpsTable
        title="Department Overview"
        subtitle="View subjects and teachers in the department."
        rows={data}
        columns={columns}
        loading={false}
      />
    </div>
  );
}
