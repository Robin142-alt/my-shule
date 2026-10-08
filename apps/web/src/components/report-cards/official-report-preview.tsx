"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCw, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import { awaitReportDelivery, type ReportDeliveryJob } from "@/lib/report-cards/report-delivery";

export function OfficialReportPreview({ reportId, revision, learnerName }: { reportId: string; revision?: string; learnerName: string }) {
  const [attempt, setAttempt] = useState(0);
  return <ReportPreviewDocument key={`${reportId}:${revision ?? ""}:${attempt}`} reportId={reportId} learnerName={learnerName} onRetry={() => setAttempt(value => value + 1)} />;
}

function ReportPreviewDocument({ reportId, learnerName, onRetry }: { reportId: string; learnerName: string; onRetry: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(794);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Preparing report...");
  const [error, setError] = useState<string | null>(null);
  const [accessibleText, setAccessibleText] = useState("");

  useEffect(() => {
    const observer = new ResizeObserver(entries => setWidth(Math.max(1, entries[0].contentRect.width)));
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let task: { destroy: () => Promise<void> } | undefined;
    void (async () => {
      const job = await requestSchoolApiProxy<ReportDeliveryJob>(`/exams/report-cards/${encodeURIComponent(reportId)}/prepare-download`, { method: "POST" });
      await awaitReportDelivery(job, value => { if (!controller.signal.aborted) setStatus(`Report preparation: ${value.state}`); }, controller.signal);
      controller.signal.throwIfAborted();
      const response = await fetch(`/api/exams/report-cards/${encodeURIComponent(reportId)}/preview`, { headers: { Accept: "application/pdf" }, credentials: "same-origin", cache: "no-store", signal: controller.signal });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        throw new Error(typeof failure?.message === "string" ? failure.message : `Report preview unavailable (${response.status}). Retry or regenerate the report.`);
      }
      const data = new Uint8Array(await response.arrayBuffer());
      const { loadPdfEngine } = await import("@/lib/report-cards/pdf-engine");
      const engine = await loadPdfEngine();
      controller.signal.throwIfAborted();
      const loading = engine.getDocument({ data });
      task = loading;
      const document = await loading.promise;
      if (controller.signal.aborted) return;
      if (document.numPages !== 1) throw new Error("This report is not a single A4 page. Regenerate it before printing.");
      const page = await document.getPage(1);
      const text = await page.getTextContent();
      if (controller.signal.aborted) return;
      setAccessibleText(text.items.map(item => "str" in item ? item.str : "").join(" "));
      setPdf(document);
    })().catch(reason => {
      if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Report preview failed. Retry."); setStatus(""); }
    });
    return () => { controller.abort(); void task?.destroy(); };
  }, [reportId]);

  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    let render: { cancel: () => void; promise: Promise<void> } | undefined;
    void (async () => {
      const page = await pdf.getPage(1);
      if (cancelled || !canvas.current) return;
      const outputScale = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale: Math.min(width, 1120) * zoom / page.getViewport({ scale: 1 }).width });
      const target = canvas.current;
      target.width = Math.ceil(viewport.width * outputScale);
      target.height = Math.ceil(viewport.height * outputScale);
      target.style.width = `${viewport.width}px`;
      target.style.height = `${viewport.height}px`;
      render = page.render({ canvas: target, viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] });
      await render.promise;
      if (!cancelled) setStatus("");
    })().catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : "PDF rendering failed."); });
    return () => { cancelled = true; render?.cancel(); };
  }, [pdf, width, zoom]);

  return <section aria-label={`${learnerName} official report card`} data-testid="official-report-preview">
    <div className="mb-2 flex items-center justify-end gap-2 print:hidden">
      <span className="mr-auto text-xs text-muted">A4 · 1 page</span>
      <button type="button" title="Zoom out" aria-label="Zoom out" disabled={zoom <= 1} className="flex h-11 w-11 items-center justify-center disabled:opacity-40" onClick={() => setZoom(value => Math.max(1, value - 0.25))}><ZoomOut className="h-5 w-5" /></button>
      <span className="w-12 text-center text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
      <button type="button" title="Zoom in" aria-label="Zoom in" disabled={zoom >= 2.5} className="flex h-11 w-11 items-center justify-center disabled:opacity-40" onClick={() => setZoom(value => Math.min(2.5, value + 0.25))}><ZoomIn className="h-5 w-5" /></button>
      <button type="button" title="Fit page width" aria-label="Fit page width" className="flex h-11 w-11 items-center justify-center" onClick={() => setZoom(1)}><Maximize className="h-5 w-5" /></button>
    </div>
    {status && !error ? <p role="status" className="flex items-center gap-2 p-3 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{status}</p> : null}
    {error ? <div role="alert" className="mb-3 border border-red-200 bg-red-50 p-3 text-sm text-red-900">{error}<button type="button" className="mt-2 flex min-h-11 items-center gap-2 font-semibold" onClick={onRetry}><RotateCw className="h-4 w-4" />Retry preview</button></div> : null}
    <div ref={host} className="w-full overflow-x-auto overscroll-contain bg-gray-200">
      <canvas ref={canvas} className="mx-auto block bg-white" style={{ display: pdf && !error ? "block" : "none" }} aria-label={`${learnerName} report card, page 1`} role="img" />
    </div>
    <p className="sr-only">{accessibleText}</p>
  </section>;
}
