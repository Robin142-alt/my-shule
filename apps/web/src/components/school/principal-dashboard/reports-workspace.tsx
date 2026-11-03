"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Download, FileText, FolderOpen, Printer } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SavedReportPreview } from "@/components/report-cards/saved-report-preview";
import {
  downloadSavedReport,
  printSavedReport,
} from "@/lib/report-cards/saved-report-file";
import { LiveReportCardsWorkspace } from "@/components/school/live-report-cards-workspace";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";
import {
  PrincipalHeader,
  PrincipalMetrics,
  PrincipalPanel,
  principalStyles as s,
} from "./workspace-ui";

type SavedReport = {
  id: string;
  snapshot_id: string;
  module: string;
  source_label: string;
  title: string;
  format: string;
  status: "stored" | "unavailable";
  created_at: string;
  generated_by: string;
  period?: string | null;
};
type ReportLibrary = {
  generation_options?: Array<{ id: string; title: string }>;
  items: SavedReport[];
  has_more: boolean;
  offset: number;
  categories: Array<{ module: string; label: string; count: number }>;
};
type ReportSettings = {
  categories: Array<{ name: string; count: number }>;
  scheduledReports: Array<{ title: string; schedule: string }>;
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(value));

export function PrincipalReportsWorkspace() {
  const request = useVerifiedPrincipalDashboardApi();
  const [reportType, setReportType] = useState("");
  const [generationKey, setGenerationKey] = useState("");
  const [generated, setGenerated] = useState("");
  const tenantId = useOptionalSchoolTenantId();
  const { hasPermission } = usePermissions();
  const [tab, setTab] = useState<"reports" | "cards">("reports");
  const [filters, setFilters] = useState({
    q: "",
    module: "",
    from: "",
    to: "",
  });
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<SavedReport | null>(null);
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<"category" | "schedule" | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filters.q.trim()), 250);
    return () => clearTimeout(timer);
  }, [filters.q]);
  useEffect(() => {
    setSelected(null);
    setActionError("");
    setOffset(0);
  }, [tenantId]);
  const params = new URLSearchParams({ offset: String(offset) });
  Object.entries({ ...filters, q: search }).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const library = useSchoolQuery<ReportLibrary>(
    `/admin-command/principal/reports/generated?${params}`,
    { refetchInterval: 60000 },
  );
  const settings = useSchoolQuery<ReportSettings>(
    "/admin-command/principal/reports",
  );
  const update = (key: keyof typeof filters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setOffset(0);
  };
  async function generate() {
    if (!reportType || busy) return;
    const request_id = generationKey || crypto.randomUUID();
    setGenerationKey(request_id);
    setBusy("generate");
    setActionError("");
    setGenerated("");
    try {
      const saved = await request<{ title: string }>(
        "/admin-command/principal/reports/generated",
        { method: "POST", body: { type: reportType, request_id } },
      );
      setGenerated(saved.title + " is saved in the report library.");
      setGenerationKey("");
      setOffset(0);
      setFilters({ q: "", module: "", from: "", to: "" });
      setSearch("");
      await library.refetch();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Report generation failed.",
      );
    } finally {
      setBusy(null);
    }
  }
  async function act(report: SavedReport, action: "download" | "print") {
    if (!tenantId) {
      setActionError(
        "A verified school context is required to open this report.",
      );
      return;
    }
    setActionError("");
    setBusy(`${action}-${report.id}`);
    try {
      await (action === "download" ? downloadSavedReport : printSavedReport)(
        report.snapshot_id,
        { module: report.module, tenantId },
      );
    } catch (cause) {
      setActionError(
        cause instanceof Error
          ? cause.message
          : "The saved report could not be opened.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className={s.stack}>
      <PrincipalHeader
        icon={FolderOpen}
        tone="violet"
        title="School reporting center"
        description="Find generated school reports, review their history and open the original documents."
        actions={
          <Button
            variant="outline"
            onClick={() => void library.refetch()}
            disabled={library.isFetching}
          >
            Refresh reports
          </Button>
        }
      />
      <div className={s.actions} aria-label="Report collections">
        <Button
          variant={tab === "reports" ? "primary" : "outline"}
          aria-pressed={tab === "reports"}
          onClick={() => setTab("reports")}
        >
          School reports
        </Button>
        {hasPermission("exams:read") && (
          <Button
            variant={tab === "cards" ? "primary" : "outline"}
            aria-pressed={tab === "cards"}
            onClick={() => setTab("cards")}
          >
            Report cards
          </Button>
        )}
      </div>
      {tab === "cards" ? (
        <LiveReportCardsWorkspace audience="principal" />
      ) : (
        <>
          {library.data && (
            <PrincipalMetrics
              items={[
                {
                  label: "Saved reports",
                  value: library.data.categories.reduce(
                    (sum, row) => sum + row.count,
                    0,
                  ),
                  detail: "Documents in authorized source modules",
                  icon: FileText,
                  tone: "blue",
                },
                {
                  label: "Report sources",
                  value: library.data.categories.length,
                  detail: "Modules with saved generation history",
                  icon: FolderOpen,
                  tone: "violet",
                },
              ]}
            />
          )}
          <PrincipalPanel
            title="Generated reports"
            description="Original files remain linked to their generation date and source. File integrity is checked when opened."
            tone="blue"
          >
            {Boolean(library.data?.generation_options?.length) && (
              <div className={s.toolbar}>
                <label className={s.field}>
                  Generate a school report
                  <select
                    value={reportType}
                    onChange={(e) => {
                      setReportType(e.target.value);
                      setGenerationKey("");
                    }}
                  >
                    <option value="">Choose report</option>
                    {library.data?.generation_options?.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  disabled={!reportType || Boolean(busy)}
                  onClick={() => void generate()}
                >
                  {busy === "generate" ? "Generating…" : "Generate PDF"}
                </Button>
              </div>
            )}
            {generated && (
              <p role="status" className={s.notice}>
                {generated}
              </p>
            )}
            <div className={s.toolbar}>
              <label className={s.field}>
                Search reports
                <input
                  type="search"
                  value={filters.q}
                  onChange={(e) => update("q", e.target.value)}
                  placeholder="Report name or reference"
                />
              </label>
              <label className={s.field}>
                Source module
                <select
                  value={filters.module}
                  onChange={(e) => update("module", e.target.value)}
                >
                  <option value="">All authorized sources</option>
                  {library.data?.categories.map((row) => (
                    <option key={row.module} value={row.module}>
                      {row.label} ({row.count})
                    </option>
                  ))}
                </select>
              </label>
              <label className={s.field}>
                Generated from
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => update("from", e.target.value)}
                />
              </label>
              <label className={s.field}>
                Generated to
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => update("to", e.target.value)}
                />
              </label>
            </div>
            {actionError && !selected && (
              <p role="alert" className={s.error}>
                {actionError}
              </p>
            )}
            {library.error ? (
              <p role="alert" className={s.error}>
                {library.error.message}
                <Button
                  variant="outline"
                  onClick={() => void library.refetch()}
                >
                  Retry reports
                </Button>
              </p>
            ) : library.isLoading ? (
              <p role="status" className={s.empty}>
                Loading saved school reports…
              </p>
            ) : !library.data?.items.length ? (
              <p className={s.empty}>
                No saved reports match this view. Reports generated in
                authorized school modules appear here; individual learner cards
                are available under Report cards.
              </p>
            ) : (
              <>
                <div className={s.tableShell}>
                  <table>
                    <thead>
                      <tr>
                        <th>Report</th>
                        <th>Source / period</th>
                        <th>Generated</th>
                        <th>File</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {library.data.items.map((report) => (
                        <tr key={report.id}>
                          <td>
                            <button
                              className={s.link}
                              onClick={() => {
                                setActionError("");
                                setSelected(report);
                              }}
                            >
                              {report.title}
                            </button>
                            <small>{report.generated_by}</small>
                          </td>
                          <td>
                            {report.source_label}
                            <small>
                              {report.period || "Period recorded in document"}
                            </small>
                          </td>
                          <td>{dateLabel(report.created_at)}</td>
                          <td>
                            <span
                              className={s.badge}
                              data-tone={
                                report.status === "stored" ? "mint" : "rose"
                              }
                            >
                              {report.status === "stored"
                                ? "File stored"
                                : "File unavailable"}
                            </span>
                            <small>{report.format.toUpperCase()}</small>
                          </td>
                          <td>
                            <div className={s.actions}>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Download ${report.title}`}
                                disabled={Boolean(busy)}
                                onClick={() => void act(report, "download")}
                              >
                                <Download size={16} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                aria-label={`Print ${report.title}`}
                                disabled={Boolean(busy)}
                                onClick={() => void act(report, "print")}
                              >
                                <Printer size={16} />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={s.actions}>
                  <Button
                    variant="outline"
                    disabled={!offset}
                    onClick={() => setOffset(Math.max(0, offset - 25))}
                  >
                    Previous reports
                  </Button>
                  <span>Page {Math.floor(offset / 25) + 1}</span>
                  <Button
                    variant="outline"
                    disabled={!library.data.has_more}
                    onClick={() => setOffset(offset + 25)}
                  >
                    Next reports
                  </Button>
                </div>
              </>
            )}
          </PrincipalPanel>
          <details className={s.panel}>
            <summary className={s.panelHeading}>
              Report categories & schedules
            </summary>
            <div className={s.panelBody}>
              {settings.error ? (
                <p role="alert" className={s.error}>
                  {settings.error.message}
                  <Button
                    variant="outline"
                    onClick={() => void settings.refetch()}
                  >
                    Retry report settings
                  </Button>
                </p>
              ) : settings.isLoading ? (
                <p role="status">Loading report settings…</p>
              ) : (
                <div className={s.columns}>
                  <div>
                    <h3>Report Categories</h3>
                    {settings.data?.categories?.length ? (
                      <ul>
                        {settings.data.categories.map((row) => (
                          <li key={row.name}>{row.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No report categories configured.</p>
                    )}
                    {hasPermission("reports:write") && (
                      <Button
                        variant="outline"
                        onClick={() => setEditing("category")}
                      >
                        Add Category
                      </Button>
                    )}
                  </div>
                  <div>
                    <h3>Scheduled Reports</h3>
                    {settings.data?.scheduledReports?.length ? (
                      <ul>
                        {settings.data.scheduledReports.map((row, index) => (
                          <li key={`${row.title}-${index}`}>
                            {row.title} · {row.schedule}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No report schedules configured.</p>
                    )}
                    {hasPermission("reports:write") && (
                      <Button
                        variant="outline"
                        onClick={() => setEditing("schedule")}
                      >
                        Schedule Report
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </details>
        </>
      )}
      {selected && tenantId && (
        <Modal
          open
          size="xl"
          mobileFullScreen
          title={selected.title}
          description={`${selected.source_label} · ${dateLabel(selected.created_at)}`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close preview
              </Button>
              <Button
                variant="outline"
                disabled={Boolean(busy)}
                onClick={() => void act(selected, "download")}
              >
                Download original
              </Button>
              <Button
                disabled={Boolean(busy)}
                onClick={() => void act(selected, "print")}
              >
                Print report
              </Button>
            </>
          }
        >
          {actionError && (
            <p role="alert" className={s.error}>
              {actionError}
            </p>
          )}
          <SavedReportPreview
            id={selected.snapshot_id}
            title={selected.title}
            source={{ module: selected.module, tenantId }}
          />
        </Modal>
      )}
      {editing && hasPermission("reports:write") && (
        <ReportSettingEditor
          kind={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await settings.refetch();
          }}
        />
      )}
    </div>
  );
}

function ReportSettingEditor({
  kind,
  onClose,
  onSaved,
}: {
  kind: "category" | "schedule";
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const request = useVerifiedPrincipalDashboardApi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await request(
        kind === "category"
          ? "/admin-command/reports/categories"
          : "/admin-command/reports/schedule",
        {
          method: "POST",
          body:
            kind === "category"
              ? { name: String(form.get("name")).trim() }
              : {
                  title: String(form.get("title")).trim(),
                  schedule: form.get("schedule"),
                },
        },
      );
      await onSaved();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Report settings could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title={kind === "category" ? "Create Report Category" : "Schedule Report"}
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="principal-report-setting" disabled={busy}>
            {busy
              ? "Saving…"
              : kind === "category"
                ? "Create Category"
                : "Schedule Report"}
          </Button>
        </>
      }
    >
      <form id="principal-report-setting" onSubmit={save} className={s.form}>
        {error && (
          <p role="alert" className={s.error}>
            {error}
          </p>
        )}
        <label className={s.field}>
          {kind === "category" ? "Category Name" : "Report Title"}
          <input
            name={kind === "category" ? "name" : "title"}
            required
            maxLength={200}
          />
        </label>
        {kind === "schedule" && (
          <label className={s.field}>
            Frequency
            <select name="schedule">
              {["Daily", "Weekly", "Monthly", "End of Term"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        )}
      </form>
    </Modal>
  );
}
