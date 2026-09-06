import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";

import { AppProviders } from "@/components/providers/app-providers";
import { FeedbackViewport } from "@/components/shared/feedback-viewport";

afterEach(() => {
  act(() => { toast.dismiss(); });
});

test("the root provider renders existing action messages outside workspace scroll containers", async () => {
  render(<AppProviders><main data-testid="workspace">School workspace</main></AppProviders>);
  act(() => { toast.error("Select no more than 7 subjects for this learner.", { duration: Infinity }); });

  const message = await screen.findByText("Select no more than 7 subjects for this learner.");
  const viewport = screen.getByRole("region", { name: /action feedback/i });
  expect(viewport).toHaveAttribute("aria-live", "polite");
  expect(viewport).toContainElement(message);
  expect(screen.getByTestId("workspace")).not.toContainElement(viewport);
  expect(message.closest("[data-sonner-toaster]")).toHaveAttribute("data-y-position", "top");
  expect(message.closest("[data-sonner-toaster]")).toHaveAttribute("data-x-position", "center");

  fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
  await waitFor(() => expect(message).not.toBeInTheDocument());
});

test("loading feedback updates to the real result in the same notification", async () => {
  render(<FeedbackViewport />);
  let resolve!: (value: string) => void;
  const work = new Promise<string>((done) => { resolve = done; });
  act(() => { toast.promise(work, { loading: "Saving changes…", success: "Changes saved", error: "Save failed" }); });
  expect(await screen.findByText("Saving changes…")).toBeInTheDocument();
  await act(async () => { resolve("saved"); await work; });
  expect(await screen.findByText("Changes saved")).toBeInTheDocument();
  expect(screen.queryByText("Saving changes…")).not.toBeInTheDocument();
  expect(document.querySelectorAll("[data-sonner-toast]")).toHaveLength(1);
});

test("feedback follows the visible viewport when a phone keyboard opens or pans", () => {
  const visualViewport = new EventTarget();
  Object.assign(visualViewport, { height: 320, offsetTop: 190 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: visualViewport });
  const { unmount } = render(<FeedbackViewport />);
  const viewport = screen.getByRole("region", { name: /action feedback/i });
  expect(viewport.style.getPropertyValue("--feedback-viewport-top")).toBe("190px");
  expect(viewport.style.getPropertyValue("--feedback-viewport-height")).toBe("320px");
  Object.assign(visualViewport, { height: 280, offsetTop: 230 });
  act(() => { visualViewport.dispatchEvent(new Event("resize")); });
  expect(viewport.style.getPropertyValue("--feedback-viewport-top")).toBe("230px");
  expect(viewport.style.getPropertyValue("--feedback-viewport-height")).toBe("280px");
  unmount();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
});

test("two simultaneous errors stay expanded when an earlier action reports again", async () => {
  render(<FeedbackViewport />);
  act(() => { toast.error("Choose no more than 7 subjects", { id: "subjects", duration: Infinity }); });
  await screen.findByText("Choose no more than 7 subjects");
  act(() => { toast.error("Draft could not be saved", { id: "draft", duration: Infinity }); });
  await screen.findByText("Draft could not be saved");
  act(() => { toast.error("Choose no more than 7 subjects", { id: "subjects", duration: Infinity }); });
  await waitFor(() => {
    const earlier = screen.getByText("Choose no more than 7 subjects").closest("[data-sonner-toast]");
    expect(earlier).toHaveAttribute("data-expanded", "true");
    expect(earlier).toHaveAttribute("data-visible", "true");
    expect(screen.getByText("Draft could not be saved")).toBeVisible();
  });
});
