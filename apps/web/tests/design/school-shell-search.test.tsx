import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolShell } from "@/components/layouts/school-shell";

import { routerPushMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

describe("SchoolShell search", () => {
  it("lets principal-style roles search real school records and open the matching desk", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolShell
        role="principal"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Principal Wanjiku"
        userRole="Principal"
      >
        <main>Dashboard content</main>
      </SchoolShell>,
    );

    await user.type(screen.getByRole("searchbox", { name: /school search/i }), "Brian");

    expect(screen.getByText("Brian Otieno")).toBeVisible();
    await user.click(screen.getAllByRole("button", { name: /brian otieno/i })[0]);

    expect(routerPushMock).toHaveBeenCalledWith("/school/principal/students");
  });

  it("does not expose broad global search to role dashboards that should only see their desk", () => {
    renderWithProviders(
      <SchoolShell
        role="teacher"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Mr. Otieno"
        userRole="Teacher"
      >
        <main>Teacher content</main>
      </SchoolShell>,
    );

    expect(screen.queryByRole("searchbox", { name: /school search/i })).not.toBeInTheDocument();
  });

  it("does not expose broad global search to admin dashboards", () => {
    renderWithProviders(
      <SchoolShell
        role="admin"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Admin User"
        userRole="Admin"
      >
        <main>Admin content</main>
      </SchoolShell>,
    );

    expect(screen.queryByRole("searchbox", { name: /school search/i })).not.toBeInTheDocument();
  });

  it("executes practical actions from school search results", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolShell
        role="accountant"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Mrs. Achieng"
        userRole="Accountant"
      >
        <main>Accountant content</main>
      </SchoolShell>,
    );

    await user.type(screen.getByRole("searchbox", { name: /school search/i }), "QEX7ABC123");

    expect(screen.getByText("M-Pesa QEX7ABC123")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /retry callback verification/i }));

    expect(routerPushMock).toHaveBeenCalledWith("/school/accountant/mpesa?code=QEX7ABC123&action=retry");
  });

  it("opens school notifications and account settings instead of leaving topbar buttons inert", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolShell
        role="principal"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Principal Wanjiku"
        userRole="Principal"
      >
        <main>Dashboard content</main>
      </SchoolShell>,
    );

    await user.click(screen.getByRole("button", { name: /open school notifications/i }));
    expect(screen.getByRole("button", { name: /Attendance registers/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Principal Wanjiku/i }));
    expect(routerPushMock).toHaveBeenCalledWith("/school/principal/settings");
  });
});
