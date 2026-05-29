import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import {
  addSchoolRecord,
  readSchoolData,
} from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

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
  beforeEach(() => {
    window.localStorage.clear();
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
