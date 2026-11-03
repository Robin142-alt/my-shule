export type PrincipalReportSource = { module: string; tenantId: string };

export function savedReportUrl(
  id: string,
  preview = false,
  source?: PrincipalReportSource,
) {
  if (source) {
    if (!source.tenantId.trim())
      throw new Error("A verified school context is required to open reports.");
    const query = new URLSearchParams({ tenantSlug: source.tenantId.trim() });
    if (preview) query.set("preview", "true");
    return `/api/admin-command/principal/reports/generated/${encodeURIComponent(source.module)}/${encodeURIComponent(id)}/file?${query}`;
  }
  return `/api/admin-command/exams-manager/reports/${encodeURIComponent(id)}/file${preview ? "?preview=true" : ""}`;
}

export async function fetchSavedReport(
  id: string,
  preview = false,
  signal?: AbortSignal,
  source?: PrincipalReportSource,
) {
  const response = await fetch(savedReportUrl(id, preview, source), {
    credentials: "same-origin",
    cache: "no-store",
    signal,
    headers: {
      Accept: preview ? "application/pdf" : "application/octet-stream",
      ...(source ? { "x-tenant-id": source.tenantId } : {}),
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

export async function downloadSavedReport(
  id: string,
  source?: PrincipalReportSource,
) {
  const response = await fetchSavedReport(id, false, undefined, source);
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

export async function printSavedReport(
  id: string,
  source?: PrincipalReportSource,
) {
  const response = await fetchSavedReport(id, true, undefined, source);
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
