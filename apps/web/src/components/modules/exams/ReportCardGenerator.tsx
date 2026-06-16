"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

interface ReportCardGeneratorProps {
  tenantId?: string;
  examSeriesId: string;
}

export function ReportCardGenerator({ tenantId, examSeriesId }: ReportCardGeneratorProps) {
  const queryClient = useQueryClient();
  const [generateError, setGenerateError] = useState<string | null>(null);

  const readinessQuery = useQuery({
    queryKey: ["exam-readiness", tenantId, examSeriesId],
    queryFn: async () => {
      const res = await fetch(`/api/exams/series/${examSeriesId}/readiness${tenantId ? `?tenant_id=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load readiness status");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerateError(null);
      const res = await fetch(`/api/exams/series/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_series_id: examSeriesId,
          tenant_id: tenantId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to generate report cards");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-readiness", tenantId, examSeriesId] });
      alert("Report cards generated and exam series published successfully!");
    },
    onError: (err: any) => {
      setGenerateError(err.message);
    }
  });

  if (readinessQuery.isLoading) return <div>Checking exam readiness...</div>;
  if (readinessQuery.isError) return <div className="text-red-500">Error loading readiness.</div>;

  const readiness = readinessQuery.data;

  return (
    <div className="space-y-4 bg-white p-6 rounded shadow border">
      <h3 className="font-semibold text-lg">Generate Report Cards</h3>
      
      {!readiness.ready ? (
        <div className="bg-red-50 p-4 border border-red-200 rounded text-red-800">
          <p className="font-medium mb-2">Exam Series is NOT ready for publishing.</p>
          <ul className="list-disc ml-5 text-sm space-y-1">
            {readiness.issues.map((issue: string, idx: number) => (
              <li key={idx}>{issue}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-green-50 p-4 border border-green-200 rounded text-green-800">
          <p className="font-medium">All marks are approved. The exam series is ready for report card generation.</p>
        </div>
      )}

      {generateError && (
        <div className="text-red-600 text-sm mt-2 font-medium">
          Error: {generateError}
        </div>
      )}

      <div className="pt-4 border-t">
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={!readiness.ready || generateMutation.isPending}
          className="w-full sm:w-auto"
        >
          {generateMutation.isPending ? "Generating..." : "Generate & Publish Report Cards"}
        </Button>
        <p className="text-xs text-gray-500 mt-2">
          This action will lock all marks and make report cards available to parents and students.
        </p>
      </div>
    </div>
  );
}
