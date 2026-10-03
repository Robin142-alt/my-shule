import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ParentLinkingWorkspace } from "@/components/school/admissions/parent-linking-workspace";
import { CommunicationWorkspace } from "@/components/school/admissions-dashboard/communication-workspace";
import { ReportsWorkspace } from "@/components/school/admissions/reports-workspace";

const mockQuery = jest.fn();
const mockMutation = jest.fn();
const mockSave = jest.fn();
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (...args: unknown[]) => mockQuery(...args),
  useSchoolMutation: (...args: unknown[]) => mockMutation(...args),
}));
jest.mock("@/components/school/integrated-school-command-header", () => ({
  useSchoolCommandIdentity: () => ({ schoolName: "Test School", userLabel: "Admissions Officer" }),
}));

beforeEach(() => {
  mockQuery.mockReset();
  mockSave.mockReset().mockResolvedValue({ status: "Pending" });
  mockMutation.mockReset().mockReturnValue({ mutateAsync: mockSave, isPending: false, isError: false });
});

test("adds a missing guardian phone through the audited student action", async () => {
  mockQuery.mockReturnValue({ data: { parentLinksList: [{ id: "link", student_id: "student", student_name: "Test Learner", parent_name: "Test Guardian", parent_phone: "", parent_email: "", relationship: "mother", link_status: "Active" }] } });
  render(<ParentLinkingWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Add phone" }));
  fireEvent.change(screen.getByLabelText("Guardian phone"), { target: { value: "0712345678" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm and save phone" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith({ student_id: "student", guardian_phone: "0712345678", reason: "Contact added after admission", confirmed: true }));
  const [resolvePath, method, options] = mockMutation.mock.calls[0];
  expect(resolvePath({ student_id: "student" })).toBe("/admissions/students/student/guardian-phone");
  expect(method).toBe("PATCH");
  expect(options.queueNetworkFailures).toBe(false);
});

test("communication reports queued provider status and preserves text if sending fails", async () => {
  mockQuery.mockReturnValue({ data: [], isLoading: false });
  render(<CommunicationWorkspace />);
  fireEvent.change(screen.getByLabelText("Recipient phone"), { target: { value: "0712345678" } });
  fireEvent.change(screen.getByLabelText("Admission message"), { target: { value: "Welcome to school" } });
  mockSave.mockRejectedValueOnce(new Error("Provider unavailable"));
  fireEvent.click(screen.getByRole("button", { name: "Send SMS" }));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  expect(screen.getByLabelText("Admission message")).toHaveValue("Welcome to school");
  fireEvent.click(screen.getByRole("button", { name: "Send SMS" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Message status: Pending");
  expect(screen.queryByText(/sent successfully/i)).not.toBeInTheDocument();
});

test("reports load only on request and expose a real CSV download and print preview", async () => {
  mockQuery.mockImplementation((path: string | null) => ({ data: path ? { report_id: "applications", title: "Admission register", filename: "register.csv", generated_at: "2026-10-03T10:00:00Z", row_count: 1, checksum_sha256: "abc123def456", csv: "Student,Class\nTest Learner,Grade 7\n" } : undefined }));
  const print = jest.spyOn(window, "print").mockImplementation(() => undefined);
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:report") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
  render(<ReportsWorkspace />);
  expect(mockQuery.mock.calls[0][0]).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Preview report" }));
  expect(await screen.findByText(/Test Learner,Grade 7/)).toBeVisible();
  expect(mockQuery).toHaveBeenLastCalledWith("/admissions/reports/applications/export", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "Download CSV" }));
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
  expect(click).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Print preview" }));
  expect(print).toHaveBeenCalledTimes(1);
  print.mockRestore(); click.mockRestore();
});
