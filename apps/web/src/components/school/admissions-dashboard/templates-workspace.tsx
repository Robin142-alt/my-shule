"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsTemplatesWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.templates || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "name", header: "Template Name", render: (row) => row.templateName },
    { id: "type", header: "Type", render: (row) => row.type },
    { id: "subject", header: "Subject", render: (row) => row.subject }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Admission Templates</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Admission Templates"
        subtitle="Letter and email templates."
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
