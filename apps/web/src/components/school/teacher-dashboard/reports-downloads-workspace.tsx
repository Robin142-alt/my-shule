"use client";
import { Download } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Panel, RecordTable } from "./shared-components";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { withSession } from "@/lib/dashboard/api-client";
import { downloadBase64File } from "@/lib/dashboard/export";

type Report = { id: string; title: string; type: string; generated_at: string; status: string };
type Artifact = { filename: string; content_type: string; content_base64?: string };
const button = "min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50";

export function ReportsDownloadsWorkspace() {
  const { session } = useLiveTenantSession("school");
  const { hasPermission } = usePermissions();
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState("");
  const [preview, setPreview] = useState<{ title: string; artifact: Artifact; url: string } | null>(null);
  const reports = useQuery({
    queryKey: ["teacher-reports-downloads", session?.tenantId, session?.user.user_id],
    queryFn: () => withSession<{ items: Report[] }>(session!, "/admin-command/teacher/reports", { method: "GET" }), enabled: !!session,
  });
  const generate = useMutation({
    mutationFn: () => withSession(session!, "/admin-command/teacher/reports", { method: "POST", body: {} }),
    onSuccess: () => { void reports.refetch(); },
  });
  const closePreview = () => { if (preview) URL.revokeObjectURL(preview.url); setPreview(null); };
  const open = async (report: Report) => {
    setError(""); setLoadingId(report.id);
    try {
      const result = await withSession<{ title: string; artifact: Artifact }>(session!, `/admin-command/teacher/reports/${report.id}`, { method: "GET" });
      if (!result.artifact?.content_base64) throw new Error("This older report has no saved artifact. Generate a new teaching report or regenerate the original report in Exam Analytics.");
      const bytes = Uint8Array.from(atob(result.artifact.content_base64), c => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: result.artifact.content_type }));
      closePreview(); setPreview({ title: result.title, artifact: result.artifact, url });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The report could not be opened."); }
    finally { setLoadingId(""); }
  };
  return <Panel title="Reports & Downloads" description="Generate a teaching summary, preview saved reports and download the original document." icon={Download}>
    <div className="mb-4 flex flex-wrap gap-3">
      <button className={button} type="button" disabled={!session || reports.isFetching} onClick={() => void reports.refetch()}>Refresh</button>
      <button className={button} type="button" disabled={!session || !hasPermission("teacher:write") || generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? "Generating…" : "Generate Teaching Report"}</button>
    </div>
    {generate.isSuccess && <p role="status" className="mb-3 text-success">Teaching report generated. Open it below to preview or download.</p>}
    {(error || reports.isError || generate.isError) && <p role="alert" className="mb-3 text-danger">{error || (generate.error ?? reports.error)?.message}</p>}
    <RecordTable columns={["Title", "Type", "Generated", "Status", "Action"]} rows={(reports.data?.items ?? []).map(row => [row.title, row.type, row.generated_at, row.status,
      <button key={row.id} className={button} type="button" disabled={!!loadingId} onClick={() => void open(row)}>{loadingId === row.id ? "Opening…" : "Preview / Download"}</button>])}
      emptyState={reports.isLoading ? "Loading reports…" : "No saved reports yet. Generate a teaching report, or use Exam Analytics for exam reports."} />
    {preview && <Modal open title={preview.title} onClose={closePreview} size="xl">
      <div className="mb-3 flex flex-wrap gap-3">
        <button className={button} type="button" onClick={() => downloadBase64File({ filename: preview.artifact.filename, contentBase64: preview.artifact.content_base64!, mimeType: preview.artifact.content_type })}>Download Document</button>
        <a className={button} href={preview.url} target="_blank" rel="noreferrer">Open Print View</a>
      </div>
      {preview.artifact.content_type === "application/pdf" ? <iframe title="Report preview" src={preview.url} className="h-[65vh] w-full rounded-xl border border-border" /> : <p className="text-sm text-muted">Download this report to open its original format.</p>}
    </Modal>}
  </Panel>;
}
