"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";

interface MarksEntryTableProps {
  tenantId?: string;
  examSeriesId: string;
  assessmentId: string;
  classSectionId: string;
  subjectId: string;
  academicTermId: string;
}

export function MarksEntryTable({
  tenantId,
  examSeriesId,
  assessmentId,
  classSectionId,
  subjectId,
  academicTermId,
}: MarksEntryTableProps) {
  const queryClient = useQueryClient();
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<string>("");

  const marksQuery = useQuery({
    queryKey: ["exam-marks", tenantId, examSeriesId, subjectId, classSectionId],
    queryFn: async () => {
      const res = await fetch(`/api/exams/marks?exam_series_id=${examSeriesId}&subject_id=${subjectId}&class_section_id=${classSectionId}${tenantId ? `&tenant_id=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load marks");
      return res.json();
    },
  });

  const enterMarkMutation = useMutation({
    mutationFn: async ({ studentId, score }: { studentId: string; score: number }) => {
      const res = await fetch(`/api/exams/marks/enter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exam_series_id: examSeriesId,
          assessment_id: assessmentId,
          academic_term_id: academicTermId,
          class_section_id: classSectionId,
          subject_id: subjectId,
          student_id: studentId,
          score,
          tenant_id: tenantId,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save mark");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-marks", tenantId, examSeriesId, subjectId, classSectionId] });
      setEditingStudentId(null);
      setEditScore("");
    },
    onError: (err: any) => {
      toast.error(`Error saving mark: ${err.message}`);
    }
  });

  const handleSave = (studentId: string) => {
    const score = Number(editScore);
    if (isNaN(score) || score < 0) {
      toast.error("Please enter a valid positive number for the score.");
      return;
    }
    enterMarkMutation.mutate({ studentId, score });
  };

  return (
    <Card className="p-5 space-y-4">
      <h3 className="font-semibold text-lg text-foreground">Marks Entry</h3>
      {marksQuery.isLoading ? (
        <div className="h-32 flex items-center justify-center border rounded-[var(--radius)]">Loading marks...</div>
      ) : (
        <DataTable
          columns={[
            { id: "student", header: "Student", render: (row: any) => row.student_name || row.student_id },
            { 
              id: "score", 
              header: "Score", 
              render: (row: any) => {
                if (editingStudentId === row.student_id) {
                  return (
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        value={editScore}
                        onChange={(e) => setEditScore(e.target.value)}
                        className="input-base w-20"
                      />
                      <Button size="sm" onClick={() => handleSave(row.student_id)} disabled={enterMarkMutation.isPending}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingStudentId(null)}>Cancel</Button>
                    </div>
                  );
                }
                return row.score ?? "-";
              }
            },
            {
              id: "status",
              header: "Status",
              render: (row: any) => row.status || "Draft"
            },
            {
              id: "actions",
              header: "Actions",
              render: (row: any) => (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingStudentId(row.student_id);
                    setEditScore(row.score?.toString() || "");
                  }}
                  disabled={row.status === "locked" || row.status === "published" || row.status === "reviewed"}
                >
                  Edit
                </Button>
              )
            }
          ]}
          rows={marksQuery.data?.items || []}
          getRowKey={(row: any) => row.id || row.student_id}
        />
      )}
    </Card>
  );
}
