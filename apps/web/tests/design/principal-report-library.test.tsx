import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PrincipalReportsWorkspace } from "@/components/school/principal-dashboard/reports-workspace";
import {
  downloadSavedReport,
  printSavedReport,
} from "@/lib/report-cards/saved-report-file";
jest.mock("@/lib/report-cards/saved-report-file", () => ({
  downloadSavedReport: jest.fn().mockResolvedValue(undefined),
  printSavedReport: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/components/report-cards/saved-report-preview", () => ({
  SavedReportPreview: ({ title }: any) => <div>{title} PDF preview</div>,
}));
jest.mock("@/components/school/live-report-cards-workspace", () => ({
  LiveReportCardsWorkspace: () => <div>Existing report-card workspace</div>,
}));
jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
jest.mock("@/lib/data/school-tenant-scope", () => ({
  useOptionalSchoolTenantId: () => "school-a",
}));
jest.mock(
  "@/components/school/principal-dashboard/verified-tenant-api",
  () => ({ useVerifiedPrincipalDashboardApi: () => jest.fn() }),
);
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (path: string) => ({
    refetch: jest.fn(),
    data: path.includes("/generated?")
      ? {
          items: [
            {
              id: "saved",
              snapshot_id: "snapshot",
              module: "exams",
              source_label: "Exams",
              title: "End term analysis",
              format: "pdf",
              status: "stored",
              created_at: "2026-11-02T08:00:00Z",
              generated_by: "Exams team",
            },
          ],
          categories: [{ module: "exams", label: "Exams", count: 1 }],
          has_more: false,
        }
      : { categories: [], scheduledReports: [] },
  }),
}));
test("saved report names open the existing PDF preview and download/print target the authorized source", async () => {
  render(<PrincipalReportsWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "End term analysis" }));
  expect(screen.getByText("End term analysis PDF preview")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Download original" }));
  await waitFor(() =>
    expect(downloadSavedReport).toHaveBeenCalledWith("snapshot", {
      module: "exams",
      tenantId: "school-a",
    }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Print report" }));
  await waitFor(() =>
    expect(printSavedReport).toHaveBeenCalledWith("snapshot", {
      module: "exams",
      tenantId: "school-a",
    }),
  );
});
test("report-card browsing reuses the established Principal card workflow", () => {
  render(<PrincipalReportsWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Report cards" }));
  expect(screen.getByText("Existing report-card workspace")).toBeVisible();
});
