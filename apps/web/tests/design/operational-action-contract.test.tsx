import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  OperationalActionButton,
  type OperationalActionContract,
} from "@/components/operational/operational-action-button";

import { renderWithProviders } from "./test-utils";

const baseAction: OperationalActionContract = {
  actionId: "approve-results",
  label: "Approve Results",
  capability: "CAN_APPROVE_RESULTS",
  workflowBinding: "exam-release",
  executionHandler: "workflows.examRelease.approve",
  eventContract: ["RESULTS_APPROVED", "PRINCIPAL_APPROVAL_GRANTED"],
  auditEvent: "audit.approve-results",
  confirmation: "NONE",
  retryPolicy: "RETRY",
  fallbackHandler: "fallback.workflows.examRelease.approve",
  health: "ACTIVE",
};

describe("OperationalActionButton", () => {
  it("keeps every action health state visible with school-friendly action context", () => {
    const healthStates: OperationalActionContract["health"][] = [
      "ACTIVE",
      "LOADING",
      "SUCCESS",
      "LOCKED",
      "DEGRADED",
      "FAILED",
      "VALIDATION_FAILED",
      "RETRY",
      "OFFLINE_DRAFT",
    ];

    renderWithProviders(
      <div>
        {healthStates.map((health) => (
          <OperationalActionButton
            key={health}
            action={{ ...baseAction, actionId: `approve-results-${health}`, health }}
          />
        ))}
      </div>,
    );

    const labels = [
      ["Ready", /^approve results ready$/i],
      ["Sending", /^approve results sending$/i],
      ["Done", /^approve results done$/i],
      ["No permission", /^approve results no permission$/i],
      ["Retry available", /^approve results retry available$/i],
      ["Needs retry", /^approve results needs retry$/i],
      ["Check form", /^approve results check form$/i],
      ["Retry", /^approve results retry$/i],
      ["Saved offline", /^approve results saved offline$/i],
    ] as const;

    for (const [label, name] of labels) {
      expect(screen.getByRole("button", { name })).toBeVisible();
      expect(screen.getByText(label)).toBeVisible();
    }

    expect(screen.getAllByText(/reporting record with the user and time/i).length).toBeGreaterThan(0);
  });

  it("does not hide locked, degraded, or failed actions and routes active clicks through the execution contract", async () => {
    const user = userEvent.setup();
    const onExecute = jest.fn();

    renderWithProviders(
      <div>
        <OperationalActionButton action={{ ...baseAction, health: "LOCKED" }} onExecute={onExecute} />
        <OperationalActionButton
          action={{ ...baseAction, actionId: "return-correction", label: "Return Correction", health: "DEGRADED" }}
          onExecute={onExecute}
        />
        <OperationalActionButton
          action={{ ...baseAction, actionId: "retry-dispatch", label: "Retry Dispatch", health: "FAILED" }}
          onExecute={onExecute}
        />
        <OperationalActionButton
          action={{ ...baseAction, actionId: "send-dean", label: "Send to Dean", health: "ACTIVE" }}
          onExecute={onExecute}
        />
      </div>,
    );

    expect(screen.getByRole("button", { name: /approve results no permission/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /return correction retry available/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /retry dispatch needs retry/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /send to dean ready/i }));

    expect(onExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: "send-dean",
        workflowBinding: "exam-release",
        auditEvent: "audit.approve-results",
      }),
    );
  });

  it("executes locally with confirmation and feedback when no backend handler is provided", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <OperationalActionButton
        action={{
          ...baseAction,
          actionId: "delete-visitor",
          label: "Delete Visitor Record",
          confirmation: "DANGER_CONFIRM",
          health: "ACTIVE",
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: /delete visitor record ready/i }));
    expect(screen.getByRole("dialog", { name: /confirm delete visitor record/i })).toBeVisible();
    expect(screen.getByText(/keep a staff\/time record/i)).toBeVisible();
    expect(screen.queryByText(/exam-release/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/audit\.approve-results/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /yes, continue/i }));
    expect(screen.getByText(/delete visitor record sent/i)).toBeVisible();
  });
});
