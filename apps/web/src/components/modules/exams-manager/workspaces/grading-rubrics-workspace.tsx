"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignLeft,
  Archive,
  CheckCircle,
  Copy,
  Download,
  Edit,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile } from "@/lib/dashboard/export";

type ReportingMode = "traditional" | "cbc_competency" | "hybrid";
type PolicyStatus = "draft" | "validated" | "scheduled" | "active" | "replaced" | "archived";

interface GradingPolicyRow {
  id?: string;
  name?: string;
  reporting_mode?: ReportingMode | string;
  status?: PolicyStatus | string;
  version?: number;
  effective_from?: string | null;
  effective_to?: string | null;
  exam_series_id?: string | null;
  scope?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}

interface GradingBoundaryRow {
  id?: string;
  label: string;
  min_score: number;
  max_score: number;
  points?: number | null;
  descriptor?: string | null;
  remark?: string | null;
  is_pass?: boolean;
}

interface GradingPolicyImpact {
  version?: number;
  status?: string;
  future_exam_count?: number;
  existing_exam_count?: number;
  report_card_count?: number;
  published_report_count?: number;
}

interface ApiResponse<T> {
  data?: T;
}

interface PolicyPayload extends Record<string, unknown> {
  name: string;
  reporting_mode: ReportingMode;
  effective_from?: string;
  effective_to?: string;
  supersedes_policy_id?: string;
  scope?: Record<string, unknown>;
}

interface ImportedBoundary {
  policyName: string;
  reportingMode: ReportingMode;
  label: string;
  minScore: number;
  maxScore: number;
  points?: number;
  descriptor?: string;
  remark?: string;
  isPass: boolean;
  effectiveFrom?: string;
  effectiveTo?: string;
}

const tabs = ["Standard Grading", "CBC Rubrics", "Subject Specific", "Report Descriptors"] as const;
type GradingTab = (typeof tabs)[number];

const selectClassName =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function reportingModeForTab(tab: GradingTab): ReportingMode {
  if (tab === "CBC Rubrics") return "cbc_competency";
  if (tab === "Subject Specific" || tab === "Report Descriptors") return "hybrid";
  return "traditional";
}

function scopeForTab(tab: GradingTab): Record<string, unknown> {
  if (tab === "Subject Specific") return { policy_kind: "subject_specific" };
  if (tab === "Report Descriptors") return { policy_kind: "report_descriptors" };
  return { policy_kind: tab === "CBC Rubrics" ? "cbc" : "standard" };
}

function tabForPolicy(policy: GradingPolicyRow): GradingTab {
  const policyKind = typeof policy.scope?.policy_kind === "string" ? policy.scope.policy_kind : "";
  if (policyKind === "subject_specific") return "Subject Specific";
  if (policyKind === "report_descriptors") return "Report Descriptors";
  if (policy.reporting_mode === "cbc_competency") return "CBC Rubrics";
  if (policy.reporting_mode === "hybrid") return "Subject Specific";
  return "Standard Grading";
}

function policyMatchesTab(policy: GradingPolicyRow, tab: GradingTab): boolean {
  const expectedMode = reportingModeForTab(tab);
  if (policy.reporting_mode !== expectedMode) return false;
  if (expectedMode !== "hybrid") return true;

  const policyKind = typeof policy.scope?.policy_kind === "string" ? policy.scope.policy_kind : "";
  if (!policyKind) return true;
  return policyKind === (tab === "Subject Specific" ? "subject_specific" : "report_descriptors");
}

function policyKey(row: GradingPolicyRow, index: number) {
  return row.id ?? `${row.name ?? "policy"}-${row.created_at ?? "date"}-${index}`;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString();
}

function toDateTimeInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 16);
}

