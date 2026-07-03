"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Plus, CheckCircle, HelpCircle, Eye, ShieldAlert, Loader2 } from "lucide-react";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

interface StudentCaseRow {
  id?: string;
  student_id: string;
  exam_series_id: string;
  case_type: string;
  reported_by_user_id: string;
  description?: string;
  status?: string;
  resolution?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

interface StudentOption {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
}

interface ExamSeriesOption {
  id: string;
  name: string;
}

interface CreateStudentCasePayload {
  exam_series_id: string;
  student_id: string;
  case_type: string;
  description: string;
}

function CreateStudentCaseDialog({
  children,
  students,
  examSeries,
  onSuccess,
  onNotice,
}: {
  children: React.ReactNode;
  students: StudentOption[];
  examSeries: ExamSeriesOption[];
  onSuccess: () => unknown;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<CreateStudentCasePayload>({
    exam_series_id: "",
    student_id: "",
    case_type: "",
    description: "",
  });
  const createCase = useSchoolMutation<StudentCaseRow, CreateStudentCasePayload>("/exams/student-cases", "POST");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await createCase.mutateAsync(formData);
      const student = students.find((item) => item.id === formData.student_id);
      onNotice(`Exam case saved for ${student ? `${student.first_name} ${student.last_name}` : "the selected student"}.`);
      onSuccess();
      setFormData({ exam_series_id: "", student_id: "", case_type: "", description: "" });
      setOpen(false);
    } catch {
      // The mutation error remains visible in the dialog for correction and retry.
    }
  }

