import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

describe("principal production readiness", () => {
  it("renders a new invited principal inside their own school tenant instead of Kisumu Boys demo", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="maranda-high"
        userLabel="Principal Wanjiku"
      />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");

    expect(within(commandCenter).getAllByText(/Maranda High/i).length).toBeGreaterThan(0);
    expect(within(commandCenter).queryByText(/Kisumu Boys/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/KSh 248,500/i)).not.toBeInTheDocument();
    expect(within(commandCenter).getByText(/0 modules enabled|Loading modules/i)).toBeVisible();
  });

  it("does not show phantom workload counts for a fresh principal tenant", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="maranda-high"
        userLabel="Robi Nickson"
      />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");

    expect(within(commandCenter).getByTestId("principal-metric-pending-approvals")).toHaveTextContent(/Pending Approvals\s*0/i);
    expect(within(commandCenter).getByTestId("principal-metric-system-alerts")).toHaveTextContent(/System Alerts\s*0/i);
    expect(within(commandCenter).queryByRole("button", { name: /^Fees 1$/i })).not.toBeInTheDocument();
    expect(within(commandCenter).queryByRole("button", { name: /^Attendance 7$/i })).not.toBeInTheDocument();
  });

  it("renders a school activation checklist with dependency guidance for a fresh principal tenant", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolPages
        role="principal"
        section="setup-checklist"
        tenantSlug="homabay-high"
        userLabel="Principal Robini"
      />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    const setupWorkspace = within(commandCenter).getByRole("region", { name: /Principal school setup workspace/i });

    expect(within(setupWorkspace).getByRole("heading", { name: /School Setup Checklist/i })).toBeVisible();
    expect(within(setupWorkspace).getByText(/Set classes, streams, subjects, departments, academic year, and current term/i)).toBeVisible();
    expect(within(setupWorkspace).getByText(/Fee structures and billable learners must exist/i)).toBeVisible();
    expect(within(setupWorkspace).getAllByText(/Setup required/i).length).toBeGreaterThan(0);

    await user.click(within(setupWorkspace).getByRole("button", { name: /Open Academics/i }));

    expect(within(commandCenter).getByRole("region", { name: /Principal academics workspace/i })).toBeVisible();
  });

  it.each([
    ["discipline", /Principal discipline workspace/i, /^Discipline$/i],
    ["boarding", /Principal boarding workspace/i, /^Boarding$/i],
    ["academics", /Principal academics workspace/i, /^Academics$/i],
    ["staff", /Principal staff workspace/i, /^Staff$/i],
    ["transport", /Principal transport workspace/i, /^Transport$/i],
    ["approvals", /Principal approvals workspace/i, /^Approvals$/i],
  ])("renders a unique %s sidebar workspace instead of the overview", async (section, regionName, heading) => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        section={section}
        tenantSlug="maranda-high"
        userLabel="Robi Nickson"
      />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    const workspace = within(commandCenter).getByRole("region", { name: regionName });

    expect(workspace).toBeVisible();
    expect(within(workspace).getByRole("heading", { name: heading })).toBeVisible();
    expect(within(workspace).queryByText(/Practical Kenyan school command center/i)).not.toBeInTheDocument();
  });

  it("opens Fees workspace actions without fake success", async () => {
    const user = userEvent.setup();
    const createObjectUrl = jest.fn(() => "blob:principal-fees-export");
    const revokeObjectUrl = jest.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: createObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: revokeObjectUrl,
    });

    renderWithProviders(<SchoolPages role="principal" section="finance" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /View Collections/i }));

    expect(within(commandCenter).getByRole("heading", { name: /^Fees$/i })).toBeVisible();
    expect(within(commandCenter).getByText(/fees workspace ready with \d+ operational records and \d+ metrics/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/Action completed/i)).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/export generated/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /Print Defaulters List/i }));
    expect(screen.getByRole("dialog", { name: /Kisumu Boys - Fees print preview/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /^Close$/i }));

    await user.click(within(commandCenter).getByRole("button", { name: /Export Fee Summary/i }));
    expect(createObjectUrl).toHaveBeenCalled();
  });

  it("opens attendance SMS confirmation with recipient evidence", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" section="attendance" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getAllByRole("button", { name: /Send Absence SMS/i })[0]);

    expect(within(commandCenter).getByText(/absence sms confirmation ready with \d+ guardian recipients? for review before queueing/i)).toBeVisible();
    expect(within(commandCenter).queryByText(/confirmation opened/i)).not.toBeInTheDocument();
  });

  it("prints the attendance preview through the browser print path", async () => {
    const user = userEvent.setup();
    const print = jest.fn();
    Object.defineProperty(window, "print", {
      configurable: true,
      value: print,
    });

    renderWithProviders(<SchoolPages role="principal" section="attendance" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: /Print Attendance Report/i }));
    await user.click(screen.getByRole("button", { name: /^Print$/i }));

    expect(print).toHaveBeenCalled();
  });

  it.each([
    ["Academic oversight", /Principal academics workspace/i, /^Academics$/i],
    ["Results approval", /Principal approvals workspace/i, /^Approvals$/i],
    ["Report publishing", /Principal reports workspace/i, /^Reports$/i],
  ])("routes exams command action %s to the right workspace", async (label, regionName, heading) => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" section="exams-reports" tenantSlug="kisumu-boys" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(within(commandCenter).getByRole("button", { name: label }));

    const workspace = within(commandCenter).getByRole("region", { name: regionName });
    expect(workspace).toBeVisible();
    expect(within(workspace).getByRole("heading", { name: heading })).toBeVisible();
  });

  it("wires principal list workspace primary actions to real workspaces", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SchoolPages role="principal" section="staff" tenantSlug="homabay-high" userLabel="Principal Robini" />);

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    const staffWorkspace = within(commandCenter).getByRole("region", { name: /Principal staff workspace/i });

    await user.click(within(staffWorkspace).getAllByRole("button", { name: /Invite Staff/i })[0]);

    expect(within(commandCenter).getByRole("heading", { name: /Users & Invitations/i })).toBeVisible();
    expect(within(commandCenter).queryByText(/Action completed/i)).not.toBeInTheDocument();
  });
});
