import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdmissionsModuleScreen } from "@/components/modules/admissions/admissions-module-screen";

import { createDashboardSnapshot, renderWithProviders } from "./test-utils";

jest.setTimeout(90_000);

jest.mock("@/lib/modules/admissions-data", () => {
  const actual = jest.requireActual("@/lib/modules/admissions-data");
  return {
    ...actual,
    createAdmissionsDataset: () => ({
      ...actual.createAdmissionsDataset(),
      applications: [{
        id: "class-source-grade-7",
        applicationNumber: "APP-CLASS-001",
        applicantName: "Configured class source",
        admissionNumber: "",
        classApplying: "Grade 7",
        parentName: "",
        parentPhone: "",
        status: "pending",
        dateApplied: "2026-01-01",
        gender: "",
        dateOfBirth: "",
        birthCertificateNumber: "",
        nationality: "Kenyan",
        previousSchool: "",
        kcpeResults: "",
        cbcLevel: "",
        parentEmail: "",
        occupation: "",
        relationship: "",
        allergies: "",
        conditions: "",
        emergencyContact: "",
        reviewNote: "",
      }],
    }),
  };
});

describe("admissions workspace", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/dashboard/admissions?view=new-registration");
  });

  function renderAdmissionsWorkspace() {
    return renderWithProviders(
      <AdmissionsModuleScreen
        role="admissions"
        snapshot={createDashboardSnapshot("admissions")}
        online
      />,
    );
  }

  function renderAdmissionsWorkspaceWithTransport(enabled: boolean) {
    return renderWithProviders(
      <AdmissionsModuleScreen
        role="admissions"
        snapshot={createDashboardSnapshot("admissions", true, {
          tenant: {
            ...createDashboardSnapshot("admissions").tenant,
            transportEnabled: enabled,
          },
        } as never)}
        online
      />,
    );
  }

  it("hides transport allocation controls unless the tenant enables transport", async () => {
    window.history.pushState({}, "", "/dashboard/admissions?view=class-allocation");

    renderAdmissionsWorkspaceWithTransport(false);

    expect(screen.queryByText(/transport route/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/route assignment/i)).not.toBeInTheDocument();

    const assignButtons = screen.getAllByRole("button", { name: /assign allocation/i });
    await userEvent.click(assignButtons.at(-1)!);

    expect(screen.queryByText(/transport route/i)).not.toBeInTheDocument();
  });

  it("shows route assignment controls when the tenant enables transport", async () => {
    window.history.pushState({}, "", "/dashboard/admissions?view=class-allocation");

    renderAdmissionsWorkspaceWithTransport(true);

    expect(screen.getByText(/transport route/i)).toBeVisible();

    const assignButtons = screen.getAllByRole("button", { name: /assign allocation/i });
    await userEvent.click(assignButtons.at(-1)!);

    expect(screen.getAllByText(/transport route/i).length).toBeGreaterThan(0);
  });
});
