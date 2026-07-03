"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Copy, Upload, Archive, Edit, Settings, Trash2, CalendarDays, Loader2 } from "lucide-react";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

interface ExamDraftPayload {
  name: string;
  academic_term_id: string;
  starts_on: string;
  ends_on: string;
}

interface ExamAssessment {
  id?: string;
  name: string;
  assessment_type?: string;
  exam_series_id: string;
  subject_id?: string;
  max_score?: number;
  weight?: number;
}

interface ApiResponse<T> {
  data?: T;
}

function parseSetupCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += character;
  }
  values.push(value.trim());
  return values;
}

function CreateExamDialog({ children, onSuccess }: { children: React.ReactNode, onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ExamDraftPayload>({
    name: "",
    academic_term_id: "",
    starts_on: "",
    ends_on: ""
  });
  
  const createMutation = useSchoolMutation<unknown, ExamDraftPayload>("/exams/draft", "POST");
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync(formData);
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      void err;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Exam Series</DialogTitle>
            <DialogDescription>Set up a new examination period.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Exam Name</Label>
              <Input 
                required 
                value={formData.name} 
                onChange={e => setFormData({ ...formData, name: e.target.value })} 
                placeholder="e.g. End of Term 1" 
              />
            </div>
            <div className="space-y-2">
              <Label>Term ID</Label>
              <Input 
                required 
                value={formData.academic_term_id} 
                onChange={e => setFormData({ ...formData, academic_term_id: e.target.value })} 
                placeholder="Term UUID" 
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input 
                type="date" 
                required 
                value={formData.starts_on} 
                onChange={e => setFormData({ ...formData, starts_on: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input 
                type="date" 
                required 
                value={formData.ends_on} 
                onChange={e => setFormData({ ...formData, ends_on: e.target.value })} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Exam
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAssessmentDialog({ assessment, onClose, onSave }: { assessment: ExamAssessment | null; onClose: () => void; onSave: (value: { name: string; max_score: number; weight: number }) => Promise<void> }) {
  const [name, setName] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("1");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!assessment) return;
    setName(assessment.name);
    setMaxScore(String(assessment.max_score ?? 100));
    setWeight(String(assessment.weight ?? 1));
    setFormError(null);
  }, [assessment]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || Number(maxScore) <= 0 || Number(weight) <= 0) {
      setFormError("Name, maximum score, and weight must be valid positive values.");
      return;
    }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), max_score: Number(maxScore), weight: Number(weight) });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not update the assessment.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={Boolean(assessment)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>Edit Assessment</DialogTitle><DialogDescription>Update the persisted assessment name, score ceiling, and weighting.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor="edit-assessment-name">Name</Label><Input id="edit-assessment-name" value={name} onChange={(event) => setName(event.target.value)} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="edit-assessment-max">Maximum score</Label><Input id="edit-assessment-max" type="number" min="0.01" step="0.01" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="edit-assessment-weight">Weight</Label><Input id="edit-assessment-weight" type="number" min="0.0001" step="0.0001" value={weight} onChange={(event) => setWeight(event.target.value)} required /></div></div>{formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Save Assessment</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function ExamSetupWorkspace({ model }: { model: unknown }) {
  void model;
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [editingAssessment, setEditingAssessment] = useState<ExamAssessment | null>(null);
  const { data: assessmentsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<ExamAssessment[]> | ExamAssessment[]>("/exams/assessments");
  const assessmentSource = Array.isArray(assessmentsResponse) ? assessmentsResponse : assessmentsResponse?.data;
  const assessments = Array.isArray(assessmentSource) ? assessmentSource : [];
  const routeTo = (workspace: string) => router.push(`/school/exams-manager/${workspace}`);

  function examKey(exam: ExamAssessment, index: number) {
    return exam.id ?? `${exam.exam_series_id}-${exam.name}-${index}`;
  }

  async function duplicateExam(exam: ExamAssessment) {
    if (!exam.exam_series_id || !exam.subject_id) {
      setNotice("Select a persisted assessment with a subject before duplicating it.");
      return;
    }
    setSavingAction(`duplicate:${exam.id ?? exam.name}`);
    try {
      await requestDashboardApi("/api/exams/assessments", {
        method: "POST",
        body: {
          exam_series_id: exam.exam_series_id,
          subject_id: exam.subject_id,
          name: `${exam.name} Copy`,
          max_score: Number(exam.max_score ?? 100),
          weight: Number(exam.weight ?? 1),
        },
      });
      await refetch();
      setNotice(`${exam.name} duplicated as a persisted assessment copy.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not duplicate the assessment.");
    } finally {
      setSavingAction(null);
    }
  }

  async function importExamSetup(file: File | null | undefined) {
    if (!file) return;
    setSavingAction("import-setup");
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error("The setup CSV must include a header and at least one assessment row.");
      const headers = parseSetupCsvLine(lines[0]).map((header) => header.toLowerCase());
      const required = ["exam_series_id", "subject_id", "name", "max_score", "weight"];
      const missing = required.filter((header) => !headers.includes(header));
      if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}.`);

      let imported = 0;
      const failures: string[] = [];
      for (let index = 1; index < lines.length; index += 1) {
        const values = parseSetupCsvLine(lines[index]);
        const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
        try {
          await requestDashboardApi("/api/exams/assessments", {
            method: "POST",
            body: {
              exam_series_id: row.exam_series_id,
              subject_id: row.subject_id,
              name: row.name,
              max_score: Number(row.max_score),
              weight: Number(row.weight),
            },
          });
          imported += 1;
        } catch (error) {
          failures.push(`row ${index + 1}: ${error instanceof Error ? error.message : "save failed"}`);
        }
      }
      await refetch();
      setNotice(failures.length
        ? `Imported ${imported} assessment(s). ${failures.length} failed: ${failures.slice(0, 3).join("; ")}`
        : `Imported ${imported} assessment(s) from ${file.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import exam setup.");
    } finally {
      setSavingAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function archiveExamSeries(exam: ExamAssessment) {
    if (!exam.exam_series_id) {
      setNotice("Select a persisted exam series before archiving.");
      return;
    }
    setSavingAction(`archive:${exam.exam_series_id}`);
    try {
      await requestDashboardApi("/api/exams/lifecycle", {
        method: "POST",
        body: { id: exam.exam_series_id, status: "archived" },
      });
      await refetch();
      setNotice(`${exam.name} exam series archived.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not archive the exam series.");
    } finally {
      setSavingAction(null);
    }
  }

  async function saveAssessment(value: { name: string; max_score: number; weight: number }) {
    if (!editingAssessment?.id) throw new Error("Select a persisted assessment to edit.");
    await requestDashboardApi(`/api/exams/assessments/${encodeURIComponent(editingAssessment.id)}`, { method: "PATCH", body: value });
    await refetch();
    setNotice(`${value.name} assessment updated.`);
  }

  async function deleteDraftAssessment(exam: ExamAssessment) {
    if (!exam.id || !window.confirm(`Delete draft assessment ${exam.name}?`)) return;
    setSavingAction(`delete:${exam.id}`);
    try {
      await requestDashboardApi(`/api/exams/assessments/${encodeURIComponent(exam.id)}`, { method: "DELETE" });
      await refetch();
      setNotice(`${exam.name} draft assessment deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete the draft assessment.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Exam Configuration"
          title="Exam Setup"
          description="Create and manage exam sessions, assessment weights, and entry rules."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => fileInputRef.current?.click()}>{savingAction === "import-setup" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import Setup</Button>
          <input ref={fileInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void importExamSetup(event.target.files?.[0])} />
          <Button variant="outline" onClick={() => assessments[0] ? void duplicateExam(assessments[0]) : setNotice("Create an exam before duplicating setup.")}><Copy className="mr-2 h-4 w-4" /> Duplicate</Button>
          <Button variant="outline" disabled={!!savingAction || !assessments[0]} onClick={() => assessments[0] && void archiveExamSeries(assessments[0])}>
            {savingAction?.startsWith("archive:") ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Archive className="mr-2 h-4 w-4" />}
            Archive
          </Button>
          <CreateExamDialog onSuccess={refetch}>
            <Button type="button"><Plus className="mr-2 h-4 w-4" /> Create Exam</Button>
          </CreateExamDialog>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Exam Name</TableHead>
                <TableHead>Series</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Maximum Score</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading exam configuration...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading setup: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!assessments || assessments.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No exam configurations found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && assessments.map((exam, idx) => (
                <TableRow key={examKey(exam, idx)}>
                  <TableCell className="font-medium">{exam.name}</TableCell>
                  <TableCell className="whitespace-nowrap">{exam.exam_series_id}</TableCell>
                  <TableCell>{exam.subject_id || "Not assigned"}</TableCell>
                  <TableCell>{exam.max_score ?? "-"}</TableCell>
                  <TableCell>{exam.weight ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">Configured</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!exam.id} onClick={() => setEditingAssessment(exam)}><Edit className="mr-2 h-4 w-4" /> Edit Configuration</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => routeTo("exam-classes")}><Settings className="mr-2 h-4 w-4" /> Configure Subjects</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => routeTo("marks-monitor")}><CalendarDays className="mr-2 h-4 w-4" /> Marks Window</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void duplicateExam(exam)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" disabled={!exam.id || !!savingAction} onClick={() => void deleteDraftAssessment(exam)}><Trash2 className="mr-2 h-4 w-4" /> Delete Draft</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      <EditAssessmentDialog assessment={editingAssessment} onClose={() => setEditingAssessment(null)} onSave={saveAssessment} />
    </div>
  );
}
