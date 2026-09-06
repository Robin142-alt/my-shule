import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { Toaster } from "sonner";

import { ToastContainer, WorkflowToast } from "@/components/shared/workflow-toast";

function advance(milliseconds: number) {
  act(() => {
    jest.advanceTimersByTime(milliseconds);
  });
}

describe("legacy workflow feedback in the shared viewport", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it("keeps errors visible until dismissed and removes the caller's notice", () => {
    const removeToast = jest.fn();
    render(
      <>
        <Toaster />
        <ToastContainer
          toasts={[{ id: "validation", title: "Could not save", message: "Choose no more than 7 subjects.", type: "error" }]}
          removeToast={removeToast}
        />
      </>,
    );
    advance(50);
    advance(30000);

    expect(screen.getByText("Choose no more than 7 subjects.")).toBeVisible();
    expect(removeToast).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Close toast" }));
    advance(300);
    expect(removeToast).toHaveBeenCalledTimes(1);
    expect(removeToast).toHaveBeenCalledWith("validation");
    expect(screen.queryByText("Could not save")).not.toBeInTheDocument();
  });

  it("retains the original reading time when the caller passes a new removal callback", () => {
    const firstClose = jest.fn();
    const latestClose = jest.fn();
    const view = (onClose: (id: string) => void) => (
      <>
        <Toaster />
        <WorkflowToast id="saved" title="Student saved" type="success" onClose={onClose} />
      </>
    );
    const { rerender } = render(view(firstClose));
    advance(50);
    advance(4000);
    rerender(view(latestClose));
    advance(3500);
    expect(screen.getByText("Student saved")).toBeVisible();
    advance(1000);
    advance(300);

    expect(firstClose).not.toHaveBeenCalled();
    expect(latestClose).toHaveBeenCalledTimes(1);
    expect(latestClose).toHaveBeenCalledWith("saved");
    expect(screen.queryByText("Student saved")).not.toBeInTheDocument();
  });

  it("shows one surviving notice in StrictMode and clears it when its workspace unmounts", () => {
    const removeToast = jest.fn();
    const view = (show: boolean) => (
      <StrictMode>
        <Toaster />
        {show && <WorkflowToast id="strict" title="Save failed" type="error" onClose={removeToast} />}
      </StrictMode>
    );
    const { rerender } = render(view(true));
    advance(50);
    expect(screen.getAllByText("Save failed")).toHaveLength(1);
    rerender(view(false));
    advance(50);
    advance(300);

    expect(screen.queryByText("Save failed")).not.toBeInTheDocument();
    expect(removeToast).not.toHaveBeenCalled();
  });

  it("keeps separate workspace notices distinct even when their legacy ids match", () => {
    render(
      <>
        <Toaster />
        <WorkflowToast id="same" title="Attendance saved" type="success" onClose={jest.fn()} />
        <WorkflowToast id="same" title="Import failed" type="error" onClose={jest.fn()} />
      </>,
    );
    advance(50);

    expect(screen.getByText("Attendance saved")).toBeInTheDocument();
    expect(screen.getByText("Import failed")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Close toast" })).toHaveLength(2);
  });
});
