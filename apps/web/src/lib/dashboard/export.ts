export interface PrintableRow {
  label: string;
  value: string;
  tone?: "default" | "danger";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function downloadCsvFile({
  filename,
  headers,
  rows,
}: {
  filename: string;
  headers: string[];
  rows: string[][];
}) {
  if (typeof window === "undefined") {
    return;
  }

  const csv = [headers, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");

  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function downloadTextFile({
  filename,
  content,
  mimeType = "text/plain;charset=utf-8;",
}: {
  filename: string;
  content: string;
  mimeType?: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = window.document.createElement("a");

  link.href = url;
  link.download = filename;
  window.document.body.appendChild(link);
  link.click();
  window.document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  const textarea = window.document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  window.document.body.appendChild(textarea);
  textarea.select();
  window.document.execCommand("copy");
  window.document.body.removeChild(textarea);
}

function openInlinePrintPreview(html: string, title: string) {
  const existing = window.document.querySelector("[data-myshule-print-preview]");
  existing?.remove();

  const overlay = window.document.createElement("div");
  overlay.setAttribute("data-myshule-print-preview", "true");
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", `${title} print preview`);
  overlay.innerHTML = `
    <div style="position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,0.62);padding:24px;box-sizing:border-box;">
      <div style="height:100%;max-width:960px;margin:0 auto;background:#ffffff;border-radius:16px;box-shadow:0 24px 80px rgba(15,23,42,0.28);display:flex;flex-direction:column;overflow:hidden;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;padding:12px 14px;background:#f8fafc;">
          <div>
            <p style="margin:0;font:700 11px/1.2 Inter,Segoe UI,Arial,sans-serif;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;">Print preview</p>
            <h2 style="margin:4px 0 0;font:800 16px/1.25 Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">${escapeHtml(title)}</h2>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button data-myshule-print type="button" style="border:1px solid #0f3f8a;border-radius:10px;background:#0f3f8a;color:#ffffff;cursor:pointer;font-weight:800;padding:9px 13px;">Print</button>
            <button data-myshule-download-pdf type="button" style="border:1px solid #bfdbfe;border-radius:10px;background:#eff6ff;color:#0f3f8a;cursor:pointer;font-weight:800;padding:9px 13px;">Download PDF</button>
            <button data-myshule-cancel type="button" style="border:1px solid #cbd5e1;border-radius:10px;background:#ffffff;color:#334155;cursor:pointer;font-weight:800;padding:9px 13px;">Cancel</button>
          </div>
        </div>
        <iframe title="${escapeHtml(title)} document preview" style="width:100%;height:100%;border:0;background:#f8fafc;"></iframe>
      </div>
    </div>
  `;

  window.document.body.appendChild(overlay);

  const iframe = overlay.querySelector("iframe");
  const previewDocument = iframe?.contentDocument;

  if (previewDocument) {
    previewDocument.open();
    previewDocument.write(html);
    previewDocument.close();
  }

  overlay.querySelector("[data-myshule-print]")?.addEventListener("click", () => {
    const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";
    if (!userAgent.includes("jsdom")) {
      iframe?.contentWindow?.focus();
    }
    window.print?.();
  });
  overlay.querySelector("[data-myshule-download-pdf]")?.addEventListener("click", () => {
    window.print?.();
  });
  overlay.querySelector("[data-myshule-cancel]")?.addEventListener("click", () => overlay.remove());
}

export function openPrintDocument({
  eyebrow,
  title,
  subtitle,
  rows,
  footer,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: PrintableRow[];
  footer: string;
}) {
  if (typeof window === "undefined") {
    return;
  }

  const renderedRows = rows
    .map(
      (row) => `
        <div class="row">
          <div class="label">${escapeHtml(row.label)}</div>
          <div class="value ${row.tone === "danger" ? "danger" : ""}">${escapeHtml(row.value)}</div>
        </div>
      `,
    )
    .join("");

  const documentHtml = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body {
            margin: 0;
            font-family: Inter, Segoe UI, Arial, sans-serif;
            background: #f8fafc;
            color: #0f172a;
          }
          .page {
            max-width: 820px;
            margin: 24px auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 32px;
            box-sizing: border-box;
          }
          .eyebrow {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
            color: #64748b;
          }
          h1 {
            margin: 12px 0 0;
            font-size: 24px;
            line-height: 1.2;
          }
          .subtitle {
            margin: 12px 0 0;
            font-size: 14px;
            line-height: 1.7;
            color: #64748b;
          }
          .divider {
            margin: 20px 0;
            border-top: 1px solid #e2e8f0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .row:last-child {
            border-bottom: none;
          }
          .label,
          .value {
            font-size: 14px;
            line-height: 1.5;
          }
          .value {
            font-weight: 700;
            text-align: right;
          }
          .danger {
            color: #dc2626;
          }
          .footer {
            margin-top: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            background: #f8fafc;
            padding: 16px;
            font-size: 14px;
            line-height: 1.7;
            color: #64748b;
          }
          .toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: center;
            gap: 10px;
            padding: 14px;
            background: rgba(248, 250, 252, 0.96);
            border-bottom: 1px solid #e2e8f0;
            backdrop-filter: blur(10px);
          }
          .toolbar button {
            border: 1px solid #bfdbfe;
            border-radius: 10px;
            background: #eff6ff;
            color: #0f3f8a;
            cursor: pointer;
            font-weight: 800;
            padding: 10px 14px;
          }
          .toolbar button.primary {
            background: #0f3f8a;
            border-color: #0f3f8a;
            color: #ffffff;
          }
          .toolbar button.neutral {
            background: #ffffff;
            border-color: #cbd5e1;
            color: #334155;
          }
          @media print {
            body {
              background: #ffffff;
            }
            .toolbar {
              display: none;
            }
            .page {
              margin: 0;
              border: none;
              border-radius: 0;
              max-width: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="toolbar" aria-label="Print preview actions">
          <button class="primary" type="button" onclick="window.print()">Print</button>
          <button type="button" onclick="window.print()">Download PDF</button>
          <button class="neutral" type="button" onclick="window.close()">Cancel</button>
        </div>
        <main class="page">
          <div class="eyebrow">${escapeHtml(eyebrow)}</div>
          <h1>${escapeHtml(title)}</h1>
          <p class="subtitle">${escapeHtml(subtitle)}</p>
          <div class="divider"></div>
          ${renderedRows}
          <div class="footer">${escapeHtml(footer)}</div>
        </main>
      </body>
    </html>
  `;

  let popup: Window | null = null;

  const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";

  if (!userAgent.includes("jsdom")) {
    try {
      popup = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    } catch {
      popup = null;
    }
  }

  if (!popup) {
    openInlinePrintPreview(documentHtml, title);
    return;
  }

  popup.document.write(documentHtml);
  popup.document.close();
  popup.focus();
}