  const missingSetup = students.length === 0 || examSeries.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Log Student Exam Case</DialogTitle>
            <DialogDescription>
              Record a tenant-scoped exemption, irregularity, disciplinary issue, or examination support need.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {missingSetup ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Add an active student and an exam series before logging an exam case.
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="student-case-student">Student</Label>
              <select
                id="student-case-student"
                required
                value={formData.student_id}
                onChange={(event) => setFormData((current) => ({ ...current, student_id: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.admission_number} - {student.first_name} {student.last_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-case-exam">Exam series</Label>
              <select
                id="student-case-exam"
                required
                value={formData.exam_series_id}
                onChange={(event) => setFormData((current) => ({ ...current, exam_series_id: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select an exam series</option>
                {examSeries.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-case-type">Case type</Label>
              <select
                id="student-case-type"
                required
                value={formData.case_type}
                onChange={(event) => setFormData((current) => ({ ...current, case_type: event.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a case type</option>
                <option value="exemption">Exam exemption</option>
                <option value="irregularity">Exam irregularity</option>
                <option value="disciplinary">Disciplinary issue</option>
                <option value="special_support">Special examination support</option>
                <option value="medical">Medical consideration</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="student-case-description">Description and evidence</Label>
              <Textarea
                id="student-case-description"
                required
                minLength={10}
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe the case, evidence, and immediate action taken."
                rows={5}
              />
            </div>
            {createCase.error ? (
              <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {createCase.error.message || "The exam case could not be saved."}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createCase.isPending || missingSetup}>
              {createCase.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Save Case
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PrincipalGuidanceDialog({ children, cases, initialCaseId, onNotice }: {
  children: React.ReactNode;
  cases: StudentCaseRow[];
  initialCaseId?: string;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [caseId, setCaseId] = useState(initialCaseId ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openCases = cases.filter((item) => item.id && item.status !== "resolved");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await requestDashboardApi(`/api/exams/student-cases/${encodeURIComponent(caseId)}/request-guidance`, { method: "POST", body: { note } });
      onNotice("Principal guidance task and notification created for the selected exam case.");
      setNote("");
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not request principal guidance.");
    } finally {
      setSaving(false);
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>Request Principal Guidance</DialogTitle><DialogDescription>Create a principal task and inbox notification for an open student exam case.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor={`guidance-case-${initialCaseId ?? "select"}`}>Student exam case</Label><select id={`guidance-case-${initialCaseId ?? "select"}`} required disabled={Boolean(initialCaseId)} value={caseId} onChange={(event) => setCaseId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select an open case</option>{openCases.map((item) => <option key={item.id} value={item.id}>{item.student_id} - {item.case_type}</option>)}</select></div><div className="space-y-2"><Label htmlFor={`guidance-note-${initialCaseId ?? "select"}`}>Guidance requested</Label><Textarea id={`guidance-note-${initialCaseId ?? "select"}`} required minLength={10} maxLength={5000} value={note} onChange={(event) => setNote(event.target.value)} rows={4} /></div>{error ? <div role="alert" className="text-sm text-destructive">{error}</div> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || !caseId}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Send to Principal</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function StudentCasesWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: casesResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<StudentCaseRow[]> | StudentCaseRow[]>("/exams/student-cases");
  const { data: studentsResponse } = useSchoolQuery<StudentOption[]>("/students?status=active&limit=200");
  const { data: seriesResponse } = useSchoolQuery<ApiResponse<ExamSeriesOption[]> | ExamSeriesOption[]>("/exams/series");
  const cases = Array.isArray(casesResponse) ? casesResponse : casesResponse?.data;
  const students = Array.isArray(studentsResponse) ? studentsResponse : [];
  const examSeries = Array.isArray(seriesResponse) ? seriesResponse : seriesResponse?.data ?? [];

  function caseKey(row: StudentCaseRow, index: number) {
    return row.id ?? `${row.student_id}-${row.exam_series_id}-${index}`;
  }

  async function resolveCase(row: StudentCaseRow) {
    if (!row.id) {
      setNotice("This case cannot be resolved until it has a persisted case ID.");
      return;
    }
    setSavingAction(`resolve-${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/student-cases/${encodeURIComponent(row.id)}/resolve`, {
        method: "PATCH",
        body: { resolution: "Reviewed and resolved by the exams manager." },
      });
      await refetch();
      setNotice(`Student exam case ${row.id} resolved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not resolve the student exam case.");
    } finally {
      setSavingAction(null);
    }
  }

  function previewCase(row: StudentCaseRow) {
    openPrintDocument({
      eyebrow: "Student exam case",
      title: `Student ${row.student_id}`,
      subtitle: row.case_type,
      rows: [
        { label: "Exam series", value: row.exam_series_id },
        { label: "Reported by", value: row.reported_by_user_id },
        { label: "Case type", value: row.case_type },
        { label: "Description", value: row.description || "No description recorded" },
      ],
      footer: "Case detail preview generated from current school exam case records.",
    });
    setNotice(`Case detail print preview generated for student ${row.student_id}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exceptions"
          title="Student Exam Cases"
          description="Manage exemptions, disciplinary issues, and special needs for exams."
        />
        <div className="flex flex-wrap gap-2">
          <PrincipalGuidanceDialog cases={Array.isArray(cases) ? cases : []} onNotice={setNotice}><Button type="button" variant="outline"><HelpCircle className="mr-2 h-4 w-4" /> Principal Guidance</Button></PrincipalGuidanceDialog>
          <CreateStudentCaseDialog students={students} examSeries={examSeries} onSuccess={refetch} onNotice={setNotice}>
            <Button type="button"><Plus className="mr-2 h-4 w-4" /> Log New Case</Button>
          </CreateStudentCaseDialog>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Case Type</TableHead>
                <TableHead>Reported By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading student cases...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-destructive">
                    Error loading student cases: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!cases || !Array.isArray(cases) || cases.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    <p>No student exam cases have been recorded.</p>
                    <div className="mt-4 flex justify-center">
                      <CreateStudentCaseDialog students={students} examSeries={examSeries} onSuccess={refetch} onNotice={setNotice}>
                        <Button type="button" size="sm"><Plus className="mr-2 h-4 w-4" /> Log First Case</Button>
                      </CreateStudentCaseDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(cases) && cases.map((row, idx) => (
                <TableRow key={caseKey(row, idx)}>
                  <TableCell className="font-medium">Student {row.student_id}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>{row.exam_series_id}</TableCell>
                  <TableCell>Any</TableCell>
                  <TableCell>{row.case_type}</TableCell>
                  <TableCell>{row.reported_by_user_id}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "resolved" ? "success" : "default"}>
                      {row.status === "resolved" ? "Resolved" : row.status ?? "Pending"}
                    </Badge>
                  </TableCell>
                    <TableCell className="text-muted-foreground">{row.resolution || row.description}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => previewCase(row)}><Eye className="mr-2 h-4 w-4" /> View Details</DropdownMenuItem>
                        <DropdownMenuItem disabled={row.status === "resolved" || savingAction === `resolve-${row.id}`} onClick={() => void resolveCase(row)}><CheckCircle className="mr-2 h-4 w-4" /> Resolve Case</DropdownMenuItem>
                        <PrincipalGuidanceDialog cases={Array.isArray(cases) ? cases : []} initialCaseId={row.id} onNotice={setNotice}><DropdownMenuItem asChild><button type="button"><ShieldAlert className="mr-2 h-4 w-4" /> Request Guidance</button></DropdownMenuItem></PrincipalGuidanceDialog>
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
