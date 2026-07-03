"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Plus, Copy, Download, Upload, CheckCircle, Edit, Trash2, AlignLeft, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";

interface GradingPolicyRow {
  id?: string;
  name?: string;
  reporting_mode?: string;
  status?: string;
  created_at?: string;
}

interface ApiResponse<T> {
  data?: T;
}

interface GradingBoundaryRow {
  id?: string;
  label: string;
  min_score: number;
  max_score: number;
  points?: number | null;
  descriptor?: string | null;
}

const tabs = ["Standard Grading", "CBC Rubrics", "Subject Specific", "Report Descriptors"] as const;

function reportingModeForTab(tab: (typeof tabs)[number]) {
  if (tab === "CBC Rubrics") return "cbc_competency";
  if (tab === "Subject Specific" || tab === "Report Descriptors") return "hybrid";
  return "traditional";
}

function policyKey(row: GradingPolicyRow, index: number) {
  return row.id ?? `${row.name ?? "policy"}-${row.created_at ?? "date"}-${index}`;
}

function PolicyDialog({
  policy,
  open,
  onOpenChange,
  activeTab,
  onSave,
  saving,
}: {
  policy: GradingPolicyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: (typeof tabs)[number];
  onSave: (payload: { name: string; reporting_mode: string }, policy?: GradingPolicyRow | null) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [reportingMode, setReportingMode] = useState(reportingModeForTab(activeTab));

  function reset() {
    setName(policy?.name ?? "");
    setReportingMode(policy?.reporting_mode ?? reportingModeForTab(activeTab));
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave({ name, reporting_mode: reportingMode }, policy);
          }}
        >
          <DialogHeader>
            <DialogTitle>{policy?.id ? "Edit Grading Scale" : "Create Grading Scale"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Scale Name</Label>
              <Input required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. CBC Grade 7 Rubric" />
            </div>
            <div className="space-y-2">
              <Label>Reporting Mode</Label>
              <Input required value={reportingMode} onChange={(event) => setReportingMode(event.target.value)} placeholder="traditional, cbc_competency, or hybrid" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Scale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DescriptorEditorDialog({ descriptorPolicy, onClose, onNotice }: { descriptorPolicy: GradingPolicyRow | null; onClose: () => void; onNotice: (message: string) => void }) {
  const [boundaries, setBoundaries] = useState<GradingBoundaryRow[]>([]);
  const [editingBoundary, setEditingBoundary] = useState<GradingBoundaryRow | null>(null);
  const [label, setLabel] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [points, setPoints] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBoundaries() {
    if (!descriptorPolicy?.id) return;
    const response = await requestDashboardApi<ApiResponse<GradingBoundaryRow[]> | GradingBoundaryRow[]>(`/api/exams/grading-policies/${encodeURIComponent(descriptorPolicy.id)}/boundaries`);
    const rows = Array.isArray(response) ? response : response.data;
    setBoundaries(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    if (!descriptorPolicy?.id) return;
    setError(null);
    void loadBoundaries().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load grading boundaries."));
  }, [descriptorPolicy?.id]);

  function resetForm(boundary: GradingBoundaryRow | null = null) {
    setEditingBoundary(boundary);
    setLabel(boundary?.label ?? "");
    setMinScore(String(boundary?.min_score ?? 0));
    setMaxScore(String(boundary?.max_score ?? 100));
    setPoints(boundary?.points === null || boundary?.points === undefined ? "" : String(boundary.points));
    setDescriptor(boundary?.descriptor ?? "");
    setError(null);
  }

  async function saveBoundary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!descriptorPolicy?.id) return;
    const min = Number(minScore);
    const max = Number(maxScore);
    if (!label.trim() || !Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
      setError("Enter a label and a valid non-overlapping score range.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const endpoint = editingBoundary?.id
        ? `/api/exams/grading-policy-boundaries/${encodeURIComponent(editingBoundary.id)}`
        : `/api/exams/grading-policies/${encodeURIComponent(descriptorPolicy.id)}/boundaries`;
      await requestDashboardApi(endpoint, {
        method: editingBoundary?.id ? "PATCH" : "POST",
        body: { label: label.trim(), min_score: min, max_score: max, points: points === "" ? undefined : Number(points), descriptor: descriptor.trim() },
      });
      await loadBoundaries();
      resetForm();
      onNotice(`${label.trim()} grading boundary saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the grading boundary.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBoundary(boundary: GradingBoundaryRow) {
    if (!boundary.id || !window.confirm(`Delete ${boundary.label} grading boundary?`)) return;
    setSaving(true);
    try {
      await requestDashboardApi(`/api/exams/grading-policy-boundaries/${encodeURIComponent(boundary.id)}`, { method: "DELETE" });
      await loadBoundaries();
      if (editingBoundary?.id === boundary.id) resetForm();
      onNotice(`${boundary.label} grading boundary deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the grading boundary.");
    } finally {
      setSaving(false);
    }
  }

  return <Dialog open={Boolean(descriptorPolicy)} onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Edit Descriptors: {descriptorPolicy?.name ?? "Grading policy"}</DialogTitle></DialogHeader><div className="space-y-4 py-2"><div className="overflow-x-auto rounded-md border"><Table><TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Range</TableHead><TableHead>Points</TableHead><TableHead>Descriptor</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{boundaries.length === 0 ? <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">No grade boundaries yet. Add the first descriptor below.</TableCell></TableRow> : boundaries.map((boundary) => <TableRow key={boundary.id ?? `${boundary.label}-${boundary.min_score}`}><TableCell className="font-medium">{boundary.label}</TableCell><TableCell>{boundary.min_score} - {boundary.max_score}</TableCell><TableCell>{boundary.points ?? "-"}</TableCell><TableCell>{boundary.descriptor || "-"}</TableCell><TableCell className="text-right"><Button type="button" variant="ghost" size="sm" onClick={() => resetForm(boundary)}>Edit</Button><Button type="button" variant="ghost" size="sm" className="text-destructive" disabled={saving} onClick={() => void deleteBoundary(boundary)}>Delete</Button></TableCell></TableRow>)}</TableBody></Table></div><form onSubmit={saveBoundary} className="space-y-4 rounded-md border p-4"><h4 className="font-medium">{editingBoundary ? `Edit ${editingBoundary.label}` : "Add grade boundary"}</h4><div className="grid gap-4 sm:grid-cols-4"><div className="space-y-2"><Label htmlFor="boundary-label">Label</Label><Input id="boundary-label" value={label} onChange={(event) => setLabel(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="boundary-min">Minimum</Label><Input id="boundary-min" type="number" min="0" step="0.01" value={minScore} onChange={(event) => setMinScore(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="boundary-max">Maximum</Label><Input id="boundary-max" type="number" min="0" step="0.01" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required /></div><div className="space-y-2"><Label htmlFor="boundary-points">Points</Label><Input id="boundary-points" type="number" min="0" step="0.01" value={points} onChange={(event) => setPoints(event.target.value)} /></div></div><div className="space-y-2"><Label htmlFor="boundary-descriptor">Descriptor</Label><Textarea id="boundary-descriptor" value={descriptor} onChange={(event) => setDescriptor(event.target.value)} rows={2} /></div>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<div className="flex justify-end gap-2">{editingBoundary ? <Button type="button" variant="outline" onClick={() => resetForm()}>Cancel Edit</Button> : null}<Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}{editingBoundary ? "Update Boundary" : "Add Boundary"}</Button></div></form></div><DialogFooter><Button type="button" variant="outline" onClick={onClose}>Close</Button></DialogFooter></DialogContent></Dialog>;
}

export function GradingRubricsWorkspace({ model }: { model: unknown }) {
  void model;
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Standard Grading");
  const [editingPolicy, setEditingPolicy] = useState<GradingPolicyRow | null>(null);
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [descriptorPolicy, setDescriptorPolicy] = useState<GradingPolicyRow | null>(null);
  const { data: policiesResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<GradingPolicyRow[]> | GradingPolicyRow[]>("/exams/grading-policies");
  const policies = Array.isArray(policiesResponse) ? policiesResponse : policiesResponse?.data;
  const visiblePolicies = Array.isArray(policies) ? policies : [];

  function exportPolicies(rows: GradingPolicyRow[]) {
    downloadCsvFile({
      filename: `grading-policies-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Scale name", "Curriculum", "Reporting mode", "Status", "Last updated"],
      rows: rows.map((row) => [
        row.name ?? "Untitled scale",
        activeTab,
        row.reporting_mode ?? reportingModeForTab(activeTab),
        row.status ?? "draft",
        row.created_at ? new Date(row.created_at).toLocaleDateString() : "",
      ]),
    });
    setNotice(`Grading policy CSV downloaded with ${rows.length} scale${rows.length === 1 ? "" : "s"}.`);
  }

  async function savePolicy(payload: { name: string; reporting_mode: string }, policy?: GradingPolicyRow | null) {
    setSavingAction(policy?.id ? `edit:${policy.id}` : "create");
    try {
      if (policy?.id) {
        await requestDashboardApi(`/api/exams/grading-policies/${encodeURIComponent(policy.id)}`, {
          method: "PATCH",
          body: payload,
        });
        setEditingPolicy(null);
        setNotice(`${payload.name} updated.`);
      } else {
        await requestDashboardApi("/api/exams/grading-policies", {
          method: "POST",
          body: payload,
        });
        setCreatingPolicy(false);
        setNotice(`${payload.name} created as a draft grading scale.`);
      }
      await refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save the grading policy.");
    } finally {
      setSavingAction(null);
    }
  }

  async function createPolicyFrom(source: GradingPolicyRow | null, fallbackName: string) {
    const name = source?.name ? `${source.name} copy` : fallbackName;
    await savePolicy({ name, reporting_mode: source?.reporting_mode ?? reportingModeForTab(activeTab) }, null);
  }

  async function transitionPolicy(row: GradingPolicyRow, status: "active" | "retired") {
    if (!row.id) {
      setNotice("Save this grading policy before changing its status.");
      return;
    }

    setSavingAction(`status:${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/grading-policies/${encodeURIComponent(row.id)}/status`, {
        method: "PATCH",
        body: { status },
      });
      await refetch();
      setNotice(`${row.name ?? "Selected scale"} is now ${status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the grading policy status.");
    } finally {
      setSavingAction(null);
    }
  }

  async function deletePolicy(row: GradingPolicyRow) {
    if (!row.id) {
      setNotice("Save this grading policy before deleting it.");
      return;
    }

    setSavingAction(`delete:${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/grading-policies/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      await refetch();
      setNotice(`${row.name ?? "Draft scale"} deleted.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Only draft grading policies can be deleted.");
    } finally {
      setSavingAction(null);
    }
  }

  async function importPolicy(fileName: string) {
    await savePolicy({ name: `Imported ${fileName.replace(/\.[^.]+$/, "")}`, reporting_mode: reportingModeForTab(activeTab) }, null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Configuration"
          title="Grading & Rubrics"
          description="Manage grading scales, competency rubrics, and subject-specific grade bands."
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,.xlsx"
            className="hidden"
            onChange={(event) => {
              const fileName = event.target.files?.[0]?.name;
              if (fileName) void importPolicy(fileName);
              event.target.value = "";
            }}
          />
          <Button variant="outline" disabled={!!savingAction} onClick={() => importInputRef.current?.click()}><Upload className="mr-2 h-4 w-4" /> Import</Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => void createPolicyFrom(visiblePolicies[0] ?? null, "Previous term grading scale")}><Copy className="mr-2 h-4 w-4" /> Copy From Previous</Button>
          <Button disabled={!!savingAction} onClick={() => setCreatingPolicy(true)}><Plus className="mr-2 h-4 w-4" /> Create Scale</Button>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab(tab);
                setNotice(`${tab} policies selected.`);
              }}
            >
              {tab}
            </Button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scale Name</TableHead>
                <TableHead>Curriculum</TableHead>
                <TableHead>Reporting Mode</TableHead>
                <TableHead>Grade Bands</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading grading policies...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading policies: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && visiblePolicies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No grading policies found. Create the first grading scale before marks are published.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && visiblePolicies.map((row, idx) => (
                <TableRow key={policyKey(row, idx)}>
                  <TableCell className="font-medium">{row.name ?? "Untitled scale"}</TableCell>
                  <TableCell>{activeTab}</TableCell>
                  <TableCell>{row.reporting_mode ?? reportingModeForTab(activeTab)}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[200px]">View rules and descriptors</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "active" ? "default" : "secondary"}>{row.status ?? "draft"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingPolicy(row)}><Edit className="mr-2 h-4 w-4" /> Edit Scale</DropdownMenuItem>
                        <DropdownMenuItem disabled={!row.id} onClick={() => setDescriptorPolicy(row)}><AlignLeft className="mr-2 h-4 w-4" /> Edit Descriptors</DropdownMenuItem>
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => void transitionPolicy(row, "active")}><CheckCircle className="mr-2 h-4 w-4" /> Set as Active</DropdownMenuItem>
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => void createPolicyFrom(row, "Copied grading scale")}><Copy className="mr-2 h-4 w-4" /> Duplicate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => exportPolicies([row])}><Download className="mr-2 h-4 w-4" /> Export</DropdownMenuItem>
                        {(row.status ?? "draft").toLowerCase() === "draft" ? (
                          <DropdownMenuItem className="text-destructive" disabled={!!savingAction} onClick={() => void deletePolicy(row)}><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PolicyDialog
        policy={null}
        open={creatingPolicy}
        onOpenChange={setCreatingPolicy}
        activeTab={activeTab}
        onSave={savePolicy}
        saving={!!savingAction}
      />
      <DescriptorEditorDialog descriptorPolicy={descriptorPolicy} onClose={() => setDescriptorPolicy(null)} onNotice={setNotice} />
      <PolicyDialog
        policy={editingPolicy}
        open={!!editingPolicy}
        onOpenChange={(open) => !open && setEditingPolicy(null)}
        activeTab={activeTab}
        onSave={savePolicy}
        saving={!!savingAction}
      />
    </div>
  );
}
