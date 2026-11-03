import { fireEvent, render, screen } from "@testing-library/react";

import { PrincipalCommunicationWorkspace } from "@/components/school/principal-dashboard/communication-workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/components/school/principal-dashboard/verified-tenant-api", () => ({
  useVerifiedPrincipalDashboardApi: () => jest.fn(),
}));

jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: () => ({ hasPermission: () => false }),
}));

describe("Principal communication delivery status", () => {
  it("presents provider acceptance and ambiguous delivery as distinct truthful states", () => {
    jest.mocked(useSchoolQuery).mockImplementation((path: string | null) => {
      if (path === "/admin-command/principal/communication") {
        return {
          data: {
            status: "active",
            smsBalance: null,
            providerAcceptedToday: 7,
            failedDeliveries: 1,
            pendingMessages: 3,
            deliveryUnknown: 2,
            communicationTrend: [],
            recentBroadcasts: [],
          },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        } as never;
      }

      return {
        data: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as never;
    });

    render(<PrincipalCommunicationWorkspace />);

    fireEvent.click(screen.getByRole("button", { name: "School broadcasts" }));
    expect(screen.getByText("SMS provider accepted today")).toBeVisible();
    expect(screen.getByText("Delivery needs review")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
    expect(screen.getByText("2")).toBeVisible();
    expect(screen.queryByText(/messages sent today/i)).not.toBeInTheDocument();
  });
});
