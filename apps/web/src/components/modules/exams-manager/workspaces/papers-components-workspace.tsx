"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Copy, Upload, Edit, Trash2, Settings, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

interface AssessmentComponentRow {
  id?: string;
  assessment_id: string;
  component_name: string;
  component_code: string;
  max_score: number;
  weight: number;
}

interface AssessmentRow {
  id?: string;
  name?: string;
}

interface ApiResponse<T> {
  data?: T;
}

interface ComponentFormValue {
  assessment_id: string;
  component_name: string;
  component_code: string;
  max_score: string;
  weight: string;
}

function readRows<T>(response: ApiResponse<T[]> | T[] | undefined): T[] {
  const rows = Array.isArray(response) ? response : response?.data;
  return Array.isArray(rows) ? rows : [];
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
}

function ComponentDialog({
  open,
  component,
  assessments,
  onClose,
  onSave,
}: {
  open: boolean;
  component: AssessmentComponentRow | null;
  assessments: AssessmentRow[];
  onClose: () => void;
  onSave: (value: ComponentFormValue) => Promise<void>;
}) {
  const [form, setForm] = useState<ComponentFormValue>({
    assessment_id: "",
    component_name: "",
    component_code: "",
    max_score: "100",
    weight: "100",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      assessment_id: component?.assessment_id ?? assessments.find((row) => row.id)?.id ?? "",
      component_name: component?.component_name ?? "",
      component_code: component?.component_code ?? "",
      max_score: String(component?.max_score ?? 100),
      weight: String(component?.weight ?? 100),
    });
    setFormError(null);
  }, [open, component, assessments]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const maxScore = Number(form.max_score);
    const weight = Number(form.weight);
    if (!form.assessment_id || !form.component_name.trim() || !form.component_code.trim()) {
      setFormError("Assessment, component name, and component code are required.");
      return;
    }
    if (!Number.isFinite(maxScore) || maxScore <= 0 || !Number.isFinite(weight) || weight <= 0 || weight > 100) {
      setFormError("Maximum score must be positive and weight must be between 0 and 100.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save the assessment component.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{component?.id ? "Edit component" : "Add assessment component"}</DialogTitle>
            <DialogDescription>Configure the paper code, score ceiling, and contribution to the assessment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="component-assessment">Assessment</Label>
              <select
                id="component-assessment"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.assessment_id}
                disabled={Boolean(component?.id)}
                onChange={(event) => setForm((current) => ({ ...current, assessment_id: event.target.value }))}
                required
              >
                <option value="">Select assessment</option>
                {assessments.filter((row): row is AssessmentRow & { id: string } => Boolean(row.id)).map((row) => (
                  <option key={row.id} value={row.id}>{row.name || row.id}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="component-name">Component name</Label>
                <Input id="component-name" value={form.component_name} onChange={(event) => setForm((current) => ({ ...current, component_name: event.target.value }))} placeholder="Paper 1 Theory" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component-code">Component code</Label>
                <Input id="component-code" value={form.component_code} onChange={(event) => setForm((current) => ({ ...current, component_code: event.target.value.toUpperCase() }))} placeholder="P1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component-max-score">Maximum score</Label>
                <Input id="component-max-score" type="number" min="0.01" step="0.01" value={form.max_score} onChange={(event) => setForm((current) => ({ ...current, max_score: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="component-weight">Weight (%)</Label>
                <Input id="component-weight" type="number" min="0.01" max="100" step="0.01" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} required />
              </div>
            </div>
            {formError ? <p role="alert" className="text-sm font-medium text-destructive">{formError}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save component
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PapersComponentsWorkspace({ model }: { model: unknown }) {
  void model;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<AssessmentComponentRow | null>(null);
  const { data: componentsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<AssessmentComponentRow[]> | AssessmentComponentRow[]>("/exams/assessment-components");
  const { data: assessmentsResponse } = useSchoolQuery<ApiResponse<AssessmentRow[]> | AssessmentRow[]>("/exams/assessments");
  const components = readRows(componentsResponse);
  const assessments = readRows(assessmentsResponse);

  function openCreate(component: AssessmentComponentRow | null = null) {
    setSelectedComponent(component);
    setDialogOpen(true);
  }

  async function saveComponent(value: ComponentFormValue) {
    const editing = Boolean(selectedComponent?.id);
    const endpoint = editing
      ? `/api/exams/assessment-components/${encodeURIComponent(selectedComponent!.id!)}`
      : "/api/exams/assessment-components";
    await requestDashboardApi(endpoint, {
      method: editing ? "PATCH" : "POST",
      body: {
        ...value,
        max_score: Number(value.max_score),
        weight: Number(value.weight),
      },
    });
    await refetch();
    setNotice(`${value.component_name} ${editing ? "updated" : "created"}.`);
  }

  async function duplicateComponent(row: AssessmentComponentRow) {
    setSavingAction(`duplicate:${row.id ?? row.component_code}`);
    try {
      await requestDashboardApi("/api/exams/assessment-components", {
        method: "POST",
        body: {
          assessment_id: row.assessment_id,
          component_name: `${row.component_name} Copy`,
          component_code: `${row.component_code}-COPY-${Date.now().toString().slice(-5)}`,
          max_score: Number(row.max_score),
          weight: Number(row.weight),
        },
      });
      await refetch();
      setNotice(`${row.component_name} duplicated and saved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not duplicate the component.");
    } finally {
      setSavingAction(null);
    }
  }

  async function deleteComponent(row: AssessmentComponentRow) {
    if (!row.id || !window.confirm(`Delete ${row.component_name}? Existing marks that depend on this component may block deletion.`)) return;
    setSavingAction(`delete:${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/assessment-components/${encodeURIComponent(row.id)}`, { method: "DELETE" });
      await refetch();
      setNotice(`${row.component_name} deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete the component.");
    } finally {
      setSavingAction(null);
    }
  }

  async function importComponents(file: File | null | undefined) {
    if (!file) return;
    setSavingAction("import");
    try {
      const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
      if (lines.length < 2) throw new Error("The CSV must include a header and at least one component row.");
      const headers = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
      const requiredHeaders = ["assessment_id", "component_code", "component_name", "max_score", "weight"];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
      if (missingHeaders.length) throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}.`);

      let imported = 0;
      const failures: string[] = [];
      for (let index = 1; index < lines.length; index += 1) {
        const values = parseCsvLine(lines[index]);
        const row = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
        try {
          await requestDashboardApi("/api/exams/assessment-components", {
            method: "POST",
            body: {
              assessment_id: row.assessment_id,
              component_code: row.component_code,
              component_name: row.component_name,
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
        ? `Imported ${imported} component(s). ${failures.length} failed: ${failures.slice(0, 3).join("; ")}`
        : `Imported ${imported} component(s) from ${file.name}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import assessment components.");
    } finally {
      setSavingAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader eyebrow="Exam Setup" title="Papers & Components" description="Configure paper structures, score ceilings, and assessment weighting." />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={Boolean(savingAction)} onClick={() => fileInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import CSV</Button>
          <input ref={fileInputRef} className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => void importComponents(event.target.files?.[0])} />
          <Button variant="outline" disabled={components.length === 0 || Boolean(savingAction)} onClick={() => { const first = components[0]; if (first) openCreate({ ...first, id: undefined, component_name: `${first.component_name} Copy`, component_code: `${first.component_code}-COPY` }); }}><Copy className="mr-2 h-4 w-4" /> Copy Structure</Button>
          <Button variant="outline" disabled={Boolean(savingAction)} onClick={() => fileInputRef.current?.click()}><Settings className="mr-2 h-4 w-4" /> Bulk Configure</Button>
          <Button disabled={Boolean(savingAction) || assessments.length === 0} onClick={() => openCreate()}><Plus className="mr-2 h-4 w-4" /> Add Component</Button>
        </div>
      </div>

      {notice ? <div role="status" className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {assessments.length === 0 && !isLoading ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Create an exam assessment before adding paper components.</div> : null}

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead>Component</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Maximum score</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={7} className="py-10 text-center"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />Loading components...</TableCell></TableRow> : null}
              {error ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-destructive">Error loading components: {error.message}</TableCell></TableRow> : null}
              {!isLoading && !error && components.length === 0 ? <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No paper components exist yet. Add a component or import a CSV to configure the first assessment.</TableCell></TableRow> : null}
              {!isLoading && !error ? components.map((row) => (
                <TableRow key={row.id ?? `${row.assessment_id}-${row.component_code}`}>
                  <TableCell className="font-medium">{assessments.find((assessment) => assessment.id === row.assessment_id)?.name ?? row.assessment_id}</TableCell>
                  <TableCell>{row.component_name}</TableCell>
                  <TableCell>{row.component_code}</TableCell>
                  <TableCell>{row.max_score}</TableCell>
                  <TableCell>{row.weight}%</TableCell>
                  <TableCell><Badge variant="outline">Configured</Badge></TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${row.component_name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openCreate(row)}><Edit className="mr-2 h-4 w-4" /> Edit Component</DropdownMenuItem>
                        <DropdownMenuItem disabled={Boolean(savingAction)} onClick={() => void duplicateComponent(row)}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" disabled={!row.id || Boolean(savingAction)} onClick={() => void deleteComponent(row)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ComponentDialog open={dialogOpen} component={selectedComponent} assessments={assessments} onClose={() => setDialogOpen(false)} onSave={saveComponent} />
    </div>
  );
}
