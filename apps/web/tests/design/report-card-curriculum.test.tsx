import { screen } from "@testing-library/react";

import { ReportCardDocument } from "@/components/report-cards/report-card-document";
import { buildExamsModuleData } from "@/lib/modules/exams-data";
import {
  buildReportCardDocument,
  buildReportCardGenerationRows,
  getReportCardFilename,
  getReportCardTitle,
  selectReportCardType,
} from "@/lib/report-cards/curriculum-report-cards";

import { renderWithProviders } from "./test-utils";

describe("curriculum-aware report cards", () => {
  function buildTestExamsData() {
    return buildExamsModuleData({ role: "principal", schoolName: "Kisumu Boys" });
  }

  it("keeps the school direction CBC/CBE first and selects legacy only from class/report context", () => {
    expect(
      selectReportCardType({
        schoolDirection: "HYBRID_TRANSITION",
      }),
    ).toBe("CBC_CBE_COMPETENCY");

    expect(
      selectReportCardType({
        schoolDirection: "HYBRID_TRANSITION",
        classReportingMode: "LEGACY_844_KCSE",
      }),
    ).toBe("LEGACY_844_KCSE");

    expect(
      selectReportCardType({
        schoolDirection: "CBC_CBE",
        selectedReportType: "HYBRID_CBC_MARKS",
        classReportingMode: "CBC_CBE",
      }),
    ).toBe("HYBRID_CBC_MARKS");
  });

  it("builds generation rows for CBC, hybrid, and legacy class report modes", () => {
    const data = buildTestExamsData();
    const rows = buildReportCardGenerationRows(data.reports);

    expect(rows.map((row) => row.reportType)).toEqual(
      expect.arrayContaining(["CBC_CBE_COMPETENCY", "HYBRID_CBC_MARKS", "LEGACY_844_KCSE"]),
    );
    expect(rows.find((row) => row.reportType === "LEGACY_844_KCSE")?.gradeForm).toContain("Form 4");
  });

  it("renders CBC reports without marks tables and renders legacy as a class/report format", () => {
    const data = buildTestExamsData();
    const rows = buildReportCardGenerationRows(data.reports);
    const cbcRow = rows.find((row) => row.reportType === "CBC_CBE_COMPETENCY");
    const legacyRow = rows.find((row) => row.reportType === "LEGACY_844_KCSE");

    expect(cbcRow).toBeDefined();
    expect(legacyRow).toBeDefined();

    const cbcReport = buildReportCardDocument({ data, row: cbcRow! });
    const legacyReport = buildReportCardDocument({ data, row: legacyRow! });

    expect(getReportCardTitle(legacyReport.curriculum.reportCardType).toLowerCase()).toBe(
      "official legacy 8-4-4/kcse student report",
    );
    expect(getReportCardTitle(legacyReport.curriculum.reportCardType)).not.toContain("School Report");
    expect(getReportCardFilename(legacyReport)).toContain("Legacy844");

    const { rerender } = renderWithProviders(<ReportCardDocument report={cbcReport} />);
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Learning Areas and Competency Progress");
    expect(screen.queryByText("Marks Supplement")).not.toBeInTheDocument();

    rerender(<ReportCardDocument report={legacyReport} />);
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Legacy Subject Results");
  });
});
