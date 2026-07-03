"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Copy, Users, BookOpen, Trash2, UserPlus, Eye, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

interface SubjectWeightingRow {
  id?: string;
  subject_id: string;
  weight?: number;
  is_compulsory?: boolean;
}

interface ApiResponse<T> {
  data?: T;
}

export function ExamClassesWorkspace({ model }: { model: unknown }) {
  void model;
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: weightingsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<SubjectWeightingRow[]> | SubjectWeightingRow[]>("/exams/subject-weightings");
  const weightingsSource = Array.isArray(weightingsResponse) ? weightingsResponse : weightingsResponse?.data;
  const weightings = Array.isArray(weightingsSource) ? weightingsSource : [];
  const routeTo = (workspace: string) => router.push(`/school/exams-manager/${workspace}`);

  function rowKey(row: SubjectWeightingRow, index: number) {
    return row.id ?? `${row.subject_id}-${index}`;
  }

  async function removeSubjectWeighting(row: SubjectWeightingRow) {
    if (!row.id) {
      setNotice("Only persisted subject weightings can be removed. Open Exam Setup to save this configuration first.");
      return;
    }

    setSavingAction(`remove:${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/subject-weightings/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      await refetch();
      setNotice(`Subject ${row.subject_id} removed from this exam class configuration.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not remove the subject weighting.");
    } finally {
      setSavingAction(null);
    }
  }

  function previewClassSetup(row: SubjectWeightingRow, title: string) {
    openPrintDocument({
      eyebrow: "Exam class setup",
      title,
      subtitle: `Subject ${row.subject_id}`,
      rows: [
        { label: "Subject ID", value: row.subject_id },
        { label: "Weight", value: `${row.weight ?? "Unset"}` },
        { label: "Compulsory", value: row.is_compulsory ? "Yes" : "No" },
        { label: "Status", value: "Configured" },
      ],
      footer: "Generated from current tenant-scoped subject weighting records.",
    });
    setNotice(`${title} print preview generated for subject ${row.subject_id}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Scope"
          title="Exam Classes & Subjects"
          description="Define participating classes, subjects, and assigned teachers."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => routeTo("exam-setup")}><Copy className="mr-2 h-4 w-4" /> Copy From Previous</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => routeTo("marks-monitor")}><UserPlus className="mr-2 h-4 w-4" /> Assign Teachers</Button>
          <Button disabled={!!savingAction} onClick={() => routeTo("exam-setup")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Class
          </Button>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Stream</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead>Subjects</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Setup Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading subjects configuration...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading subjects: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!weightings || weightings.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No classes or subjects configured yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && weightings.map((row, idx) => (
                <TableRow key={rowKey(row, idx)}>
                  <TableCell className="font-medium">Class/Subject Setup</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>Standard</TableCell>
                  <TableCell>Subject ID: {row.subject_id}</TableCell>
                  <TableCell>Weight: {row.weight}</TableCell>
                  <TableCell>Compulsory: {row.is_compulsory ? 'Yes' : 'No'}</TableCell>
                  <TableCell>
                    <Badge variant="default">Configured</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => previewClassSetup(row, "Class setup detail")}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => routeTo("exam-setup")}><BookOpen className="mr-2 h-4 w-4" /> Manage Subjects</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => routeTo("marks-monitor")}><UserPlus className="mr-2 h-4 w-4" /> Assign Subject Teachers</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => previewClassSetup(row, "Student list context")}><Users className="mr-2 h-4 w-4" /> View Students</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" disabled={savingAction === `remove:${row.id}`} onClick={() => void removeSubjectWeighting(row)}>
                          {savingAction === `remove:${row.id}` ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                          Remove Class
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
