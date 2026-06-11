"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { OpsTable, type OpsTableColumn } from "@/components/modules/shared/ops-table";
import { StatusPill } from "@/components/ui/status-pill";

export function AdmissionsDocumentsWorkspace({ dataset }: { dataset?: any }) {
  const data = dataset?.documents || [];

  const columns: OpsTableColumn<any>[] = [

    { id: "applicant", header: "Applicant ID", render: (row) => row.applicationId },
    { id: "document", header: "Document Type", render: (row) => row.documentType },
    { id: "status", header: "Verification", render: (row) => <StatusPill label={row.verificationStatus} tone={row.verificationStatus === "verified" ? "ok" : "critical"} /> }

  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Documents</div>
          <div className="mt-2 text-2xl font-black text-white">{data.length}</div>
        </Card>
      </div>

      <OpsTable
        title="Documents"
        subtitle="Verification queue for uploaded documents."
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
