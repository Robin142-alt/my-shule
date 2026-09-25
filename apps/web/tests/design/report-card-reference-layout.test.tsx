import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { screen, within } from "@testing-library/react";

import { ReportCardDocument } from "@/components/report-cards/report-card-document";
import type { ReportCardDocumentData } from "@/lib/report-cards/curriculum-report-cards";

import { renderWithProviders } from "./test-utils";

type ReferenceReportCardData = ReportCardDocumentData;

const referenceReport: ReferenceReportCardData = {
  id: "reference-report-card",
  reportNumber: "RC-2026-0001",
  school: {
    name: "Greenfield Academy",
    logoUrl: "/school-logo.png",
    motto: "Knowledge, Discipline, Excellence",
    address: "P.O. Box 123, Nairobi",
    phone: "0700 123 456",
    email: "info@greenfieldacademy.sch.ke",
  },
  learner: {
    fullName: "Amani Njoroge",
    admissionNumber: "GS-2048",
    gradeForm: "Grade 8",
    stream: "North",
    gender: "Male",
    classTeacher: "Ms. Wanjiku",
    status: "Active",
  },
  academic: {
    academicYear: "2026",
    term: "Term 2",
    reportingPeriod: "Term 2, 2026",
    openingDate: "2 Sept 2026",
    closingDate: "12 Aug 2026",
    nextTermOpeningDate: "2 Sept 2026",
  },
  curriculum: {
    schoolDirection: "HYBRID_TRANSITION",
    classReportingMode: "HYBRID_CBC_MARKS",
    reportCardType: "HYBRID_CBC_MARKS",
    reportStatus: "Published",
  },
  cbcProgress: {
    overallDescriptor: "Exceeding Expectations",
    learningAreasCompleted: "7 of 7",
    attendancePercentage: "96.7%",
    strongestAreas: ["Computer Studies", "Mathematics"],
    areasForImprovement: ["Kiswahili"],
  },
  learningAreas: [],
  marksSupplement: [
    {
      subjectCode: "MAT",
      subjectName: "Mathematics",
      assessmentComponent: "CAT and end-term exam",
      score: "85%",
      percentage: "85%",
      grade: "A",
      teacherComment: "Exceeding Expectation",
      teacherName: "Ms. Wanjiku",
      catScore: "81",
      examScore: "88",
      finalScore: "85",
      achievementLevel: "Exceeding Expectation",
    },
    {
      subjectCode: "ENG",
      subjectName: "English",
      assessmentComponent: "CAT and end-term exam",
      score: "82%",
      percentage: "82%",
      grade: "A-",
      teacherComment: "Exceeding Expectation",
      teacherName: "Mr. Otieno",
      catScore: "78",
      examScore: "84",
      finalScore: "82",
      achievementLevel: "Exceeding Expectation",
    },
  ],
  academicSummary: {
    totalScore: "578",
    meanScore: "82.6",
    percentage: "82.6%",
    overallGrade: "A-",
    classPosition: "5 of 42",
  },
  coreCompetencies: [],
  values: [],
  projects: [],
  attendance: {
    totalDays: 60,
    daysPresent: 58,
    daysAbsent: 2,
    percentage: "96.7%",
  },
  conduct: {
    generalConduct: "Excellent",
  },
  comments: {
    classTeacher: "Amani has shown strong academic growth and consistent effort across most subjects.",
    principalDeputy: "An impressive overall performance. Keep up the focus, discipline, and consistency.",
  },
  descriptorLegend: [
    { code: "EE", label: "Exceeding Expectations" },
    { code: "ME", label: "Meeting Expectations" },
  ],
  gradingScale: [
    { grade: "A", range: "80-100", points: "12" },
    { grade: "B", range: "70-79", points: "10" },
  ],
  signatures: [
    { role: "Class Teacher", name: "Ms. Wanjiku" },
    { role: "Principal", name: "Dr. Kamau" },
  ],
  verification: {
    generatedBy: "MyShule Reports",
    generatedAt: "2026-08-12T09:00:00.000Z",
    qrValue: "verify:RC-2026-0001",
    securityNote: "Generated securely by MyShule School Management System",
  },
  permissions: {
    canViewFees: false,
    canViewConduct: true,
    canViewMarksSupplement: true,
    canApprove: false,
    canPublish: false,
    canDownload: true,
  },
  auditTrail: [],
  analytics: {
    attendancePercentage: "96.7%",
    bestSubject: "Computer Studies",
    improvement: "+4.6%",
    conduct: "Excellent",
  },
};

function getReportSection(name: string) {
  const section = screen
    .getByTestId("report-card-document")
    .querySelector<HTMLElement>(`[data-report-section="${name}"]`);

  expect(section).not.toBeNull();
  return section!;
}

