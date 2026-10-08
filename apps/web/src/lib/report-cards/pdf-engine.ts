export async function loadPdfEngine() {
  const engine = await import("pdfjs-dist");
  engine.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  return engine;
}
