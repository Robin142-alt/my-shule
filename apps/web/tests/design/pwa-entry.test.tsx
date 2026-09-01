import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { InstalledAppEntry } from "@/components/pwa/installed-app-entry";
import { useExperienceSession } from "@/lib/auth/use-experience-session";
import { routerReplaceMock } from "./router-mock";

jest.mock("@/lib/auth/use-experience-session", () => ({
  useExperienceSession: jest.fn(),
}));

const useExperienceSessionMock = jest.mocked(useExperienceSession);

function sessionState(
  overrides: Partial<ReturnType<typeof useExperienceSession>> = {},
): ReturnType<typeof useExperienceSession> {
  return {
    session: null,
    user: null,
    isLoading: false,
    isSubmitting: false,
    isSwitchingRole: false,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    loadDashboardRoles: jest.fn(),
    switchRole: jest.fn(),
    clearError: jest.fn(),
    ...overrides,
  } as ReturnType<typeof useExperienceSession>;
}

describe("installed MyShule app entry", () => {
  beforeEach(() => {
    useExperienceSessionMock.mockReset();
  });

  it("shows only the existing School and Parent entry routes when signed out", async () => {
    render(<InstalledAppEntry initialAudience={null} />);

    const entry = await screen.findByTestId("installed-app-entry");
    expect(entry).toHaveTextContent("Choose how you use MyShule");
    expect(
      screen.getByRole("link", { name: /School Staff and school operations/i }),
    ).toHaveAttribute("href", "/school/login?source=app");
    expect(
      screen.getByRole("link", {
        name: /Parent Linked learner and family portal/i,
      }),
    ).toHaveAttribute("href", "/parent/login?source=app");
    expect(
      screen.queryByText(/Pricing|Features|About|Request Demo/i),
    ).not.toBeInTheDocument();
  });

  it("validates only the active school audience and opens its backend-derived home", async () => {
    useExperienceSessionMock.mockReturnValue(
      sessionState({
        session: {
          audience: "school",
          homePath: "/school/teacher",
        } as never,
      }),
    );

    render(<InstalledAppEntry initialAudience="school" />);

    expect(useExperienceSessionMock).toHaveBeenCalledWith("school", {
      autoLoad: true,
    });
    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith("/school/teacher"),
    );
    expect(screen.getByTestId("installed-app-splash")).toHaveTextContent(
      "Opening your dashboard",
    );
  });

  it("opens the existing parent dashboard from a valid portal session", async () => {
    useExperienceSessionMock.mockReturnValue(
      sessionState({
        session: {
          audience: "portal",
          homePath: "/portal/parent",
        } as never,
      }),
    );

    render(<InstalledAppEntry initialAudience="portal" />);

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith("/portal/parent"),
    );
  });

  it("returns an expired session to the chooser without guessing another audience", () => {
    useExperienceSessionMock.mockReturnValue(sessionState());

    render(<InstalledAppEntry initialAudience="school" />);

    expect(screen.getByTestId("installed-app-entry")).toBeVisible();
    expect(useExperienceSessionMock).toHaveBeenCalledTimes(1);
    expect(useExperienceSessionMock).toHaveBeenCalledWith("school", {
      autoLoad: true,
    });
  });

  it("keeps transient verification failures visible and retries the same audience", async () => {
    useExperienceSessionMock
      .mockReturnValueOnce(sessionState({ error: "Service unavailable" }))
      .mockReturnValueOnce(sessionState({ isLoading: true }));

    render(<InstalledAppEntry initialAudience="portal" />);

    expect(screen.getByTestId("installed-app-session-error")).toHaveTextContent(
      "Your account has not been signed out",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() =>
      expect(useExperienceSessionMock).toHaveBeenCalledTimes(2),
    );
    expect(screen.getByTestId("installed-app-splash")).toBeVisible();
  });
});
