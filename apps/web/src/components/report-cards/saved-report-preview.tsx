"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  fetchSavedReport,
  type PrincipalReportSource,
} from "@/lib/report-cards/saved-report-file";

export function SavedReportPreview({
  id,
  title,
  source,
}: {
  id: string;
  title: string;
  source?: PrincipalReportSource;
}) {
  const [attempt, setAttempt] = useState(0);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(760);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const sourceModule = source?.module;
  const sourceTenant = source?.tenantId;
  useEffect(() => {
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(1, entries[0].contentRect.width)),
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    let task: { destroy(): Promise<void> } | undefined;
    setPdf(null);
    setError("");
    setPageNumber(1);
    setText("");
    void (async () => {
      const response = await fetchSavedReport(
        id,
        true,
        controller.signal,
        sourceModule !== undefined && sourceTenant !== undefined
          ? { module: sourceModule, tenantId: sourceTenant }
          : undefined,
      );
      const data = new Uint8Array(await response.arrayBuffer());
      const { loadPdfEngine } = await import("@/lib/report-cards/pdf-engine");
      const engine = await loadPdfEngine();
      controller.signal.throwIfAborted();
      const loading = engine.getDocument({ data });
      task = loading;
      const document = await loading.promise;
      if (!controller.signal.aborted) setPdf(document);
    })().catch((reason) => {
      if (!controller.signal.aborted)
        setError(
          reason instanceof Error
            ? reason.message
            : "PDF preview failed. Retry.",
        );
    });
    return () => {
      controller.abort();
      void task?.destroy();
    };
  }, [id, attempt, sourceModule, sourceTenant]);
  useEffect(() => {
    if (!pdf) return;
    let cancelled = false;
    let rendering: { cancel(): void } | undefined;
    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled || !canvas.current) return;
      const viewport = page.getViewport({
        scale:
          (Math.min(width, 1120) * zoom) / page.getViewport({ scale: 1 }).width,
      });
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      const target = canvas.current;
      target.width = Math.ceil(viewport.width * scale);
      target.height = Math.ceil(viewport.height * scale);
      target.style.width = `${viewport.width}px`;
      target.style.height = `${viewport.height}px`;
      const render = page.render({
        canvas: target,
        viewport,
        transform: [scale, 0, 0, scale, 0, 0],
      });
      rendering = render;
      await render.promise;
      const content = await page.getTextContent();
      if (!cancelled)
        setText(
          content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" "),
        );
    })().catch((reason) => {
      if (!cancelled)
        setError(
          reason instanceof Error ? reason.message : "PDF rendering failed.",
        );
    });
    return () => {
      cancelled = true;
      rendering?.cancel();
    };
  }, [pdf, pageNumber, width, zoom]);
  const control =
    "min-h-11 rounded-lg border border-border px-3 text-sm disabled:opacity-40";
  return (
    <section aria-label={`${title} PDF preview`}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          className={control}
          disabled={!pdf || pageNumber === 1}
          onClick={() => setPageNumber((value) => value - 1)}
        >
          Previous page
        </button>
        <span className="text-sm">
          Page {pageNumber} of {pdf?.numPages ?? "…"}
        </span>
        <button
          className={control}
          disabled={!pdf || pageNumber >= pdf.numPages}
          onClick={() => setPageNumber((value) => value + 1)}
        >
          Next page
        </button>
        <button
          aria-label="Zoom out"
          className={control}
          disabled={zoom <= 0.5}
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
        >
          −
        </button>
        <span className="text-sm tabular-nums">{Math.round(zoom * 100)}%</span>
        <button
          aria-label="Zoom in"
          className={control}
          disabled={zoom >= 2.5}
          onClick={() => setZoom((value) => Math.min(2.5, value + 0.25))}
        >
          +
        </button>
        <button className={control} onClick={() => setZoom(1)}>
          Fit width
        </button>
      </div>
      {error ? (
        <p role="alert" className="p-3 text-danger">
          {error}{" "}
          <button
            className={control}
            onClick={() => setAttempt((value) => value + 1)}
          >
            Retry preview
          </button>
        </p>
      ) : !pdf ? (
        <p role="status">Loading saved PDF…</p>
      ) : null}
      <div ref={host} className="w-full overflow-x-auto bg-slate-100">
        <canvas
          ref={canvas}
          className="mx-auto bg-white"
          role="img"
          aria-label={`${title}, page ${pageNumber}`}
          style={{ display: pdf && !error ? "block" : "none" }}
        />
      </div>
      <p className="sr-only">{text}</p>
    </section>
  );
}