describe("reference report-card layout", () => {
  it.each([false, true])("shows every subject with full names and matching chart colours (history: %s)", (withHistory) => {
    const names = ["Agriculture", "Biology", "Chemistry", "History", "Kiswahili", "Mathematics", "Computer Studies", "English", "Physics", "Christian Religious Education", "Business Studies", "Home Science"];
    const report: ReportCardDocumentData = {
      ...referenceReport,
      marksSupplement: [
        ...names.map((subjectName, index) => ({ subjectName, percentage: `${index * 8}%` })),
        { subjectName: "Unassessed subject", score: "Absent" },
      ],
      analytics: withHistory ? {
        subjectHistory: ["exam-one", "exam-two"].flatMap((examSeriesId, term) => names.map((subjectName, index) => ({
          examSeriesId, label: `Term ${term + 1}`, subjectId: `subject-${index}`, subjectName, percentage: index * 8,
        }))),
      } : undefined,
    };
    renderWithProviders(<ReportCardDocument report={report} />);
    const key = screen.getByRole("list", { name: "Subject performance key" });
    const items = within(key).getAllByRole("listitem");
    expect(items).toHaveLength(names.length);
    for (const name of names) expect(within(key).getByText(name, { exact: true })).toBeInTheDocument();
    expect(key).not.toHaveTextContent("Unassessed subject");
    expect(key.closest("svg")).toBeNull();
    const chart = screen.getByRole("img", { name: "Subject performance over recorded reporting periods" });
    const series = [...chart.querySelectorAll("g[data-subject-id]")];
    expect(series).toHaveLength(names.length);
    expect(new Set(series.map(group => group.querySelector("circle")?.getAttribute("fill"))).size).toBe(names.length);
    series.forEach((group, index) => {
      expect(group.querySelectorAll("circle")).toHaveLength(withHistory ? 2 : 1);
      expect(items[index].querySelector("[aria-hidden]")).toHaveStyle({ backgroundColor: group.querySelector("circle")!.getAttribute("fill")! });
      expect(items[index]).toHaveTextContent(group.querySelector("title")!.textContent!);
    });
  });

  it("renders the approved information hierarchy and academic result columns", () => {
    renderWithProviders(<ReportCardDocument report={referenceReport} />);

    const reportCard = screen.getByTestId("report-card-document");
    expect(reportCard).toHaveAttribute("data-report-card-layout", "reference-a4");
    expect(reportCard).toHaveTextContent("Greenfield Academy");
    expect(reportCard).toHaveTextContent("Term 2, 2026");

    expect(getReportSection("header")).toHaveTextContent(/academic report card/i);

    const studentInformation = getReportSection("student-information");
    expect(studentInformation).toHaveTextContent(/student information/i);
    expect(studentInformation).toHaveTextContent("Amani Njoroge");
    expect(studentInformation).toHaveTextContent("GS-2048");
    expect(studentInformation).toHaveTextContent("Grade 8");
    expect(studentInformation).toHaveTextContent("North");
    expect(studentInformation).toHaveTextContent("58/60");

    const academicPerformance = getReportSection("academic-performance");
    expect(academicPerformance).toHaveTextContent(/academic performance/i);
    expect(within(academicPerformance).getAllByRole("columnheader")).toHaveLength(4);
    for (const heading of ["Subject", "Term 2, 2026", "Grade", "Achievement Level"]) {
      expect(within(academicPerformance).getByRole("columnheader", { name: heading })).toBeVisible();
    }
    expect(academicPerformance).toHaveTextContent("82.6%");
    expect(academicPerformance).toHaveTextContent("A-");

    expect(getReportSection("performance-analytics")).toHaveTextContent(/performance analytics/i);

    const summary = getReportSection("summary-overview");
    expect(summary).toHaveTextContent(/summary overview/i);
    expect(summary).toHaveTextContent("96.7%");
    expect(summary).toHaveTextContent("Computer Studies");
    expect(summary).toHaveTextContent("+4.6%");
    expect(summary).toHaveTextContent("Excellent");

    const comments = getReportSection("comments");
    expect(comments).toHaveTextContent(/class teacher comment/i);
    expect(comments).toHaveTextContent(/principal comment/i);

    expect(getReportSection("signatures")).toHaveTextContent(/class teacher signature/i);
    expect(getReportSection("signatures")).toHaveTextContent(/principal signature/i);
    expect(getReportSection("footer")).toHaveTextContent(/generated securely by myshule/i);
  });

  it.each(["End Term 1", "Mid Term", "End Term 3", "CAT 1"])("uses %s as the sole score column without exposing subject papers", (examName) => {
    const report = {
      ...referenceReport,
      academic: { ...referenceReport.academic, reportingPeriod: examName },
      marksSupplement: referenceReport.marksSupplement.map((row) => ({
        ...row,
        assessmentComponents: [
          { name: `${row.subjectName.toUpperCase()} Main Paper`, percentage: "90%" },
          { name: `${row.subjectName.toUpperCase()} Practical`, percentage: "70%" },
        ],
      })),
    };
    renderWithProviders(<ReportCardDocument report={report} />);
    const table = within(getReportSection("academic-performance")).getByRole("table");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent))
      .toEqual(["Subject", examName, "Grade", "Achievement Level"]);
    expect(within(table).getAllByRole("row")).toHaveLength(3);
    expect(within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)))
      .toEqual([
        ["Mathematics", "85%", "A", "Exceeding Expectation"],
        ["English", "82%", "A-", "Exceeding Expectation"],
      ]);
    expect(table).not.toHaveTextContent(/Main Paper|Practical|Final %|CAT %|Exam %/);
    expect(getReportSection("academic-performance")).toHaveTextContent("Average: 82.6%");
    expect(getReportSection("academic-performance")).toHaveTextContent("Overall Grade: A-");
    expect(getReportSection("academic-performance")).toHaveTextContent("Class Position: 5 of 42");
    expect(getReportSection("comments")).toHaveTextContent(referenceReport.comments.classTeacher!);
    expect(getReportSection("comments")).toHaveTextContent(referenceReport.comments.principalDeputy!);
  });

  it("keeps four columns for missing grades and shows zero and unassessed results truthfully", () => {
    renderWithProviders(<ReportCardDocument report={{
      ...referenceReport,
      marksSupplement: [
        { subjectName: "Biology", score: "0 / 100", percentage: "0%" },
        { subjectName: "Chemistry", score: "Absent" },
        { subjectName: "Computer", score: "Incomplete" },
        { subjectName: "English", score: "34 / 40" },
      ],
    }} />);
    const table = within(getReportSection("academic-performance")).getByRole("table");
    expect(within(table).getAllByRole("columnheader")).toHaveLength(4);
    expect(within(table).getAllByRole("row").slice(1).map((row) => within(row).getAllByRole("cell").map((cell) => cell.textContent)))
      .toEqual([
        ["Biology", "0%", "", ""],
        ["Chemistry", "Absent", "", ""],
        ["Computer", "Incomplete", "", ""],
        ["English", "85%", "", ""],
      ]);
  });

  it("omits unavailable assessment components and stale analytics instead of fabricating them", () => {
    const sparseReport: ReferenceReportCardData = {
      ...referenceReport,
      id: "sparse-reference-report-card",
      marksSupplement: [
        {
          subjectCode: "MAT",
          subjectName: "Mathematics",
          score: "80/100",
          percentage: "80%",
          finalScore: "80%",
          grade: "A",
          achievementLevel: "Excellent",
        },
      ],
      academicSummary: {
        percentage: "80%",
        overallGrade: "A",
      },
      analytics: undefined,
      attendance: undefined,
    };

    renderWithProviders(<ReportCardDocument report={sparseReport} />);

    const resultRow = within(getReportSection("academic-performance")).getByRole("row", {
      name: /mathematics/i,
    });
    const resultCells = within(resultRow).getAllByRole("cell");

    expect(resultCells).toHaveLength(4);
    expect(within(getReportSection("academic-performance")).queryByRole("columnheader", { name: "CAT %" })).not.toBeInTheDocument();
    expect(within(getReportSection("academic-performance")).queryByRole("columnheader", { name: "Exam %" })).not.toBeInTheDocument();
    expect(resultCells[1]).toHaveTextContent("80%");
    expect(resultCells[2]).toHaveTextContent("A");
    expect(resultCells[3]).toHaveTextContent("Excellent");

    const reportCard = screen.getByTestId("report-card-document");
    expect(reportCard).not.toHaveTextContent("5 of 42");
    expect(reportCard).not.toHaveTextContent("+4.6%");
    expect(reportCard).not.toHaveTextContent("Computer Studies");
  });

  it("declares a single-page A4 print contract", () => {
    renderWithProviders(<ReportCardDocument report={referenceReport} />);

    const reportCard = screen.getByTestId("report-card-document");
    expect(reportCard).toHaveClass("report-card-a4");
    expect(reportCard).toHaveAttribute("data-report-card-pages", "1");

    // JSDOM cannot paginate. These CSS constraints are the stable handoff to the
    // browser/PDF smoke test, which measures the rendered page at A4 print size.
    const globalStyles = readFileSync(resolve(__dirname, "../../src/app/globals.css"), "utf8");
    expect(globalStyles).toMatch(/@page\s*\{[\s\S]*?size:\s*A4\s+portrait/i);
    expect(globalStyles).toMatch(/\.report-card-a4\s*\{/);
    expect(globalStyles).toMatch(/max-width:\s*210mm/i);
    expect(globalStyles).toMatch(/max-height:\s*267mm/i);
    expect(globalStyles).toMatch(/box-sizing:\s*border-box/i);
    expect(globalStyles).toMatch(/(?:break-inside|page-break-inside):\s*avoid/i);
  });
});
