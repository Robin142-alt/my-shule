import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { HeaderPopover } from "@/components/shared/header-popover";

describe("header popover", () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: originalWidth });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: originalHeight });
  });

  it("uses a mobile dialog, traps focus, restores scroll, and closes with Escape", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    const user = userEvent.setup();

    render(
      <HeaderPopover
        label="Notifications"
        triggerLabel="Open notifications"
        title="Notifications"
        icon={<span aria-hidden="true">N</span>}
      >
        <button type="button">First action</button>
        <button type="button">Last action</button>
      </HeaderPopover>,
    );

    const trigger = screen.getByRole("button", { name: "Open notifications" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Notifications" });
    expect(dialog).toBeVisible();
    expect(document.body.style.overflow).toBe("hidden");

    await waitFor(() => expect(dialog).toHaveFocus());
    await user.tab({ shift: true });
    expect(within(dialog).getByRole("button", { name: "Last action" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Notifications" })).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
    await waitFor(() => expect(trigger).toHaveFocus());

  });

  it("clamps a wide tablet popover inside the viewport", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 768 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    const user = userEvent.setup();

    render(
      <HeaderPopover
        label="Tasks"
        triggerLabel="Open tasks"
        title="Task Queue"
        desktopWidth="sm:w-96"
        icon={<span aria-hidden="true">T</span>}
      >
        <p>No pending tasks.</p>
      </HeaderPopover>,
    );

    const trigger = screen.getByRole("button", { name: "Open tasks" });
    trigger.getBoundingClientRect = () => ({
      x: 12,
      y: 72,
      top: 72,
      right: 52,
      bottom: 112,
      left: 12,
      width: 40,
      height: 40,
      toJSON: () => ({}),
    });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Task Queue" });

    await waitFor(() => expect(dialog).toHaveStyle({ left: "12px" }));
    expect(dialog).toHaveStyle({ top: "120px", maxHeight: "468px" });
    expect(document.body.style.overflow).toBe("");
  });

  it("keeps focus on an outside control used to dismiss the desktop popover", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    const user = userEvent.setup();

    render(
      <>
        <HeaderPopover
          label="Approvals"
          triggerLabel="Open approvals"
          title="Approval Inbox"
          icon={<span aria-hidden="true">A</span>}
        >
          <p>No pending approvals.</p>
        </HeaderPopover>
        <button type="button">Open profile</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Open approvals" }));
    const outside = screen.getByRole("button", { name: "Open profile" });
    await user.click(outside);

    expect(screen.queryByRole("dialog", { name: "Approval Inbox" })).not.toBeInTheDocument();
    expect(outside).toHaveFocus();
  });
});
