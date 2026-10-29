import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { LiveRoleCommandCenter } from "@/components/school/live-role-command-center";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";

jest.mock("@/components/school/school-pages", () => ({
  buildSchoolSectionHref: (role: string, section: string, mode: string) => mode === "public" ? `/school/${role}/${section}` : `/${section}`,
}));
jest.mock("@/components/school/integrated-school-command-header", () => ({
  IntegratedSchoolCommandHeader: () => null,
  SchoolCommandSidebarIdentity: () => null,
  useSchoolCommandIdentity: () => ({ schoolName: "Test School", userLabel: "Librarian" }),
}));
jest.mock("@/components/providers/permission-context", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
const request = jest.mocked(requestDashboardApi);
beforeEach(() => {
  window.history.replaceState(null, "", "/school/librarian/overview");
  request.mockReset();
  request.mockImplementation(async path => path.endsWith("/summary") ? { total_copies: 0 } : []);
});

test("the actual librarian sidebar exposes every barcode workflow as a valid route", () => {
  const nav = getSchoolWorkspace("librarian").navItems;
  for (const section of ["books", "register-books", "barcode-printing", "scan", "issue-book", "return-book", "borrowers", "inventory", "stocktake", "barcodes", "scanner-settings"]) {
    expect(nav.some(item => item.id === section)).toBe(true);
    expect(isSchoolWorkspaceSection("librarian", section)).toBe(true);
  }
});

test("the live overview opens barcode preparation instead of silently falling back to the old overview", async () => {
  render(<LiveRoleCommandCenter role="librarian" routeMode="public" activeSection="overview" />);
  fireEvent.click(await screen.findByRole("button", { name: "Generate barcodes" }, { timeout: 5000 }));
  expect(await screen.findByLabelText("Custom quantity")).toBeVisible();
  expect(window.location.pathname).toBe("/school/librarian/barcode-printing");
  expect(request).toHaveBeenCalledWith("/api/library/smart/summary", expect.anything());
});

test.each(["public", "hosted"] as const)("live %s navigation retains one borrower for multiple books and opens a separate return desk", async routeMode => {
  request.mockImplementation(async path => {
    if (path.includes("/borrowers?")) return [{ subject_id: "student-1", borrower_type: "student", name: "Brian Otieno", identifier: "2451" }];
    if (path.includes("/history?")) return { outstanding: 0, max_active_loans: 5 };
    if (path.includes("/scan?")) { const barcode = new URL(path, "https://example.test").searchParams.get("barcode"); return { id: barcode, barcode, title: `Book ${barcode}`, status: "available" }; }
    if (path.endsWith("/issue")) return { loans: [{ id: "1" }, { id: "2" }] };
    return [];
  });
  render(<LiveRoleCommandCenter role="librarian" routeMode={routeMode} activeSection="issue-book" />);
  fireEvent.click(await screen.findByRole("button", { name: /Brian Otieno/ }));
  for (const barcode of ["000001", "000002"]) {
    fireEvent.change(screen.getByLabelText("Scan a book"), { target: { value: barcode } });
    fireEvent.click(screen.getByRole("button", { name: "Add scan" }));
    await screen.findByText(`Book ${barcode}`);
  }
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm issue of 2 book(s)" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Confirm issue of 2 book(s)" }));
  await waitFor(() => expect(request).toHaveBeenCalledWith("/api/library/smart/issue", expect.objectContaining({ body: expect.objectContaining({ subject_id: "student-1", barcodes: ["000002", "000001"] }) })));
  const nav = within(screen.getByRole("navigation", { name: "Librarian workspace navigation" }));
  fireEvent.click(nav.getByRole("button", { name: "Return Books" }));
  expect(await screen.findByLabelText("Scan a book")).toBeVisible();
  expect(screen.queryByText("Brian Otieno")).not.toBeInTheDocument();
  expect(window.location.pathname).toBe(routeMode === "public" ? "/school/librarian/return-book" : "/return-book");
});

test.each([
  ["barcode_print", "Custom quantity"], ["add_books", "Scan a sticker to register"],
  ["scanner_settings", "Test your scanner"], ["stocktake", "New session name"],
])("direct legacy link %s reaches the working workspace", async (section, label) => {
  render(<LiveRoleCommandCenter role="librarian" routeMode="public" activeSection={section} />);
  expect(await screen.findByLabelText(label)).toBeVisible();
});
