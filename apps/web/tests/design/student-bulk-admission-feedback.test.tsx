import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StudentBulkAdmission } from "@/components/school/admissions-dashboard/student-bulk-admission";
import { FeedbackViewport } from "@/components/shared/feedback-viewport";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/lib/school/school-operational-store", () => ({ getCurrentSchoolId: () => "school-a" }));

const request = jest.mocked(requestDashboardApi);
const preview = {
  success: true, total_rows: 1, valid_rows: 1, invalid_rows: 0,
  rows: [{ row_number: 2, admission_number: "A001", learner_name: "Test learner", class_name: "Form 1", status: "valid", record: { admission_number: "A001" } }],
};

async function openImport(onCompleted = jest.fn().mockResolvedValue(undefined)) {
  const user = userEvent.setup();
  const view = render(<><FeedbackViewport /><StudentBulkAdmission onCompleted={onCompleted} /></>);
  await user.click(screen.getByRole("button", { name: "Open bulk admission" }));
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(["admission_number\nA001"], "learners.csv", { type: "text/csv" })] } });
  return { user, ...view };
}

beforeEach(() => { request.mockReset(); });

test("bulk validation shows visible progress, then a persistent correction message", async () => {
  let finish!: (data: unknown) => void;
  request.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const { user } = await openImport();
  await user.click(screen.getByRole("button", { name: /validate and preview/i }));
  const feedback = within(screen.getByRole("region", { name: /action feedback/i }));
  await waitFor(() => expect(feedback.getByText(/Validating the admission file/)).toBeVisible());
  expect(screen.getByRole("button", { name: "Close bulk admission" })).toBeDisabled();
  await act(async () => { finish({ ...preview, valid_rows: 0, invalid_rows: 1, rows: [] }); });
  await waitFor(() => expect(feedback.getByText("1 row(s) need correction before admission.")).toBeVisible());
  expect(screen.getByRole("alert")).toHaveTextContent("1 row(s) need correction");
  expect(request).toHaveBeenCalledWith("/admissions/imports", expect.objectContaining({ tenantId: "school-a", method: "POST" }));
});

test("a post-import refresh failure preserves the real admission result", async () => {
  request.mockResolvedValueOnce(preview).mockResolvedValueOnce({ success: true, total_rows: 1, admitted_rows: 1, failed_rows: 0, results: [] });
  const completed = jest.fn().mockRejectedValue(new Error("List unavailable"));
  const { user } = await openImport(completed);
  await user.click(screen.getByRole("button", { name: /validate and preview/i }));
  await user.click(await screen.findByRole("button", { name: /confirm 1 admission/i }));
  const feedback = within(screen.getByRole("region", { name: /action feedback/i }));
  expect(await feedback.findByText(/Import completed: 1 admitted, 0 failed. The student list could not refresh/)).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent("Import results: 1 admitted, 0 failed");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  await waitFor(() => expect(completed).toHaveBeenCalledTimes(1));
  expect(request).toHaveBeenCalledTimes(2);
});
