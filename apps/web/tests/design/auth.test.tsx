import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PortalLoginView } from "@/components/auth/portal-login-view";
import { SchoolLoginView } from "@/components/auth/school-login-view";
import { SuperadminLoginView } from "@/components/auth/superadmin-login-view";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";

import { routerPushMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

describe("auth demo credentials", () => {
  test("shows super admin demo credentials and signs in with the documented password", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SuperadminLoginView />);

    expect(screen.getByText(/demo access/i)).toBeVisible();
    expect(screen.getByText(/owner@shulehub\.com/i)).toBeVisible();
    expect(screen.getByText(/Platform#2026/i)).toBeVisible();
    expect(screen.getByText(/246810/i)).toBeVisible();

    await user.type(screen.getByLabelText(/^email$/i), "owner@shulehub.com");
    await user.type(
      screen.getByLabelText(/^password$/i),
      "Platform#2026",
    );
    await user.click(
      screen.getByRole("button", { name: /continue securely/i }),
    );

    await screen.findByText(/credentials confirmed/i);

    await user.type(
      screen.getByLabelText(/6-digit verification code/i),
      "246810",
    );
    await user.click(
      screen.getByRole("button", { name: /verify and continue/i }),
    );

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/superadmin"),
    );
  });

  test("shows school staff demo credentials and routes bursar access from the documented password", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolLoginView
        resolution={resolveSchoolBranding("barakaacademy.app.com")}
      />,
    );

    expect(screen.getByText(/demo staff access/i)).toBeVisible();
    expect(screen.getByText(/bursar@barakaacademy\.sch\.ke/i)).toBeVisible();
    expect(screen.getAllByText(/School#2026/i).length).toBeGreaterThan(0);

    await user.type(
      screen.getByLabelText(/email or phone number/i),
      "bursar@barakaacademy.sch.ke",
    );
    await user.type(
      screen.getByLabelText(/^password$/i),
      "School#2026",
    );
    await user.click(screen.getByRole("button", { name: /sign in securely/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/school/bursar"),
    );
  });

  test("shows parent and student demo credentials and signs a student in with the documented password", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalLoginView />);

    expect(screen.getByText(/demo portal access/i)).toBeVisible();
    expect(screen.getByText(/SH-24011/i)).toBeVisible();
    expect(screen.getAllByText(/Portal#2026/i).length).toBeGreaterThan(0);

    await user.type(
      screen.getByLabelText(/admission number or phone/i),
      "SH-24011",
    );
    await user.type(
      screen.getByLabelText(/password or pin/i),
      "Portal#2026",
    );
    await user.click(screen.getByRole("button", { name: /open portal/i }));

    await waitFor(() =>
      expect(routerPushMock).toHaveBeenCalledWith("/portal/student"),
    );
  });
});
