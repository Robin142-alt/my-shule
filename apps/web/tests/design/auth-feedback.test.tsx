import { act, render } from "@testing-library/react";
import { toast } from "sonner";

import { AuthMessage } from "@/components/auth/auth-message";

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn(), dismiss: jest.fn() } }));

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

test("offscreen authentication failures appear in the viewport and clear on recovery", () => {
  jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: -200, bottom: -100, height: 100 } as DOMRect);
  const { rerender, unmount } = render(<AuthMessage tone="error" title="Sign-in failed" description="Check your credentials and try again." />);
  act(() => { jest.advanceTimersByTime(20); });
  expect(toast.error).toHaveBeenCalledWith("Sign-in failed", expect.objectContaining({ description: "Check your credentials and try again.", duration: Infinity }));
  const id = jest.mocked(toast.error).mock.calls[0][1]!.id;
  rerender(<AuthMessage tone="success" title="Account activated" description="Your account is ready." />);
  act(() => { jest.advanceTimersByTime(20); });
  expect(toast.dismiss).toHaveBeenCalledWith(id);
  expect(toast.success).toHaveBeenCalledWith("Account activated", expect.objectContaining({ id }));
  unmount();
  expect(toast.dismiss).toHaveBeenLastCalledWith(id);
});

test("visible authentication feedback and static guidance do not add popups", () => {
  const bounds = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 100, bottom: 200, height: 100 } as DOMRect);
  const { rerender } = render(<AuthMessage tone="error" title="Sign-in failed" description="Try again." />);
  act(() => { jest.advanceTimersByTime(20); });
  expect(toast.error).not.toHaveBeenCalled();
  bounds.mockReturnValue({ top: -200, bottom: -100, height: 100 } as DOMRect);
  rerender(<AuthMessage tone="info" title="Welcome" description="Enter your account details." />);
  act(() => { jest.advanceTimersByTime(20); });
  expect(toast.success).not.toHaveBeenCalled();
  expect(toast.error).not.toHaveBeenCalled();
});
