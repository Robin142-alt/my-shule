export function savedReportUrl(id: string, preview = false) {
  return `/api/admin-command/exams-manager/reports/${encodeURIComponent(id)}/file${preview ? "?preview=true" : ""}`;
}

export async function fetchSavedReport(
  id: string,
  preview = false,
  signal?: AbortSignal,
) {
  const response = await fetch(savedReportUrl(id, preview), {
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: {
      Accept: preview ? "application/pdf" : "application/octet-stream",
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.message ??
        `Report unavailable (${response.status}). Retry or generate a new report.`,
    );
  }
  return response;
}

export async function downloadSavedReport(id: string) {
  const response = await fetchSavedReport(id);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download =
    response.headers
      .get("content-disposition")
      ?.match(/filename="([^"]+)"/)?.[1] ?? "report.pdf";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function printSavedReport(id: string) {
  const response = await fetchSavedReport(id, true);
  const url = URL.createObjectURL(await response.blob());
  const frame = document.createElement("iframe");
  frame.title = "Report print document";
  frame.style.cssText =
    "position:fixed;left:-10000px;width:800px;height:1000px;border:0";
  const clean = () => {
    frame.remove();
    URL.revokeObjectURL(url);
  };
  frame.onload = () => {
    frame.contentWindow?.addEventListener("afterprint", clean, { once: true });
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  };
  frame.src = url;
  document.body.append(frame);
  setTimeout(clean, 5 * 60_000);
}
