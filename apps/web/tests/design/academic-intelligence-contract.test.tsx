import { screen } from "@testing-library/react";

import { AcademicIntelligenceWorkspace } from "@/components/school/academic-intelligence-workspace";

import { renderWithProviders } from "./test-utils";

const mockUseSchoolQuery = jest.fn();

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (...args: unknown[]) => mockUseSchoolQuery(...args),
}));

describe("AcademicIntelligenceWorkspace live contract", () => {
  beforeEach(() => {
    mockUseSchoolQuery.mockReset();
  });

  it("fails visibly instead of rendering unrelated or incomplete API data", async () => {
    mockUseSchoolQuery.mockReturnValue({
      data: { data: ["students", "academics", "exams"] },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProviders(<AcademicIntelligenceWorkspace audience="hod" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /returned an incomplete analytics response/i,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /No values were displayed as real school data/i,
    );
    expect(screen.queryByText(/School average/i)).not.toBeInTheDocument();
  });

  it.each(["hod", "hos"] as const)("explains publication before %s analytics become available", async (audience) => {
    mockUseSchoolQuery.mockReturnValue({
      data: {
        scope: { level: "department", role: "hod" },
        kpis: {
          school_average: null,
          pending_reviews: 0,
          missing_marks_alerts: 0,
          active_exams: 0,
        },
        trends: [],
        subjectPerformance: [],
        studentProgress: {
          topPerformers: [],
          topImprovers: [],
          atRiskStudents: [],
        },
        data_quality: {
          final_mark_count: 0,
          explicit_evidence_count: 0,
          missing_or_incomplete_count: 0,
        },
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProviders(<AcademicIntelligenceWorkspace audience={audience} />);

    expect(await screen.findByText(/No published exam results yet/i)).toBeVisible();
    expect(screen.getByText(/after the Principal publishes/)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Open marks workflow/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Department scoped/i)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
