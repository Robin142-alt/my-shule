import { render, screen } from "@testing-library/react";

import { ReportsWorkspace } from "@/components/school/secretary-command-center-full";

const mockUseSchoolQuery = jest.fn();

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (...args: unknown[]) => mockUseSchoolQuery(...args),
}));

describe("secretary reports response contract", () => {
  beforeEach(() => {
    mockUseSchoolQuery.mockReset();
  });

  it("treats an unrelated dashboard summary object as an empty report result instead of mapping it", () => {
    mockUseSchoolQuery.mockReturnValue({
      data: { students: 104, staff: 18, classes: 7 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    expect(() => render(<ReportsWorkspace onNavigate={jest.fn()} />)).not.toThrow();
    expect(mockUseSchoolQuery).toHaveBeenCalledWith("/admin-command/secretary/reports");
    expect(screen.getByText(/No reports generated yet/i)).toBeInTheDocument();
  });

  it("renders the live nested reports contract returned by the secretary endpoint", () => {
    mockUseSchoolQuery.mockReturnValue({
      data: {
        metrics: { total_reports: 1, this_month: 1, pending: 0, available: 1 },
        reports: [{
          id: "71a4e2af-63de-48b2-a1e6-dae14b881034",
          title: "Front office operations report",
          type: "Visitor Log",
          period: "current_month",
          generated_by: "Secretary",
          generated_at: "2026-08-15T06:30:00.000Z",
          status: "Ready",
          file_format: "csv",
        }],
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<ReportsWorkspace onNavigate={jest.fn()} />);

    expect(screen.getByText("Front office operations report")).toBeInTheDocument();
    expect(screen.getByText("Visitor Log")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
