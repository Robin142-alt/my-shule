import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LegalGate } from "@/components/legal/legal-gate";
import { legalRequest } from "@/lib/legal/client";
import { useEffect } from "react";
let mockPathname = "/school/teacher/classes";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
jest.mock("@/lib/legal/client", () => ({ legalRequest: jest.fn() }));
const request = jest.mocked(legalRequest);

beforeEach(() => { mockPathname = "/school/teacher/classes"; request.mockReset(); });

test("sidebar, back and forward paths reuse verified access without unmounting children", async () => {
  request.mockResolvedValue({ ready: true, user_id: "a", school_id: "school-a" });
  let mounts = 0;
  function Workspace() { useEffect(() => { mounts++; }, []); return <div>Authorized workspace</div>; }
  const view = render(<LegalGate><Workspace /></LegalGate>);
  const workspace = await screen.findByText("Authorized workspace");
  for (const path of ["/school/teacher/reports", "/school/teacher/classes", "/school/teacher/reports"]) {
    mockPathname = path;
    view.rerender(<LegalGate><Workspace /></LegalGate>);
    expect(screen.getByText("Authorized workspace")).toBe(workspace);
  }
  expect(request).toHaveBeenCalledTimes(1);
  expect(mounts).toBe(1);
});

test("background verification keeps the shell until failure, then fails closed", async () => {
  request.mockResolvedValueOnce({ ready: true });
  render(<LegalGate><div>Authorized workspace</div></LegalGate>);
  const workspace = await screen.findByText("Authorized workspace");
  let reject!: (error: Error) => void;
  request.mockImplementationOnce(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
  fireEvent.focus(window);
  expect(screen.getByText("Authorized workspace")).toBe(workspace);
  await act(async () => { reject(new Error("Verification unavailable")); });
  expect(await screen.findByRole("alert")).toHaveTextContent("Verification unavailable");
  expect(screen.queryByText("Authorized workspace")).not.toBeInTheDocument();
});

test("identity changes and required agreements revoke the old gate immediately", async () => {
  request.mockResolvedValueOnce({ ready: true });
  render(<LegalGate><div>Old identity data</div></LegalGate>);
  await screen.findByText("Old identity data");
  request.mockReturnValue(new Promise(() => {}));
  act(() => window.dispatchEvent(new Event("myshule-session-changed")));
  expect(screen.queryByText("Old identity data")).not.toBeInTheDocument();
  expect(screen.getByTestId("workspace-loading")).toBeInTheDocument();
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
});

test("leaving and reentering protected routes never reuses the previous account's agreement state", async () => {
  request.mockResolvedValueOnce({ ready: true });
  const view = render(<LegalGate><div>Private workspace</div></LegalGate>);
  await screen.findByText("Private workspace");
  mockPathname = "/school/login";
  view.rerender(<LegalGate><div>Login form</div></LegalGate>);
  request.mockReturnValue(new Promise(() => {}));
  mockPathname = "/school/teacher";
  view.rerender(<LegalGate><div>Private workspace</div></LegalGate>);
  expect(screen.queryByText("Private workspace")).not.toBeInTheDocument();
});
