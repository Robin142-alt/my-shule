import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
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

    expect(within(commandCenter).getAllByText(/Students Present Today/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).getByRole("button", { name: /Users & Invitations/i })).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect(within(commandCenter).getByRole("heading", { name: /Users & Invitations/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /^All Users$/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Pending Invitations/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Invite New User/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Roles & Permissions/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Suspended \/ Deactivated/i })).toBeVisible();
    expect(within(commandCenter).getAllByRole("button", { name: /Audit Log/i }).length).toBeGreaterThan(0);
  }, 30000);

  it("lets the Principal create a school-scoped invitation and audit record but not a Super Admin invite", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));
    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));

    const roleSelect = within(commandCenter).getByLabelText(/^Role$/i);

    expect(within(roleSelect).queryByRole("option", { name: /Super Admin/i })).not.toBeInTheDocument();

    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Grace Njeri");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0712345678");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "grace.njeri@kisumuboys.ac.ke");
    await user.selectOptions(roleSelect, "Teacher");
    await user.type(within(commandCenter).getByLabelText(/Department/i), "Mathematics");
    await user.type(within(commandCenter).getByLabelText(/Class, grade, stream, or subject assignment/i), "Form 2 West");
    await user.selectOptions(within(commandCenter).getByLabelText(/Send invite by/i), "SMS");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    expect(await within(commandCenter).findByText(/Invitation created for Grace Njeri/i)).toBeVisible();

    await waitFor(() => {
      expect(readSchoolData("user-invitations", "kisumu-boys")).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            schoolId: "kisumu-boys",
            invitedName: "Grace Njeri",
            role: "Teacher",
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
  }, 30000);

  it("uses the live invitation API contract when available and keeps local fallback audit behavior", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url === "/api/auth/invitations" && method === "GET") {
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
              display_name: "Jane Parent",
              email: "parent@example.test",
              role_code: "parent",
              role_name: "Parent",
              status: "invited",
            },
          ],
        }));
      }

      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "csrf-user-workspace-token" }));
      }

      return Promise.resolve(jsonResponse({
        id: "invite-2",
        kind: "invitation",
        display_name: "Brian Otieno",
        email: "brian.parent@example.test",
        role_code: "parent",
        role_name: "Parent",
        status: "invited",
      }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    renderWithProviders(<SchoolPages role="principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect(await within(commandCenter).findByText(/Mary Wanjiku/i)).toBeVisible();
    await user.click(within(commandCenter).getByRole("button", { name: /Pending Invitations/i }));
    expect(within(commandCenter).getByText(/Jane Parent/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Brian Otieno");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0712456789");
    await user.type(within(commandCenter).getByLabelText(/Email address/i), "brian.parent@example.test");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Parent");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    await waitFor(() => expect(within(commandCenter).getByText(/Invitation created for Brian Otieno/i)).toBeVisible());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/invitations",
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
        body: expect.stringContaining('"role_code":"parent"'),
      }),
    );
    expect(readSchoolData("user-management-audit", "kisumu-boys")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "User invited",
          target: "Brian Otieno",
          schoolId: "kisumu-boys",
        }),
      ]),
    );
  }, 30000);

  it("prevents duplicate active users inside the same school and filters out another school's users", async () => {
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

    expect(within(commandCenter).getByText(/Faith Akinyi/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/David Kiptoo/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Faith Akinyi");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0711111111");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Teacher");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    expect(await within(commandCenter).findByText(/already has an active user in this school/i)).toBeVisible();
  }, 30000);

  it("adds the same dedicated workspace to the Deputy Principal dashboard with school-only invite powers", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="deputy-principal" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("role-operational-command-center");

    expect(within(commandCenter).getByRole("heading", { name: /Deputy Principal Operations/i })).toBeVisible();
    expect(within(commandCenter).getByRole("button", { name: /Users & Invitations/i })).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Users & Invitations/i }));

    expect(within(commandCenter).getByRole("heading", { name: /Users & Invitations/i })).toBeVisible();
    expect(within(commandCenter).getByText(/Deputy Principal can invite school users in Kisumu Boys High School/i)).toBeVisible();
    expect(within(commandCenter).queryByRole("option", { name: /Super Admin/i })).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /Invite New User/i }));
    await user.type(within(commandCenter).getByLabelText(/Full name/i), "Mr. Otieno");
    await user.type(within(commandCenter).getByLabelText(/Phone number/i), "0799001122");
    await user.selectOptions(within(commandCenter).getByLabelText(/^Role$/i), "Accountant");
    await user.click(within(commandCenter).getByRole("button", { name: /Send Invitation/i }));

    expect(await within(commandCenter).findByText(/Invitation created for Mr. Otieno/i)).toBeVisible();
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
});
