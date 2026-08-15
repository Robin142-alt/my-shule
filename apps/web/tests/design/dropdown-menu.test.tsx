import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function MenuHarness({ onPublish = jest.fn() }: { onPublish?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Exam actions">Actions</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onPublish}>Publish results</DropdownMenuItem>
        <DropdownMenuItem disabled>Delete exam</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DialogMenuHarness() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Student actions">Actions</button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem asChild>
              <button type="button">Request guidance</button>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Request Principal Guidance</DialogTitle>
            <DialogDescription>Escalate this student case.</DialogDescription>
          </DialogContent>
        </Dialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe("dropdown menu", () => {
  it("opens on tap, exposes menu semantics, selects once, and restores focus on Escape", async () => {
    const user = userEvent.setup();
    const onPublish = jest.fn();
    render(<MenuHarness onPublish={onPublish} />);

    const trigger = screen.getByRole("button", { name: "Exam actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);
    const menu = screen.getByRole("menu");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(menu).toHaveClass("fixed");
    await waitFor(() =>
      expect(within(menu).getByRole("menuitem", { name: "Publish results" })).toHaveFocus(),
    );
    expect(within(menu).getByRole("menuitem", { name: "Delete exam" })).toHaveAttribute("aria-disabled", "true");

    await user.click(within(menu).getByRole("menuitem", { name: "Publish results" }));
    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps a dialog-triggering menu item mounted after the menu closes", async () => {
    const user = userEvent.setup();
    render(<DialogMenuHarness />);

    await user.click(screen.getByRole("button", { name: "Student actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Request guidance" }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Request Principal Guidance" })).toBeVisible();
  });

  it("does not steal focus from an outside control used to dismiss the menu", async () => {
    const user = userEvent.setup();
    render(
      <>
        <MenuHarness />
        <button type="button">Outside control</button>
      </>,
    );

    await user.click(screen.getByRole("button", { name: "Exam actions" }));
    const outside = screen.getByRole("button", { name: "Outside control" });
    await user.click(outside);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(outside).toHaveFocus();
  });
});
