import { screen } from "@testing-library/react";

import { ReportCardDocument } from "@/components/report-cards/report-card-document";
import { buildExamsModuleData } from "@/lib/modules/exams-data";
import {
  buildReportCardDocument,
  buildReportCardGenerationRows,
  curriculumSettings,
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

  it("preserves archived report formats before selected, class, period, or school defaults", () => {
    expect(
      selectReportCardType({
        archivedReportType: "LEGACY_844_KCSE",
        selectedReportType: "CBC_CBE_COMPETENCY",
        classReportingMode: "CBC_CBE",
        periodReportType: "HYBRID_CBC_MARKS",
        schoolDirection: "CBC_CBE",
      }),
    ).toBe("LEGACY_844_KCSE");

    expect(
      selectReportCardType({
        classReportingMode: "HYBRID_CBC_MARKS",
        periodReportType: "LEGACY_844_KCSE",
        schoolDirection: "HYBRID_TRANSITION",
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

  it("uses school direction and explicit class settings instead of assuming Form 4 makes the whole school legacy", () => {
    const data = buildTestExamsData();
    const pureCbcRows = buildReportCardGenerationRows(data.reports, {
      settings: {
        ...curriculumSettings,
        schoolDefaultCurriculumDirection: "CBC_CBE",
      },
    });

    expect(pureCbcRows.every((row) => row.reportingMode === "CBC_CBE")).toBe(true);
    expect(pureCbcRows.map((row) => row.reportType)).not.toContain("LEGACY_844_KCSE");

    const formFourClass = data.reports.find((report) => report.className.includes("Form 4"));
    expect(formFourClass).toBeDefined();

    const hybridRows = buildReportCardGenerationRows(data.reports, {
      settings: {
        ...curriculumSettings,
        schoolDefaultCurriculumDirection: "HYBRID_TRANSITION",
      },
      classReportingModes: {
        [formFourClass!.className]: "LEGACY_844_KCSE",
      },
    });

    expect(hybridRows.find((row) => row.gradeForm === formFourClass!.className)?.reportType).toBe("LEGACY_844_KCSE");
  });

  it("uses existing report batch template metadata before class-name fallback inference", () => {
    const data = buildTestExamsData();
    const rows = buildReportCardGenerationRows(
      data.reports.map((report) =>
        report.className === "Grade 8 Unity"
          ? { ...report, template: "CBC/CBE Competency Report" }
          : report,
      ),
      {
        settings: {
          ...curriculumSettings,
          schoolDefaultCurriculumDirection: "HYBRID_TRANSITION",
        },
      },
    );

    const gradeEightRow = rows.find((row) => row.gradeForm === "Grade 8 Unity");
    expect(gradeEightRow?.reportingMode).toBe("CBC_CBE");
    expect(gradeEightRow?.reportType).toBe("CBC_CBE_COMPETENCY");
  });

  it("uses report default settings to decide whether CBC observations, marks supplements, and comments block generation", () => {
    const data = buildTestExamsData();
    const rows = buildReportCardGenerationRows(data.reports, {
      settings: {
        ...curriculumSettings,
        allowMarksSupplement: false,
        requireClassTeacherComments: false,
        requireCbcObservations: false,
        requireSubjectTeacherComments: false,
      },
      classReportingModes: {
        "Grade 8 Unity": "HYBRID_CBC_MARKS",
      },
    });

    const hybridRow = rows.find((row) => row.gradeForm === "Grade 8 Unity");
    expect(hybridRow).toBeDefined();
    expect(hybridRow?.cbcCompletion).toBe("Not required");
    expect(hybridRow?.marksCompletion).toBe("Not required");
    expect(hybridRow?.commentsStatus).toBe("Not required");
    expect(hybridRow?.approvalStatus).toBe("Ready for review");
    expect(hybridRow?.missingItems).toEqual([]);
  });

  it("does not render hybrid marks supplement when the school has disabled marks supplements", () => {
    const data = buildTestExamsData();
    const rows = buildReportCardGenerationRows(data.reports, {
      settings: {
        ...curriculumSettings,
        allowMarksSupplement: false,
      },
      classReportingModes: {
        "Grade 8 Unity": "HYBRID_CBC_MARKS",
      },
    });
    const hybridRow = rows.find((row) => row.gradeForm === "Grade 8 Unity");

    expect(hybridRow).toBeDefined();

    const hybridReport = buildReportCardDocument({
      data,
      row: hybridRow!,
      settings: {
        ...curriculumSettings,
        allowMarksSupplement: false,
      },
    });

    expect(hybridReport.marksSupplement).toEqual([]);

    renderWithProviders(<ReportCardDocument report={hybridReport} />);
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Learning Areas and Competency Progress");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("Marks-Based Assessment Supplement");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("No marks have been entered");
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

  it("keeps legacy previews free of CBC-only sections while hybrid previews include both competency and marks sections", () => {
    const data = buildTestExamsData();
    const rows = buildReportCardGenerationRows(data.reports);
    const hybridRow = rows.find((row) => row.reportType === "HYBRID_CBC_MARKS");
    const legacyRow = rows.find((row) => row.reportType === "LEGACY_844_KCSE");

    expect(hybridRow).toBeDefined();
    expect(legacyRow).toBeDefined();

    const hybridReport = buildReportCardDocument({ data, row: hybridRow! });
    const legacyReport = buildReportCardDocument({ data, row: legacyRow! });

    const { rerender } = renderWithProviders(<ReportCardDocument report={hybridReport} />);
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Learning Areas and Competency Progress");
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Marks-Based Assessment Supplement");
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Descriptor Legend");
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Grading Scale");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent(/position|ranking/i);

    rerender(<ReportCardDocument report={legacyReport} />);
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Legacy Subject Results");
    expect(screen.getByTestId("report-card-document")).toHaveTextContent("Grading Scale");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("Learning Areas and Competency Progress");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("Core Competencies");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("Values and Character Development");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("Parent / Guardian Support");
    expect(screen.getByTestId("report-card-document")).not.toHaveTextContent("Descriptor Legend");
  });
});
