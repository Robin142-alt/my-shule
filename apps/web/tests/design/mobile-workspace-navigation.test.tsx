import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { MobileWorkspaceNavigation } from "@/components/shared/mobile-workspace-navigation";

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
