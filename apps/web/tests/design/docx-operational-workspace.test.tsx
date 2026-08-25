import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DocxOperationalWorkspace } from "@/components/school/docx-operational-workspace";

import { renderWithProviders } from "./test-utils";

describe("DocxOperationalWorkspace", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.history.pushState({}, "", "/school/kb-high/exams-manager/schools");
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "csrf-token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "workflow-event-1" }),
      }) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("renders generated workspace contracts as actionable school workflow surfaces", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DocxOperationalWorkspace moduleId="schools" />);

    expect(screen.getByRole("heading", { name: "Schools" })).toBeVisible();
    expect(screen.getByRole("button", { name: /create school ready/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Schools Table" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Submit" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "County" })).toBeVisible();
    expect(screen.getByText(/no live records are waiting in this workspace/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /create school ready/i }));

    expect(global.fetch).toHaveBeenCalledWith("/api/auth/csrf", expect.any(Object));
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/workflow/events",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-myshule-csrf": "csrf-token",
        }),
      }),
    );
    const workflowRequest = (global.fetch as jest.Mock).mock.calls.find(
      ([url]) => url === "/api/workflow/events",
    );
    expect(JSON.parse(workflowRequest?.[1]?.body ?? "{}").targetRoles).toEqual([
      "principal",
      "deputy_principal",
    ]);
    expect(await screen.findByText(/create school was recorded in the workflow event log/i)).toBeVisible();
  });
});
