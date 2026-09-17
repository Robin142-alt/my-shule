import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
import {
  addSchoolRecord,
  readSchoolData,
} from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
  } as Response;
}

function seedSchoolUser(schoolId: string, overrides: Record<string, unknown>) {
  return addSchoolRecord(
    "school-users",
    {
      id: `${schoolId}-${String(overrides.name ?? "user").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: "Grace Njeri",
      role: "Teacher",
      department: "Mathematics",
      assignment: "Form 2 West",
      phone: "0712000000",
      email: "grace.njeri@school.ac.ke",
      status: "Active",
      lastActive: "Today 8:30 AM",
      joinedAt: "2026-01-08",
      createdAt: "2026-01-08",
      ...overrides,
    },
    schoolId,
  );
}

describe("school-scoped user management and invitations", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockReset();
    global.fetch = undefined as unknown as typeof fetch;
  });

  it("adds a dedicated Principal Users & Invitations workspace without replacing the overview", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getByRole("heading", { name: /Principal Dashboard/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Users & Invitations/i })).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect(within(commandCenter).getAllByRole("heading", { name: /Users & Invitations/i }).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByRole("button", { name: /^All Staff$/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Pending Invitations/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Invite New User/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Roles & Permissions/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Suspended \/ Deactivated/i })).toBeVisible();
    expect(within(commandCenter).getAllByRole("button", { name: /Audit Log/i }).length).toBeGreaterThan(0);
  }, 30000);

  it("keeps a fresh school user workspace clean when the live access API has no users", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({ users: [] }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="homabay-high" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    await waitFor(() => {
      expect(within(commandCenter).getByText("0 active staff")).toBeVisible();
      expect(within(commandCenter).getByText("0 pending invites")).toBeVisible();
      expect(within(commandCenter).getByText("0 inactive")).toBeVisible();
    });
    expect(within(commandCenter).queryByText(/principal\.wanjiku@kisumuboys\.ac\.ke/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Principal Wanjiku/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/faith\.akinyi@kisumuboys\.ac\.ke/i)).not.toBeInTheDocument();
    expect(readSchoolData("school-users", "homabay-high")).toEqual([]);
    expect(readSchoolData("user-invitations", "homabay-high")).toEqual([]);
  }, 30000);

  it("treats the live access API as authoritative over stale local users for a real school", async () => {
    const user = userEvent.setup();
    seedSchoolUser("homabay-high", {
      id: "homabay-stale-principal",
      name: "Principal Wanjiku",
      role: "Principal",
      department: "School Administration",
      assignment: "School Principal",
      phone: "0700111222",
      email: "principal.wanjiku@kisumuboys.ac.ke",
      status: "Active",
    });
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({ users: [] }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="homabay-high" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    await waitFor(() => {
      expect(within(commandCenter).getByText("0 active staff")).toBeVisible();
    });
    expect(within(commandCenter).queryByText(/Principal Wanjiku/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/principal\.wanjiku@kisumuboys\.ac\.ke/i)).not.toBeInTheDocument();
  }, 30000);

  it("lets the Principal send a school-scoped email invitation and audit record but not a Super Admin invite", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({ users: [] }));
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-principal-invite-token" }));
      }

      if (url === "/api/auth/invitations" && method === "POST") {
        return Promise.resolve(jsonResponse({
          data: {
            id: "invite-grace",
            kind: "invitation",
            display_name: "Grace Njeri",
            email: "grace.njeri@kisumuboys.ac.ke",
            role_code: "teacher",
            role_name: "Teacher",
            status: "invited",
            invitation_sent: true,
            expires_at: "2026-06-08T09:00:00.000Z",
          },
          meta: {
            request_id: "req-invite-grace",
          },
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));
    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));

    expect(document.querySelector("[data-sonner-toast]")).toBeNull();

    const roleSelect = within(commandCenter).getByLabelText(/^Role$/i);

    expect(within(roleSelect).queryByRole("option", { name: /Super Admin/i })).not.toBeInTheDocument();

    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Grace Njeri");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0712345678");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "grace.njeri@kisumuboys.ac.ke");
    await user.selectOptions(roleSelect, "Teacher");
    await user.type(within(commandCenter).getByLabelText(/Department/i), "Mathematics");
    await user.type(within(commandCenter).getByLabelText(/Class, grade, stream, or subject assignment/i), "Form 2 West");
    await user.type(within(commandCenter).getByLabelText(/Optional note\/message/i), "Bring TSC number during onboarding.");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    expect(await within(commandCenter).findByText(/Invitation email sent to Grace Njeri/i)).toBeVisible();
    await waitFor(() => {
      expect(document.querySelector('[data-sonner-toast][data-type="success"]')).toHaveTextContent("Invitation email sent to Grace Njeri");
    });

    await waitFor(() => {
      expect(readSchoolData("user-invitations", "kisumu-boys")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            schoolId: "kisumu-boys",
            invitedName: "Grace Njeri",
            role: "Teacher",
            note: "Bring TSC number during onboarding.",
            invitationStatus: "Pending",
            invitedByRole: "Principal",
          }),
        ]),
      );
      expect(readSchoolData("user-management-audit", "kisumu-boys")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            schoolId: "kisumu-boys",
            action: "User invited",
            actorRole: "Principal",
          }),
        ]),
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/invitations",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: expect.stringContaining('"role_code":"teacher"'),
      }),
    );
  }, 30000);

  it("uses the live invitation API contract and does not create a local invite when email delivery fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({
          users: [
            {
              id: "membership-1",
              kind: "member",
              display_name: "Mary Wanjiku",
              email: "principal@example.test",
              role_code: "principal",
              role_name: "Principal",
              status: "active",
            },
            {
              id: "invite-1",
              kind: "invitation",
              display_name: "Jane Librarian",
              email: "librarian@example.test",
              role_code: "librarian",
              role_name: "Librarian",
              status: "invited",
            },
          ],
        }));
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-user-workspace-token" }));
      }

      return Promise.resolve(jsonResponse({ message: "Transactional email provider is not configured." }, { status: 503 }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect((await within(commandCenter).findAllByText(/Mary Wanjiku/i)).length).toBeGreaterThan(0);
    await user.click(within(commandCenter).getByRole("button", { name: /Pending Invitations/i }));
    expect(within(commandCenter).getAllByText(/Jane Librarian/i).length).toBeGreaterThan(0);

    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Brian Otieno");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0712456789");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "brian.librarian@example.test");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Librarian");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    await waitFor(() => expect(within(commandCenter).getByText(/Transactional email provider is not configured/i)).toBeVisible());
    await waitFor(() => {
      expect(document.querySelector('[data-sonner-toast][data-type="error"]')).toHaveTextContent("Transactional email provider is not configured");
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/invitations?limit=50&offset=0&scope=staff",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/csrf",
      expect.objectContaining({
        method: "GET",
        credentials: "same-origin",
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/invitations",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-myshule-csrf": "csrf-user-workspace-token",
        }),
        body: expect.stringContaining('"role_code":"librarian"'),
      }),
    );
    expect(readSchoolData("user-invitations", "kisumu-boys")).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ invitedName: "Brian Otieno" })]),
    );
  }, 30000);

  it("loads accepted school members from the API response envelope", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({
          data: {
            users: [
              {
                id: "membership-kibabi-teacher",
                kind: "member",
                display_name: "Accepted Kibabi Teacher",
                email: "accepted.teacher@example.test",
                role_code: "teacher",
                role_name: "Teacher",
                status: "active",
                joined_at: "2026-07-23T08:00:00.000Z",
              },
            ],
            pagination: {
              limit: 50,
              offset: 0,
              total: 1,
            },
          },
          meta: {
            request_id: "request-kibabi-users",
            limit: 50,
          },
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kibabi-high" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect((await within(commandCenter).findAllByText("Accepted Kibabi Teacher")).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByText("1 active staff")).toBeVisible();
    expect(within(commandCenter).getAllByText("accepted.teacher@example.test").length).toBeGreaterThan(0);
    expect(readSchoolData("school-users", "kibabi-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "membership-kibabi-teacher",
          schoolId: "kibabi-high",
          role: "Teacher",
          status: "Active",
        }),
      ]),
    );
  }, 30000);

  it("keeps a revoked membership in the deactivated user workspace after a live reload", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({
          users: [{
            id: "membership-revoked-1",
            kind: "member",
            display_name: "Deactivated Teacher",
            email: "deactivated.teacher@example.test",
            role_code: "teacher",
            role_name: "Teacher",
            status: "revoked",
          }],
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect((await within(commandCenter).findAllByText("Deactivated Teacher")).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByText("1 inactive")).toBeVisible();
    expect(within(commandCenter).getByText("0 pending invites")).toBeVisible();
    await user.click(within(commandCenter).getByRole("button", { name: /Suspended \/ Deactivated/i }));
    expect(within(commandCenter).getAllByText("Deactivated Teacher").length).toBeGreaterThan(0);
  }, 30000);

  it("runs user detail, edit, role, status, deactivation, and password recovery actions through live contracts", async () => {
    const user = userEvent.setup();
    let currentName = "Mary Wanjiku";
    let currentRoleCode = "teacher";
    let currentRoleName = "Teacher";
    let currentStatus = "active";

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({
          users: [{
            id: "membership-actions-1",
            kind: "member",
            display_name: currentName,
            email: "mary.wanjiku@example.test",
            phone: "0712000000",
            role_code: currentRoleCode,
            role_name: currentRoleName,
            status: currentStatus,
            department: "Mathematics",
            assignment: "Form 2 West",
          }],
        }));
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-user-actions-token" }));
      }

      if (url === "/api/auth/tenant-users/membership-actions-1" && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { display_name?: string; email?: string };
        currentName = body.display_name ?? currentName;
        return Promise.resolve(jsonResponse({
          id: "membership-actions-1",
          kind: "member",
          display_name: currentName,
          email: body.email ?? "mary.wanjiku@example.test",
          phone: "0712000000",
          role_code: currentRoleCode,
          role_name: currentRoleName,
          status: currentStatus,
          department: "Mathematics",
          assignment: "Form 2 West",
        }));
      }

      if (url.endsWith("/role") && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { role_code?: string };
        currentRoleCode = body.role_code ?? currentRoleCode;
        currentRoleName = currentRoleCode === "librarian" ? "Librarian" : "Teacher";
        return Promise.resolve(jsonResponse({
          id: "membership-actions-1",
          kind: "member",
          display_name: currentName,
          email: "mary.wanjiku@example.test",
          role_code: currentRoleCode,
          role_name: currentRoleName,
          status: currentStatus,
        }));
      }

      if (url.endsWith("/status") && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { status?: string };
        currentStatus = body.status ?? currentStatus;
        return Promise.resolve(jsonResponse({
          id: "membership-actions-1",
          kind: "member",
          display_name: currentName,
          email: "mary.wanjiku@example.test",
          role_code: currentRoleCode,
          role_name: currentRoleName,
          status: currentStatus,
        }));
      }

      if (url === "/api/auth/password-recovery/request" && method === "POST") {
        return Promise.resolve(jsonResponse({ success: true, message: "Recovery requested." }));
      }

      return Promise.resolve(jsonResponse({ message: "Unexpected request" }, { status: 500 }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);
    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));
    expect((await within(commandCenter).findAllByText("Mary Wanjiku")).length).toBeGreaterThan(0);

    await user.click(within(commandCenter).getByRole("button", { name: "Open Invite Form" }));
    expect(within(commandCenter).getByLabelText("Full name")).toBeVisible();
    await user.click(within(commandCenter).getByRole("button", { name: "All Staff" }));

    await user.click(within(commandCenter).getAllByRole("button", { name: "View details" })[0]);
    expect(screen.getByRole("dialog", { name: "Mary Wanjiku details" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Close Mary Wanjiku details" }));

    await user.click(within(commandCenter).getAllByRole("button", { name: "Edit user" })[0]);
    const editDialog = screen.getByRole("dialog", { name: "Edit Mary Wanjiku" });
    await user.clear(within(editDialog).getByLabelText("Name"));
    await user.type(within(editDialog).getByLabelText("Name"), "Mary Njeri");
    await user.click(within(editDialog).getByRole("button", { name: "Save User" }));
    expect(await within(commandCenter).findByText("Mary Njeri updated.")).toBeVisible();

    await user.click(within(commandCenter).getAllByRole("button", { name: "Change role" })[0]);
    const roleDialog = screen.getByRole("dialog", { name: "Change role for Mary Njeri" });
    await user.selectOptions(within(roleDialog).getByLabelText("School role"), "Librarian");
    await user.click(within(roleDialog).getByRole("button", { name: "Save role" }));
    expect(await within(commandCenter).findByText(/role changed to Librarian/i)).toBeVisible();

    await user.click(within(commandCenter).getAllByRole("button", { name: "Suspend" })[0]);
    await user.click(within(screen.getByRole("dialog", { name: "Suspend Mary Njeri" })).getByRole("button", { name: "Confirm suspended" }));
    expect(await within(commandCenter).findByText("Mary Njeri is now Suspended.")).toBeVisible();

    await user.click(within(commandCenter).getAllByRole("button", { name: "Reactivate" })[0]);
    await user.click(within(screen.getByRole("dialog", { name: "Reactivate Mary Njeri" })).getByRole("button", { name: "Confirm active" }));
    expect(await within(commandCenter).findByText("Mary Njeri is now Active.")).toBeVisible();

    await user.click(within(commandCenter).getAllByRole("button", { name: "Deactivate" })[0]);
    await user.click(within(screen.getByRole("dialog", { name: "Deactivate Mary Njeri" })).getByRole("button", { name: "Confirm deactivated" }));
    expect(await within(commandCenter).findByText("Mary Njeri is now Deactivated.")).toBeVisible();

    await user.click(within(commandCenter).getAllByRole("button", { name: "Reset password" })[0]);
    const resetDialog = screen.getByRole("dialog", { name: "Reset password for Mary Njeri" });
    await user.click(within(resetDialog).getByRole("button", { name: "Send recovery email" }));
    expect(await within(commandCenter).findByText(/Password recovery instructions were requested for Mary Njeri/i)).toBeVisible();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/tenant-users/membership-actions-1",
      expect.objectContaining({ method: "PATCH", body: expect.stringContaining('"display_name":"Mary Njeri"') }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/tenant-users/membership-actions-1/role",
      expect.objectContaining({ method: "PATCH", body: '{"role_code":"librarian"}' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/tenant-users/membership-actions-1/status",
      expect.objectContaining({ method: "PATCH", body: '{"status":"revoked"}' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/password-recovery/request",
      expect.objectContaining({ method: "POST", body: expect.stringContaining('"tenantSlug":"kisumu-boys"') }),
    );
  }, 30000);

  it("does not claim email delivery failed when the invitation API fails after submission", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({ users: [] }));
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-user-workspace-token" }));
      }

      if (url === "/api/auth/invitations" && method === "POST") {
        return Promise.resolve(jsonResponse({ message: "Internal server error" }, { status: 500 }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="homabay-high" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));
    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Mr Story");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0762562722");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "storytime0516@gmail.com");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Boarding Master");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    await waitFor(() => {
      expect(within(commandCenter).getByText(/Invitation request failed: Internal server error/i)).toBeVisible();
    });
    expect(within(commandCenter).queryByText(/Email delivery failed: Internal server error/i)).not.toBeInTheDocument();
  }, 30000);

  it("prevents duplicate active staff inside the same school and filters out another school's users", async () => {
    const user = userEvent.setup();

    seedSchoolUser("kisumu-boys", {
      id: "kb-dup-user",
      name: "Faith Akinyi",
      phone: "0711111111",
      email: "faith.akinyi@kisumuboys.ac.ke",
    });
    seedSchoolUser("green-valley", {
      id: "gv-other-user",
      name: "David Kiptoo",
      phone: "0722222222",
      email: "david.kiptoo@greenvalley.ac.ke",
    });

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect(within(commandCenter).getAllByText(/Faith Akinyi/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).queryByText(/David Kiptoo/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Faith Akinyi");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0711111111");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "faith.akinyi@kisumuboys.ac.ke");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Teacher");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    expect(await within(commandCenter).findByText(/already has an active user in this school/i)).toBeVisible();
  }, 30000);

  it("adds the same dedicated workspace to the Deputy Principal dashboard with school-only invite powers", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.startsWith("/api/auth/invitations") && method === "GET") {
        return Promise.resolve(jsonResponse({
          users: [
            {
              id: "membership-kibabi-live-teacher",
              kind: "member",
              display_name: "Kibabi Live Teacher",
              email: "teacher@kibabi.example.test",
              role_code: "teacher",
              role_name: "Teacher",
              status: "active",
            },
            {
              id: "invite-kibabi-live-librarian",
              kind: "invitation",
              display_name: "Kibabi Pending Librarian",
              email: "librarian@kibabi.example.test",
              role_code: "librarian",
              role_name: "Librarian",
              status: "invited",
            },
          ],
        }));
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-deputy-invite-token" }));
      }

      if (url === "/api/auth/invitations" && method === "POST") {
        return Promise.resolve(jsonResponse({
          id: "invite-mr-otieno",
          kind: "invitation",
          display_name: "Mr. Otieno",
          email: "otieno.accounts@kisumuboys.ac.ke",
          role_code: "accountant",
          role_name: "Accountant",
          status: "invited",
          invitation_sent: true,
          expires_at: "2026-06-08T09:00:00.000Z",
        }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="deputy-principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("deputy-principal-command-center");

    expect(within(commandCenter).getByText(/Deputy Principal Dashboard/i)).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Users & Invitations/i })).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect(within(commandCenter).getAllByRole("heading", { name: /Users & Invitations/i }).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByText(/Deputy Principal can invite school users in Kisumu Boys/i)).toBeVisible();
    expect(within(commandCenter).queryByRole("option", { name: /Super Admin/i })).not.toBeInTheDocument();
    expect((await within(commandCenter).findAllByText("Kibabi Live Teacher")).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByText("1 active staff")).toBeVisible();
    expect(within(commandCenter).getByText("1 pending invites")).toBeVisible();
    expect(within(commandCenter).queryByText(/Live user service is unavailable/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Mr. Otieno");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0799001122");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "otieno.accounts@kisumuboys.ac.ke");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Accountant");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    expect(await within(commandCenter).findByText(/Invitation email sent to Mr. Otieno/i)).toBeVisible();
    expect(readSchoolData("user-invitations", "kisumu-boys")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          invitedName: "Mr. Otieno",
          role: "Accountant",
          invitedByRole: "Deputy Principal",
          schoolId: "kisumu-boys",
        }),
      ]),
    );
  }, 30000);

  it("uses the same live tenant users and invitations for Principal and Deputy Principal", async () => {
    const liveUsers = [
      {
        id: "membership-kibabi-shared-teacher",
        kind: "member",
        display_name: "Kibabi Shared Teacher",
        email: "shared.teacher@kibabi.example.test",
        role_code: "teacher",
        role_name: "Teacher",
        status: "active",
      },
      {
        id: "invite-kibabi-shared-librarian",
        kind: "invitation",
        display_name: "Kibabi Shared Librarian",
        email: "shared.librarian@kibabi.example.test",
        role_code: "librarian",
        role_name: "Librarian",
        status: "invited",
      },
    ];
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("/api/auth/invitations") && (init?.method ?? "GET") === "GET") {
        return Promise.resolve(jsonResponse({ users: liveUsers }));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const principal = renderWithProviders(
      <UserManagementWorkspace
        schoolId="kibabi-high"
        schoolName="Kibabi"
        actorRole="Principal"
        actorName="Principal Wanjiku"
      />,
    );

    expect((await screen.findAllByText("Kibabi Shared Teacher")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 active staff")).toBeVisible();
    expect(screen.getByText("1 pending invites")).toBeVisible();
    principal.unmount();
    window.localStorage.clear();

    renderWithProviders(
      <UserManagementWorkspace
        schoolId="kibabi-high"
        schoolName="Kibabi"
        actorRole="Deputy Principal"
        actorName="Deputy Otieno"
      />,
    );

    expect((await screen.findAllByText("Kibabi Shared Teacher")).length).toBeGreaterThan(0);
    expect(screen.getByText("1 active staff")).toBeVisible();
    expect(screen.getByText("1 pending invites")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(readSchoolData("school-users", "kibabi-high")).toEqual([
      expect.objectContaining({ id: "membership-kibabi-shared-teacher", schoolId: "kibabi-high" }),
    ]);
  }, 30000);

  it("reports a user-management permission failure instead of a false service outage", async () => {
    seedSchoolUser("kibabi-high", {
      id: "cached-kibabi-teacher",
      name: "Cached Kibabi Teacher",
      email: "cached.teacher@kibabi.example.test",
    });
    addSchoolRecord("user-invitations", {
      id: "cached-kibabi-invitation",
      invitedName: "Cached Kibabi Librarian",
      phone: "0712000001",
      email: "cached.librarian@kibabi.example.test",
      role: "Librarian",
      department: "School access",
      assignment: "Librarian",
      identifier: "",
      deliveryMethod: "Email",
      note: "",
      invitedByUserId: "principal-1",
      invitedByRole: "Principal",
      invitationStatus: "Pending",
      inviteCode: "Hidden after delivery",
      inviteToken: "Hidden after delivery",
      expiryDate: "2026-08-16T09:00:00.000Z",
      createdAt: "2026-08-09T09:00:00.000Z",
      updatedAt: "2026-08-09T09:00:00.000Z",
    }, "kibabi-high");
    addSchoolRecord("user-management-audit", {
      id: "cached-kibabi-audit",
      action: "User updated",
      actorUser: "Principal Wanjiku",
      actorRole: "Principal",
      target: "Cached Kibabi Teacher",
      timestamp: "2026-08-09T09:00:00.000Z",
    }, "kibabi-high");
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith("/api/auth/invitations") && (init?.method ?? "GET") === "GET") {
        return Promise.resolve(jsonResponse(
          { message: "Missing required permission users:read." },
          { status: 403 },
        ));
      }

      return Promise.resolve(jsonResponse({}));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(
      <UserManagementWorkspace
        schoolId="kibabi-high"
        schoolName="Kibabi"
        actorRole="Deputy Principal"
        actorName="Deputy Otieno"
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(/Permission-based access denied/i);
    expect(screen.queryByText(/Live user service is unavailable/i)).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("Cached Kibabi Teacher")).not.toBeInTheDocument();
      expect(readSchoolData("school-users", "kibabi-high")).toEqual([]);
      expect(readSchoolData("user-invitations", "kibabi-high")).toEqual([]);
      expect(readSchoolData("user-management-audit", "kibabi-high")).toEqual([]);
    });
  }, 30000);
});
