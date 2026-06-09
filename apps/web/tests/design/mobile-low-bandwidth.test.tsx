import { screen } from "@testing-library/react";

import { OperationalStatePanel } from "@/components/operational/operational-state-panel";
import {
  MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS,
  getOperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";

import { renderWithProviders } from "./test-utils";

describe("mobile and low-bandwidth operational behavior", () => {
  it("keeps mobile dashboards action-first and drawer-based for every role", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      expect(blueprint.mobileBehavior).toEqual(
        expect.arrayContaining(["collapse sidebar into drawer", "keep urgent actions first"]),
      );
      expect(blueprint.firstViewport.join(" ")).toMatch(
        /pending|urgent|missing|today|current|visitors|active|failed|tenant|critical|absent|exam|lessons|clinic|live|applications|books|stock|boarding|routes|sessions|low|coverage|delays|cases|alerts/i,
      );
      expect(blueprint.queues[0]?.actions.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("keeps low-bandwidth recovery visible instead of hiding offline work", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      expect(blueprint.lowBandwidthBehavior).toEqual(
        expect.arrayContaining(["show cached queue", "allow offline draft", "retry sync visibly"]),
      );
      expect(blueprint.states).toEqual(
        expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]),
      );
    }

    renderWithProviders(
      <OperationalStatePanel
        state="OFFLINE_DRAFT"
        title="Attendance saved locally"
        message="Attendance saved locally, but sync failed. Sync again."
      />,
    );

    expect(screen.getByText(/OFFLINE_DRAFT/i)).toBeVisible();
    expect(screen.getByText(/Attendance saved locally, but sync failed/i)).toBeVisible();
  });

  it("keeps sensitive and self-service roles scoped on mobile search", () => {
    expect(getOperationalRoleBlueprint("guidance-counselling")?.searchMode).toBe("SENSITIVE_SCOPED");
    expect(getOperationalRoleBlueprint("discipline-master")?.searchMode).toBe("SENSITIVE_SCOPED");
    expect(getOperationalRoleBlueprint("nurse")?.searchMode).toBe("SENSITIVE_SCOPED");
    expect(getOperationalRoleBlueprint("parent")?.searchMode).toBe("SELF_ONLY");
    expect(getOperationalRoleBlueprint("student")?.searchMode).toBe("SELF_ONLY");
  });
});
