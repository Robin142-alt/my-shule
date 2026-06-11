"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsParentsWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.parents || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "name", header: "Parent Name", render: (row) => row.parentName },
    { id: "phone", header: "Phone Number", render: (row) => row.parentPhone },
    { id: "email", header: "Email", render: (row) => row.parentEmail || "N/A" }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Parents & Guardians</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Parents & Guardians"
        subtitle="Linked guardian contacts and records."
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
