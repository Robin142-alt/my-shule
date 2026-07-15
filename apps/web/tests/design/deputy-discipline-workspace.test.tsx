import { screen } from "@testing-library/react";
import { createElement } from "react";

import { DeputyDisciplineWorkspace } from "@/components/school/deputy-principal/discipline-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

describe("deputy discipline workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders shaped incident payloads without crashing", async () => {
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: {
        incidents: [
          {
            id: "incident-1",
            caseNo: "DISC-001",
            studentName: "Asha Njeri",
            incidentType: "Bullying report",
            severity: "High",
            status: "New",
          },
        ],
      },
    });

    renderWithProviders(createElement(DeputyDisciplineWorkspace));

    expect(await screen.findByText("DISC-001")).toBeVisible();
    expect(screen.getByText("Asha Njeri")).toBeVisible();
    expect(screen.queryByText(/No recent discipline cases/i)).not.toBeInTheDocument();
  });

  it("keeps a useful empty state when the payload is not a list", async () => {
    (useSchoolQuery as jest.Mock).mockReturnValue({ data: { metrics: { open: 0 } } });

    renderWithProviders(createElement(DeputyDisciplineWorkspace));

    expect(await screen.findByText(/No recent discipline cases found/i)).toBeVisible();
  });
});
