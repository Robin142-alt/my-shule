import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

interface ExportOptions {
  tenantId?: string;
  filename: string;
  format: "csv" | "pdf";
  payload: Record<string, unknown>;
}

/**
 * Replaces localized React array -> Blob exports.
 * Issues a POST to the server to generate real documents from DB.
 */
export async function triggerServerExport(endpoint: string, options: ExportOptions) {
  const activeTenantId = options.tenantId || getCurrentSchoolId();
  const baseUrl = getDashboardApiBaseUrl(activeTenantId);

  if (!baseUrl) {
    throw new Error("Export requires API base URL.");
  }


  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tenant-id": activeTenantId,
    },
    body: JSON.stringify({
      format: options.format,
      ...options.payload,
    }),
  });

  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }

  // Stream the binary response as a download
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = options.filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
