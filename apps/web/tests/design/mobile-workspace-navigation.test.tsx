import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";
import { ModuleShell } from "@/components/modules/shared/module-shell";

const items = [
  { id: "overview", label: "Overview", group: "Command" },
  { id: "attendance", label: "Attendance", group: "Teaching" },
  { id: "classes", label: "My Classes", group: "Teaching" },
  { id: "marks", label: "Exams & Marks", group: "Assessments" },
  { id: "progress", label: "Learner Progress", group: "Assessments" },
  { id: "parents", label: "Parent Communication", group: "Support" },
  { id: "resources", label: "Teaching Resources", group: "Operations" },
  { id: "reports", label: "Reports & Downloads", group: "Operations" },
  { id: "profile", label: "My Profile", group: "Account" },
];

function NavigationHarness() {
  const [value, setValue] = useState("overview");
  return (
    <MobileWorkspaceNavigation
      label="Teacher workspace"
      items={items}
      value={value}
      onValueChange={setValue}
      testId="mobile-workspace-navigation"
    />
  );
}

describe("mobile workspace navigation", () => {
  afterEach(() => jest.restoreAllMocks());

  it("uses the edge tab on mobile and keeps all drawer dismissal paths and focus restoration", async () => {
    const matchMedia = window.matchMedia;
    jest.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...matchMedia(query), matches: query === "(max-width: 1023px)",
    }));
    const user = userEvent.setup();
    render(<NavigationHarness />);
    const trigger = screen.getByRole("button", { name: "Open Teacher workspace sidebar" });
    expect(trigger).toHaveClass("app-side-menu-tab");
    expect(trigger.parentElement).toBe(document.body);
    expect(within(screen.getByTestId("mobile-workspace-navigation")).queryByRole("button")).toBeNull();
    expect(trigger).toHaveAccessibleDescription("Overview");

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Close teacher workspace sidebar" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Teacher workspace" });
    await user.click(dialog.previousElementSibling as HTMLElement);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Attendance", exact: true }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveAccessibleDescription("Attendance");
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("preserves module descriptions, badges, footer actions and section callbacks in the drawer", async () => {
    const user = userEvent.setup();
    const change = jest.fn();
    const retry = jest.fn();
    render(<ModuleShell eyebrow="Stores" title="Inventory" description="School stock" sections={[
      { id: "stock", label: "Stock", description: "Available items", badge: "3 low", tone: "warning" },
      { id: "requests", label: "Requests", description: "Review staff requests", badge: "2 pending" },
    ]} activeSection="stock" onSectionChange={change} sidebarFooter={<button onClick={retry}>Retry stock data</button>}>
      <p>Inventory records</p>
    </ModuleShell>);
    const trigger = screen.getByRole("button", { name: "Open Inventory sections sidebar" });
    await user.click(trigger);
    const drawer = screen.getByRole("dialog", { name: "Inventory sections" });
    expect(within(drawer).getByText("3 low")).toBeVisible();
    expect(within(drawer).getByText("Available items")).toBeVisible();
    await user.click(within(drawer).getByRole("button", { name: "Retry stock data" }));
    expect(retry).toHaveBeenCalledTimes(1);
    await user.click(within(drawer).getByRole("button", { name: /Requests.*2 pending.*Review staff requests/ }));
    expect(change).toHaveBeenCalledWith("requests");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("replaces the native picker with a grouped, searchable sidebar and restores focus", async () => {
    const user = userEvent.setup();
    render(<NavigationHarness />);

    const trigger = screen.getByRole("button", { name: /Open Teacher workspace sidebar/i });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Teacher workspace" });
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(document.body.style.overflow).toBe("hidden");
    expect(within(dialog).getByRole("heading", { name: "Assessments" })).toBeVisible();
    expect(within(dialog).getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");

    await waitFor(() => expect(dialog).toHaveFocus());
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "My Profile" })).toHaveFocus();

    await user.type(within(dialog).getByRole("searchbox", { name: /Search workspaces/i }), "reports");
    expect(within(dialog).getByRole("button", { name: "Reports & Downloads" })).toBeVisible();
    expect(within(dialog).queryByRole("button", { name: "Overview" })).not.toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Reports & Downloads" }));

    expect(screen.queryByRole("dialog", { name: "Teacher workspace" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveAccessibleName(/Open Teacher workspace sidebar/i);
    expect(trigger).toHaveAccessibleDescription(/Reports & Downloads/i);
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "Teacher workspace" })).toBeVisible();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog", { name: "Teacher workspace" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
