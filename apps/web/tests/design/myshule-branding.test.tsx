import { screen, within } from "@testing-library/react";
import { LayoutDashboard } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { AppSidebar } from "@/components/system/app-sidebar";

import { renderWithProviders } from "./test-utils";

function expectMyShuleMarks(container: HTMLElement, minimum: number) {
  const marks = Array.from(
    container.querySelectorAll<HTMLElement>('[data-myshule-brand-mark="true"]'),
  );

  expect(marks.length).toBeGreaterThanOrEqual(minimum);
  marks.forEach((mark) => {
    const src = mark.querySelector("img")?.getAttribute("src") ?? "";
    expect(decodeURIComponent(src)).toContain("/brand/myshule-mark-512.png");
  });
}

describe("MyShule platform branding", () => {
  test("uses the approved mark in the shared public header and footer", () => {
    const view = renderWithProviders(
      <PublicSiteShell>
        <div>Public content</div>
      </PublicSiteShell>,
    );

    const homeLink = screen.getByRole("link", { name: "MyShule home" });
    expectMyShuleMarks(view.container, 2);
    expect(within(homeLink).queryByText(/^MS$/)).not.toBeInTheDocument();
  });

  test("replaces auth initials on desktop and mobile without changing the access context", () => {
    const view = renderWithProviders(
      <AuthShell
        eyebrow="Secure access"
        heroTitle="Sign in"
        heroDescription="Open the right workspace."
        badge="School protected"
        helper="Use your verified account."
        highlights={[]}
        trustNotes={[]}
      >
        <div>Authentication form</div>
      </AuthShell>,
    );

    expectMyShuleMarks(view.container, 2);
    expect(screen.queryByText(/^SH$/)).not.toBeInTheDocument();
    expect(screen.getByText("School protected")).toBeVisible();
  });

  test("shows MyShule platform branding while retaining the tenant workspace identity", () => {
    const view = renderWithProviders(
      <AppSidebar
        variant="school"
        brand={{ title: "Lakeview School", subtitle: "Nairobi school ERP" }}
        navItems={[
          {
            id: "dashboard",
            label: "Dashboard",
            href: "/school/principal",
            icon: LayoutDashboard,
          },
        ]}
        activeHref="/school/principal"
        profile={{
          name: "Principal User",
          roleLabel: "Principal",
          contextLabel: "Lakeview School",
          roleKey: "principal",
        }}
        mobileOpen
        onClose={jest.fn()}
      />,
    );

    expectMyShuleMarks(view.container, 1);
    expect(screen.getAllByText("Lakeview School").length).toBeGreaterThan(0);
    expect(screen.getByText("Nairobi school ERP")).toBeVisible();
  });
});
