"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";

export function AcademicSetup({ tenantId }: { tenantId?: string }) {
  const queryClient = useQueryClient();

  const termsQuery = useQuery({
    queryKey: ["academic-terms", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/academics/terms${tenantId ? `?tenant_id=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load terms");
      return res.json();
    },
  });

  const subjectsQuery = useQuery({
    queryKey: ["academic-subjects", tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/academics/subjects${tenantId ? `?tenant_id=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Academic Setup</h2>
        <Button onClick={() => alert("Open create term modal")}>Add Term</Button>
      </div>

      <div className="bg-white rounded-md shadow p-4">
        <h3 className="font-semibold mb-4">Academic Terms</h3>
        {termsQuery.isLoading ? (
          <div>Loading terms...</div>
        ) : (
          <DataTable
            columns={[
              { id: "name", header: "Name", render: (row: any) => row.name },
              { id: "startDate", header: "Start Date", render: (row: any) => new Date(row.start_date).toLocaleDateString() },
              { id: "endDate", header: "End Date", render: (row: any) => new Date(row.end_date).toLocaleDateString() },
            ]}
            rows={termsQuery.data || []}
            getRowKey={(row: any) => row.id}
          />
        )}
      </div>

      <div className="bg-white rounded-md shadow p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Subjects</h3>
          <Button variant="outline" onClick={() => alert("Open add subject modal")}>Add Subject</Button>
        </div>
        {subjectsQuery.isLoading ? (
          <div>Loading subjects...</div>
        ) : (
          <DataTable
            columns={[
              { id: "name", header: "Subject Name", render: (row: any) => row.name },
              { id: "code", header: "Code", render: (row: any) => row.code },
            ]}
            rows={subjectsQuery.data || []}
            getRowKey={(row: any) => row.id}
          />
        )}
      </div>
    </div>
  );
}
