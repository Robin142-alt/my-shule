import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SuperAdminShell } from "@/components/layouts/superadmin-shell";
import { ParentCommandCenter } from "@/components/portal/parent-command-center";
import { PortalPages } from "@/components/portal/portal-pages";
import { SuperadminPages } from "@/components/platform/superadmin-pages";
import { ExamsManagerCommandCenter } from "@/components/school/exams-manager-command-center";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("portal and platform command center interactions", () => {
  it("makes exams manager search and draft actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ExamsManagerCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search exams, classes, subjects, marks, or report cards/i), "Form 4");
    await user.click(screen.getByRole("button", { name: /form 4 mock series/i }));

    expect(screen.getByText(/form 4 mock series opened in exams records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /enter marks/i }));
    expect(screen.getByText(/marks entry sheet opened for selected class and subject/i)).toBeVisible();
  });

  it("makes parent topbar and emergency controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<ParentCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText(/parent notifications opened/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /emergency hotline/i })[0]);
    expect(screen.getByText(/emergency hotline opened/i)).toBeVisible();
  });

  it("makes student dashboard quick actions visible as working controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<PortalPages viewer="student" routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /view assignment/i }));
    expect(screen.getByText(/view assignment opened for the student account/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /message teacher/i }));
    expect(screen.getByText(/message teacher opened for the student account/i)).toBeVisible();
  });

  it("makes super admin shell search and notification controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SuperAdminShell userName="Robin Mwangi">
        <div>Platform owner content</div>
      </SuperAdminShell>,
    );

    await user.type(screen.getByLabelText(/search schools, tickets, logs/i), "Support");
    await user.click(screen.getByRole("button", { name: /support/i }));

    expect(screen.getByText(/support opened from platform search/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /platform notifications/i }));
    expect(screen.getByText(/platform items needing review/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /failed sms deliveries/i }));
    expect(screen.getByText(/failed sms deliveries opened for platform follow-up/i)).toBeVisible();
  });

  it("makes the system monitor infrastructure queue practical with retry, notify, resolve, and report actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SuperadminPages section="infrastructure" routeMode="public" />);

    expect(screen.getByRole("heading", { name: /failed jobs and recovery queue/i })).toBeVisible();
    expect(screen.getAllByText(/Kisumu Boys High School/i).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: /retry failed sms/i }));
    expect(screen.getByText(/failed sms retry started for kisumu boys high school/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /notify admin/i })[0]);
    expect(screen.getByText(/admin notified/i)).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /mark issue solved/i })[0]);
    expect(screen.getByText(/marked solved/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /download system report/i }));
    expect(screen.getByText(/system health report prepared/i)).toBeVisible();
  });
});
