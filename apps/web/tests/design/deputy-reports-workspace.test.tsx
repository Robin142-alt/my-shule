import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { DeputyReportsDownloadsWorkspace } from "@/components/school/deputy-principal/reports-workspace";
import { downloadReportArtifact, generateReport } from "@/components/school/deputy-principal/api-client";
import { downloadBase64File } from "@/lib/dashboard/export";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/components/school/deputy-principal/api-client", () => ({
  downloadReportArtifact: jest.fn(),
  generateReport: jest.fn(),
}));

jest.mock("@/lib/dashboard/export", () => ({
  downloadBase64File: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const refetch = jest.fn();

describe("Deputy reports workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refetch.mockResolvedValue(undefined);
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: {
        metrics: { generated_reports: 2 },
        reportsList: [
          {
            id: "snapshot-ready",
            reportName: "Deputy operational report",
            generatedDate: "2026-08-22T10:00:00.000Z",
            type: "xlsx",
            status: "Ready",
          },
          {
            id: "snapshot-corrupt",
            reportName: "Corrupt report",
            generatedDate: "2026-08-22T09:00:00.000Z",
            type: "pdf",
            status: "Failed",
          },
        ],
      },
      isLoading: false,
      error: null,
      refetch,
    });
  });

  it("downloads the stored verified artifact instead of manufacturing metadata CSV", async () => {
    const user = userEvent.setup();
    (downloadReportArtifact as jest.Mock).mockResolvedValue({
      success: true,
      report: {
        title: "Deputy operational report",
        format: "xlsx",
        artifact: {
          filename: "deputy-operational-report.xlsx",
          content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          content_base64: "UEsDBA==",
        },
      },
    });

    renderWithProviders(createElement(DeputyReportsDownloadsWorkspace));

    expect(screen.getByText("Integrity check failed")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Download" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Download" }));

    await waitFor(() => expect(downloadReportArtifact).toHaveBeenCalledWith("snapshot-ready"));
    expect(downloadBase64File).toHaveBeenCalledWith({
      filename: "deputy-operational-report.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      contentBase64: "UEsDBA==",
    });
  });

  it("reports generation only after the live artifact is stored and the list refreshes", async () => {
    const user = userEvent.setup();
    (generateReport as jest.Mock).mockResolvedValue({ success: true });

    renderWithProviders(createElement(DeputyReportsDownloadsWorkspace));
    await user.click(screen.getByRole("button", { name: "Generate XLSX Report" }));

    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledWith({
        name: "Custom Operational Extract",
        format: "xlsx",
      });
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