function toApiTimestamp(value: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function normalizePolicyStatus(value?: string): PolicyStatus {
  const status = value?.toLowerCase();
  if (
    status === "validated"
    || status === "scheduled"
    || status === "active"
    || status === "replaced"
    || status === "archived"
  ) {
    return status;
  }
  return "draft";
}

function statusBadgeVariant(status: PolicyStatus) {
  if (status === "active") return "success" as const;
  if (status === "scheduled" || status === "validated") return "warning" as const;
  if (status === "archived" || status === "replaced") return "outline" as const;
  return "secondary" as const;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }

  values.push(current.trim());
  return values;
}

function parseImportCsv(text: string): ImportedBoundary[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("The CSV must contain a header and at least one grading boundary.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const requiredHeaders = ["policy_name", "reporting_mode", "label", "min_score", "max_score"];
  const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing CSV columns: ${missingHeaders.join(", ")}.`);
  }

  const column = (values: string[], name: string) => values[headers.indexOf(name)] ?? "";
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const reportingMode = column(values, "reporting_mode").toLowerCase();
    if (!["traditional", "cbc_competency", "hybrid"].includes(reportingMode)) {
      throw new Error(`Row ${index + 2} has an unsupported reporting_mode.`);
    }

    const minScore = Number(column(values, "min_score"));
    const maxScore = Number(column(values, "max_score"));
    const pointsText = column(values, "points");
    const points = pointsText === "" ? undefined : Number(pointsText);
    if (
      !Number.isFinite(minScore)
      || !Number.isFinite(maxScore)
      || minScore < 0
      || maxScore > 100
      || maxScore < minScore
      || (points !== undefined && (!Number.isFinite(points) || points < 0))
    ) {
      throw new Error(`Row ${index + 2} has an invalid score range or points value.`);
    }

    const policyName = column(values, "policy_name").trim();
    const label = column(values, "label").trim();
    if (!policyName || !label) {
      throw new Error(`Row ${index + 2} requires policy_name and label.`);
    }

    return {
      policyName,
      reportingMode: reportingMode as ReportingMode,
      label,
      minScore,
      maxScore,
      points,
      descriptor: column(values, "descriptor").trim() || undefined,
      remark: column(values, "remark").trim() || undefined,
      isPass: ["true", "yes", "1", "pass"].includes(column(values, "is_pass").toLowerCase()),
      effectiveFrom: column(values, "effective_from").trim() || undefined,
      effectiveTo: column(values, "effective_to").trim() || undefined,
    };
  });
}

function PolicyDialog({
  policy,
  sourcePolicy,
  open,
  onOpenChange,
  activeTab,
  onSave,
  saving,
}: {
  policy: GradingPolicyRow | null;
  sourcePolicy: GradingPolicyRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: GradingTab;
  onSave: (payload: PolicyPayload, policy?: GradingPolicyRow | null) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [reportingMode, setReportingMode] = useState<ReportingMode>(reportingModeForTab(activeTab));
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveTo, setEffectiveTo] = useState("");

  useEffect(() => {
    if (!open) return;
    const sourceVersion = Number(sourcePolicy?.version ?? 1) + 1;
    setName(
      policy?.name
      ?? (sourcePolicy?.name ? `${sourcePolicy.name} v${sourceVersion}` : ""),
    );
    setReportingMode(
      (policy?.reporting_mode ?? sourcePolicy?.reporting_mode ?? reportingModeForTab(activeTab)) as ReportingMode,
    );
    setEffectiveFrom(toDateTimeInput(policy?.effective_from));
    setEffectiveTo(toDateTimeInput(policy?.effective_to));
  }, [activeTab, open, policy, sourcePolicy]);

  const title = policy?.id
    ? "Edit Draft Grading Scale"
    : sourcePolicy?.id
      ? `Create Version ${Number(sourcePolicy.version ?? 1) + 1}`
      : "Create Grading Scale";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(
              {
                name: name.trim(),
                reporting_mode: reportingMode,
                effective_from: toApiTimestamp(effectiveFrom),
                effective_to: toApiTimestamp(effectiveTo),
                supersedes_policy_id: sourcePolicy?.id,
                scope: policy?.scope ?? sourcePolicy?.scope ?? scopeForTab(activeTab),
              },
              policy,
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {sourcePolicy ? (
              <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                Boundaries and subject weightings from version {sourcePolicy.version ?? 1} will be copied
                into an editable draft. Existing report cards keep their original policy version.
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="grading-policy-name">Scale name</Label>
              <Input
                id="grading-policy-name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. 2026 Secondary School Scale"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grading-reporting-mode">Reporting mode</Label>
              <select
                id="grading-reporting-mode"
                className={selectClassName}
                value={reportingMode}
                onChange={(event) => setReportingMode(event.target.value as ReportingMode)}
              >
                <option value="traditional">Traditional grades and points</option>
                <option value="cbc_competency">CBC competency levels</option>
                <option value="hybrid">Hybrid grades and competencies</option>
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="grading-effective-from">Effective from</Label>
                <Input
                  id="grading-effective-from"
                  type="datetime-local"
                  value={effectiveFrom}
                  onChange={(event) => setEffectiveFrom(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grading-effective-to">Effective to</Label>
                <Input
                  id="grading-effective-to"
                  type="datetime-local"
                  value={effectiveTo}
                  onChange={(event) => setEffectiveTo(event.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {sourcePolicy ? "Create new version" : "Save draft scale"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DescriptorEditorDialog({
  descriptorPolicy,
  onClose,
  onNotice,
}: {
  descriptorPolicy: GradingPolicyRow | null;
  onClose: () => void;
  onNotice: (message: string) => void;
}) {
  const [boundaries, setBoundaries] = useState<GradingBoundaryRow[]>([]);
  const [editingBoundary, setEditingBoundary] = useState<GradingBoundaryRow | null>(null);
  const [label, setLabel] = useState("");
  const [minScore, setMinScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [points, setPoints] = useState("");
  const [descriptor, setDescriptor] = useState("");
  const [remark, setRemark] = useState("");
  const [isPass, setIsPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = normalizePolicyStatus(descriptorPolicy?.status) === "draft";

  async function loadBoundaries() {
    if (!descriptorPolicy?.id) return;
    const response = await requestDashboardApi<ApiResponse<GradingBoundaryRow[]> | GradingBoundaryRow[]>(
      `/api/exams/grading-policies/${encodeURIComponent(descriptorPolicy.id)}/boundaries`,
    );
    const rows = Array.isArray(response) ? response : response.data;
    setBoundaries(Array.isArray(rows) ? rows : []);
  }

  useEffect(() => {
    if (!descriptorPolicy?.id) return;
    setError(null);
    setEditingBoundary(null);
    void loadBoundaries().catch((caught) => {
      setError(caught instanceof Error ? caught.message : "Could not load grading boundaries.");
    });
  }, [descriptorPolicy?.id]);

  function resetForm(boundary: GradingBoundaryRow | null = null) {
    setEditingBoundary(boundary);
    setLabel(boundary?.label ?? "");
    setMinScore(String(boundary?.min_score ?? 0));
    setMaxScore(String(boundary?.max_score ?? 100));
    setPoints(boundary?.points === null || boundary?.points === undefined ? "" : String(boundary.points));
    setDescriptor(boundary?.descriptor ?? "");
    setRemark(boundary?.remark ?? "");
    setIsPass(boundary?.is_pass ?? false);
    setError(null);
  }

  async function saveBoundary(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!descriptorPolicy?.id || !canEdit) return;
    const min = Number(minScore);
    const max = Number(maxScore);
    if (
      !label.trim()
      || !Number.isFinite(min)
      || !Number.isFinite(max)
      || min < 0
      || max > 100
      || max < min
    ) {
      setError("Enter a label and a score range between 0 and 100.");
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
        body: {
          label: label.trim(),
          min_score: min,
          max_score: max,
          points: points === "" ? undefined : Number(points),
          descriptor: descriptor.trim(),
          remark: remark.trim(),
          is_pass: isPass,
        },
      });
      const savedLabel = label.trim();
      await loadBoundaries();
      resetForm();
      onNotice(`${savedLabel} grading boundary saved.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the grading boundary.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBoundary(boundary: GradingBoundaryRow) {
    if (!boundary.id || !canEdit || !window.confirm(`Delete ${boundary.label} grading boundary?`)) return;
    setSaving(true);
    setError(null);
    try {
      await requestDashboardApi(
        `/api/exams/grading-policy-boundaries/${encodeURIComponent(boundary.id)}`,
        { method: "DELETE" },
      );
      await loadBoundaries();
      if (editingBoundary?.id === boundary.id) resetForm();
      onNotice(`${boundary.label} grading boundary deleted.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete the grading boundary.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(descriptorPolicy)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {canEdit ? "Edit" : "View"} boundaries: {descriptorPolicy?.name ?? "Grading policy"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!canEdit ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This version is immutable because it has left draft status. Create a new version to change
              boundaries without altering historical results.
            </p>
          ) : null}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grade</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead>Descriptor / remark</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boundaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                      No grade boundaries yet. Add boundaries covering 0 to 100 before validating this scale.
                    </TableCell>
                  </TableRow>
                ) : boundaries.map((boundary) => (
                  <TableRow key={boundary.id ?? `${boundary.label}-${boundary.min_score}`}>
                    <TableCell className="font-medium">{boundary.label}</TableCell>
                    <TableCell>{boundary.min_score} - {boundary.max_score}</TableCell>
                    <TableCell>{boundary.points ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={boundary.is_pass ? "success" : "secondary"}>
                        {boundary.is_pass ? "Pass" : "Not pass"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p>{boundary.descriptor || "-"}</p>
                      {boundary.remark ? (
                        <p className="text-xs text-muted-foreground">{boundary.remark}</p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit ? (
                        <>
                          <Button type="button" variant="ghost" size="sm" onClick={() => resetForm(boundary)}>
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-destructive"
                            disabled={saving}
                            onClick={() => void deleteBoundary(boundary)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">Read only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {canEdit ? (
            <form onSubmit={saveBoundary} className="space-y-4 rounded-md border p-4">
              <h4 className="font-medium">
                {editingBoundary ? `Edit ${editingBoundary.label}` : "Add grade boundary"}
              </h4>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="boundary-label">Label</Label>
                  <Input id="boundary-label" value={label} onChange={(event) => setLabel(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boundary-min">Minimum</Label>
                  <Input id="boundary-min" type="number" min="0" max="100" step="0.01" value={minScore} onChange={(event) => setMinScore(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boundary-max">Maximum</Label>
                  <Input id="boundary-max" type="number" min="0" max="100" step="0.01" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boundary-points">Points</Label>
                  <Input id="boundary-points" type="number" min="0" step="0.01" value={points} onChange={(event) => setPoints(event.target.value)} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="boundary-descriptor">Descriptor</Label>
                  <Textarea id="boundary-descriptor" value={descriptor} onChange={(event) => setDescriptor(event.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="boundary-remark">Report-card remark</Label>
                  <Textarea id="boundary-remark" value={remark} onChange={(event) => setRemark(event.target.value)} rows={2} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={isPass}
                  onChange={(event) => setIsPass(event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                This boundary is a passing outcome
              </label>
              {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
              <div className="flex justify-end gap-2">
                {editingBoundary ? (
                  <Button type="button" variant="outline" onClick={() => resetForm()}>
                    Cancel edit
                  </Button>
                ) : null}
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingBoundary ? "Update boundary" : "Add boundary"}
                </Button>
              </div>
            </form>
          ) : null}
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImpactDialog({
  policy,
  onClose,
}: {
  policy: GradingPolicyRow | null;
  onClose: () => void;
}) {
  const [impact, setImpact] = useState<GradingPolicyImpact | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!policy?.id) return;
    setImpact(null);
    setError(null);
    void requestDashboardApi<ApiResponse<GradingPolicyImpact> | GradingPolicyImpact>(
      `/api/exams/grading-policies/${encodeURIComponent(policy.id)}/impact`,
    )
      .then((response) => {
        const nextImpact = Object.prototype.hasOwnProperty.call(response, "data")
          ? (response as ApiResponse<GradingPolicyImpact>).data ?? null
          : response as GradingPolicyImpact;
        setImpact(nextImpact);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not load policy impact.");
      });
  }, [policy?.id]);

  return (
    <Dialog open={Boolean(policy)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Policy impact: {policy?.name ?? "Grading policy"}</DialogTitle>
        </DialogHeader>
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {!error && !impact ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tenant-scoped policy usage...
          </div>
        ) : null}
        {impact ? (
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            {[
              ["Future exam cycles", impact.future_exam_count ?? 0],
              ["Completed exam cycles", impact.existing_exam_count ?? 0],
              ["Report-card revisions", impact.report_card_count ?? 0],
              ["Published reports", impact.published_report_count ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border p-3">
                <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-semibold">{value}</p>
              </div>
            ))}
            {(impact.published_report_count ?? 0) > 0 ? (
              <p className="sm:col-span-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Published reports retain this exact policy version. Archive or supersede it; do not edit
                historical grading evidence.
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function GradingRubricsWorkspace({ model }: { model: unknown }) {
  void model;
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GradingTab>("Standard Grading");
  const [editingPolicy, setEditingPolicy] = useState<GradingPolicyRow | null>(null);
  const [versionSource, setVersionSource] = useState<GradingPolicyRow | null>(null);
  const [creatingPolicy, setCreatingPolicy] = useState(false);
  const [descriptorPolicy, setDescriptorPolicy] = useState<GradingPolicyRow | null>(null);
  const [impactPolicy, setImpactPolicy] = useState<GradingPolicyRow | null>(null);
  const {
    data: policiesResponse,
    isLoading,
    error,
    refetch,
  } = useSchoolQuery<ApiResponse<GradingPolicyRow[]> | GradingPolicyRow[]>("/exams/grading-policies");
  const policies = Array.isArray(policiesResponse) ? policiesResponse : policiesResponse?.data;
  const allPolicies = Array.isArray(policies) ? policies : [];
  const visiblePolicies = allPolicies.filter((policy) => policyMatchesTab(policy, activeTab));

  function exportPolicies(rows: GradingPolicyRow[]) {
    downloadCsvFile({
      filename: `grading-policies-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: [
        "Scale name",
        "Policy type",
        "Reporting mode",
        "Version",
        "Status",
        "Effective from",
        "Effective to",
      ],
      rows: rows.map((row) => [
        row.name ?? "Untitled scale",
        tabForPolicy(row),
        row.reporting_mode ?? "traditional",
        String(row.version ?? 1),
        row.status ?? "draft",
        row.effective_from ?? "",
        row.effective_to ?? "",
      ]),
    });
    setNotice(`Downloaded ${rows.length} grading polic${rows.length === 1 ? "y" : "ies"}.`);
  }

  async function savePolicy(payload: PolicyPayload, policy?: GradingPolicyRow | null) {
    const isEdit = Boolean(policy?.id && !payload.supersedes_policy_id);
    setSavingAction(isEdit ? `edit:${policy?.id}` : "create");
    try {
      if (isEdit && policy?.id) {
        await requestDashboardApi(`/api/exams/grading-policies/${encodeURIComponent(policy.id)}`, {
          method: "PATCH",
          body: payload,
        });
        setNotice(`${payload.name} draft updated.`);
      } else {
        await requestDashboardApi("/api/exams/grading-policies", {
          method: "POST",
          body: payload,
        });
        setNotice(
          payload.supersedes_policy_id
            ? `${payload.name} created with copied boundaries as a new draft version.`
            : `${payload.name} created as a draft grading scale.`,
        );
      }
      setEditingPolicy(null);
      setVersionSource(null);
      setCreatingPolicy(false);
      await refetch();
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not save the grading policy.");
    } finally {
      setSavingAction(null);
    }
  }

  async function transitionPolicy(row: GradingPolicyRow, status: PolicyStatus) {
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
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not update the grading policy status.");
    } finally {
      setSavingAction(null);
    }
  }

  async function deletePolicy(row: GradingPolicyRow) {
    if (!row.id || !window.confirm(`Delete draft grading policy ${row.name ?? ""}?`)) return;
    setSavingAction(`delete:${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/grading-policies/${encodeURIComponent(row.id)}`, {
        method: "DELETE",
      });
      await refetch();
      setNotice(`${row.name ?? "Draft scale"} deleted.`);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Only draft grading policies can be deleted.");
    } finally {
      setSavingAction(null);
    }
  }

  async function importPolicies(file: File) {
    setSavingAction("import");
    try {
      const rows = parseImportCsv(await file.text());
      const groups = new Map<string, ImportedBoundary[]>();
      for (const row of rows) {
        const groupKey = `${row.policyName}\u0000${row.reportingMode}`;
        groups.set(groupKey, [...(groups.get(groupKey) ?? []), row]);
      }

      if (!window.confirm(
        `Import ${groups.size} draft grading polic${groups.size === 1 ? "y" : "ies"} with ${rows.length} boundaries?`,
      )) {
        setNotice("Grading policy import cancelled before any records were changed.");
        return;
      }

      let policiesCreated = 0;
      let boundariesCreated = 0;
      const failures: string[] = [];
      for (const groupRows of groups.values()) {
        const first = groupRows[0];
        try {
          const createdResponse = await requestDashboardApi<ApiResponse<GradingPolicyRow>>(
            "/api/exams/grading-policies",
            {
              method: "POST",
              body: {
                name: first.policyName,
                reporting_mode: first.reportingMode,
                effective_from: first.effectiveFrom,
                effective_to: first.effectiveTo,
                scope: scopeForTab(activeTab),
              },
            },
          );
          const policyId = createdResponse.data?.id;
          if (!policyId) throw new Error("The API did not return the created grading policy ID.");
          policiesCreated += 1;

          for (const boundary of groupRows) {
            await requestDashboardApi(
              `/api/exams/grading-policies/${encodeURIComponent(policyId)}/boundaries`,
              {
                method: "POST",
                body: {
                  label: boundary.label,
                  min_score: boundary.minScore,
                  max_score: boundary.maxScore,
                  points: boundary.points,
                  descriptor: boundary.descriptor,
                  remark: boundary.remark,
                  is_pass: boundary.isPass,
                },
              },
            );
            boundariesCreated += 1;
          }
        } catch (caught) {
          failures.push(
            `${first.policyName}: ${caught instanceof Error ? caught.message : "import failed"}`,
          );
        }
      }

      await refetch();
      setNotice(
        failures.length > 0
          ? `Imported ${policiesCreated} policies and ${boundariesCreated} boundaries. ${failures.join(" ")}`
          : `Imported ${policiesCreated} draft policies and ${boundariesCreated} boundaries.`,
      );
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Could not import the grading policy CSV.");
    } finally {
      setSavingAction(null);
    }
  }

  function renderStatusActions(row: GradingPolicyRow) {
    const status = normalizePolicyStatus(row.status);
    const actions: Array<{ status: PolicyStatus; label: string }> = [];
    if (status === "draft") {
      actions.push({ status: "validated", label: "Validate boundaries" });
    } else if (status === "validated") {
      actions.push(
        { status: "draft", label: "Return to draft" },
        { status: "scheduled", label: "Schedule" },
        { status: "active", label: "Activate now" },
      );
    } else if (status === "scheduled") {
      actions.push(
        { status: "draft", label: "Return to draft" },
        { status: "active", label: "Activate now" },
      );
    }
    if (status !== "archived") {
      actions.push({ status: "archived", label: "Archive" });
    }

    return actions.map((action) => (
      <DropdownMenuItem
        key={action.status}
        disabled={Boolean(savingAction)}
        onClick={() => void transitionPolicy(row, action.status)}
      >
        {action.status === "archived"
          ? <Archive className="mr-2 h-4 w-4" />
          : <CheckCircle className="mr-2 h-4 w-4" />}
        {action.label}
      </DropdownMenuItem>
    ));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          eyebrow="Configuration"
          title="Grading & Rubrics"
          description="Versioned grading scales, CBC competency rubrics, descriptors, effective dates, and publication-safe history."
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importPolicies(file);
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            disabled={Boolean(savingAction)}
            onClick={() => importInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button
            variant="outline"
            disabled={Boolean(savingAction) || visiblePolicies.length === 0}
            onClick={() => {
              const source = visiblePolicies[0];
              if (source) setVersionSource(source);
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            Version previous
          </Button>
          <Button disabled={Boolean(savingAction)} onClick={() => setCreatingPolicy(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create scale
          </Button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
          {notice}
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap gap-2 border-b p-5">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveTab(tab);
                setNotice(null);
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
                <TableHead>Scale name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Reporting mode</TableHead>
                <TableHead>Effective period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading grading policies...</p>
                  </TableCell>
                </TableRow>
              ) : null}
              {error ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-destructive">
                    Error loading policies: {error.message}
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && !error && visiblePolicies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No {activeTab.toLowerCase()} policy exists. Create a draft, add complete boundaries,
                    validate it, then activate it before generating reports.
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && !error ? visiblePolicies.map((row, index) => {
                const status = normalizePolicyStatus(row.status);
                const isDraft = status === "draft";
                return (
                  <TableRow key={policyKey(row, index)}>
                    <TableCell className="font-medium">{row.name ?? "Untitled scale"}</TableCell>
                    <TableCell>v{row.version ?? 1}</TableCell>
                    <TableCell>{row.reporting_mode ?? reportingModeForTab(activeTab)}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatDate(row.effective_from)} to {formatDate(row.effective_to)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(status)}>{status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(row.updated_at ?? row.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for ${row.name ?? "grading policy"}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {isDraft ? (
                            <DropdownMenuItem onClick={() => setEditingPolicy(row)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit draft
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuItem disabled={!row.id} onClick={() => setDescriptorPolicy(row)}>
                            <AlignLeft className="mr-2 h-4 w-4" />
                            {isDraft ? "Edit boundaries" : "View boundaries"}
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={!row.id} onClick={() => setImpactPolicy(row)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View impact
                          </DropdownMenuItem>
                          <DropdownMenuItem disabled={!row.id} onClick={() => setVersionSource(row)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Create new version
                          </DropdownMenuItem>
                          {renderStatusActions(row)}
                          <DropdownMenuItem onClick={() => exportPolicies([row])}>
                            <Download className="mr-2 h-4 w-4" />
                            Export policy
                          </DropdownMenuItem>
                          {isDraft ? (
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={Boolean(savingAction)}
                              onClick={() => void deletePolicy(row)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete draft
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              }) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <PolicyDialog
        policy={null}
        sourcePolicy={null}
        open={creatingPolicy}
        onOpenChange={setCreatingPolicy}
        activeTab={activeTab}
        onSave={savePolicy}
        saving={Boolean(savingAction)}
      />
      <PolicyDialog
        policy={editingPolicy}
        sourcePolicy={null}
        open={Boolean(editingPolicy)}
        onOpenChange={(open) => { if (!open) setEditingPolicy(null); }}
        activeTab={activeTab}
        onSave={savePolicy}
        saving={Boolean(savingAction)}
      />
      <PolicyDialog
        policy={null}
        sourcePolicy={versionSource}
        open={Boolean(versionSource)}
        onOpenChange={(open) => { if (!open) setVersionSource(null); }}
        activeTab={versionSource ? tabForPolicy(versionSource) : activeTab}
        onSave={savePolicy}
        saving={Boolean(savingAction)}
      />
      <DescriptorEditorDialog
        descriptorPolicy={descriptorPolicy}
        onClose={() => setDescriptorPolicy(null)}
        onNotice={setNotice}
      />
      <ImpactDialog policy={impactPolicy} onClose={() => setImpactPolicy(null)} />
    </div>
  );
}
