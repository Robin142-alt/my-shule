import { screen } from "@testing-library/react";

import { OperationalBlueprintWorkspace } from "@/components/school/operational-blueprint-workspace";
import {
  EXTREME_ERP_REQUIRED_WORKSPACES,
  extremeErpBlueprints,
  getExtremeErpBlueprint,
} from "@/lib/operational/extreme-erp-blueprints";
import { SCHOOL_SECTIONS } from "@/lib/routing/experience-routes";
import { fallbackModuleCatalog, getModuleCodeForSchoolSection } from "@/lib/module-access/module-access-map";

import { renderWithProviders } from "./test-utils";

describe("extreme frontend ERP reconstruction registry", () => {
  it("registers every required school operating-system workspace with operational contracts", () => {
    expect(extremeErpBlueprints.map((blueprint) => blueprint.id)).toEqual(
      expect.arrayContaining(EXTREME_ERP_REQUIRED_WORKSPACES),
    );

    for (const workspaceId of EXTREME_ERP_REQUIRED_WORKSPACES) {
      const blueprint = getExtremeErpBlueprint(workspaceId);

      expect(blueprint).toBeDefined();
      expect(blueprint?.urgentActions.length).toBeGreaterThan(0);
      expect(blueprint?.queues.length).toBeGreaterThan(0);
      expect(blueprint?.tables.length).toBeGreaterThan(0);
      expect(blueprint?.forms.length).toBeGreaterThan(0);
      expect(blueprint?.printOutputs.length).toBeGreaterThan(0);
      expect(blueprint?.states).toEqual(
        expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]),
      );

      for (const queue of blueprint?.queues ?? []) {
        expect(queue.actions.length).toBeGreaterThan(0);
        expect(queue.workflow).toMatch(/->/);
        expect(queue.auditEvent).toMatch(/[A-Z_]+/);
      }

      for (const form of blueprint?.forms ?? []) {
        expect(form.fields.length).toBeGreaterThan(0);
        expect(form.footerActions).toEqual(expect.arrayContaining(["Cancel", "Save Draft", "Submit"]));
        expect(form.auditAction).toMatch(/^audit\./);
      }
    }
  });

  it("exposes the new workspaces as school sections with module mappings", () => {
    for (const workspaceId of EXTREME_ERP_REQUIRED_WORKSPACES) {
      expect(SCHOOL_SECTIONS).toContain(workspaceId);
      expect(getModuleCodeForSchoolSection(workspaceId)).toBeTruthy();
    }

    expect(fallbackModuleCatalog.map((module) => module.code)).toEqual(
      expect.arrayContaining([
        "school_calendar",
        "meals_canteen",
        "co_curricular",
        "ict_assets",
        "document_printing",
        "universal_approvals",
      ]),
    );
  });

  it("renders Kenyan operational actions, queues, forms, print outputs, and failure states", () => {
    renderWithProviders(<OperationalBlueprintWorkspace blueprint={getExtremeErpBlueprint("document-printing")!} />);

    expect(screen.getByText("Document and Printing Center")).toBeVisible();
    expect(screen.getByText(/What must be printed, sent, regenerated, or archived now/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /^Preview$/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^Print$/i })).toBeVisible();
    expect(screen.getAllByText(/Admission No: MYS\/2026\/001/i)[0]).toBeVisible();
    expect(screen.getAllByText(/Fee Balance: KES 18,500/i)[0]).toBeVisible();
    expect(screen.getAllByText(/FAILED/i)[0]).toBeVisible();
    expect(screen.getByText(/Retry Print/i)).toBeVisible();
    expect(screen.getByText(/Right details drawer/i)).toBeVisible();
    expect(screen.getByText(/Permission checks/i)).toBeVisible();
    expect(screen.getByText(/Low-bandwidth recovery/i)).toBeVisible();
    expect(screen.getByText(/actor, tenant, capability, workflow, events/i)).toBeVisible();
  });
});
