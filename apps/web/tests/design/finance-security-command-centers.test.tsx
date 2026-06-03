import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AccountantCommandCenter } from "@/components/school/accountant-command-center";
import { SecurityCommandCenter } from "@/components/school/security-command-center";
import { readSchoolData } from "@/lib/school/school-operational-store";

import { renderWithProviders } from "./test-utils";

jest.setTimeout(20000);

describe("finance and security command center interactions", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("makes accountant search and finance export controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccountantCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/search receipts, parents, students, invoices, suppliers, or bank references/i), "QEX7");
    await user.click(screen.getByRole("button", { name: /m-pesa qex7abc123/i }));

    expect(screen.getByText(/m-pesa qex7abc123 opened in finance section/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^export$/i }));
    const exportPreview = screen.getByRole("dialog", { name: /finance export preview/i });
    expect(exportPreview).toBeVisible();
    expect(within(exportPreview).getByText(/recent transactions/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /download csv/i }));
    expect(screen.getByText(/recent transactions export downloaded/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "FINANCE_EXPORT_DOWNLOADED",
          module: "finance",
        }),
      ]),
    );
  });

  it("opens accountant finance intelligence actions as traceable school work", async () => {
    const user = userEvent.setup();

    renderWithProviders(<AccountantCommandCenter routeMode="hosted" />);

    await user.click(screen.getByRole("button", { name: /generate arrears campaign/i }));

    const intelligenceDialog = screen.getByRole("dialog", { name: /finance intelligence action/i });
    expect(intelligenceDialog).toBeVisible();
    expect(within(intelligenceDialog).getByText(/fee collection dropped 14% compared to last month/i)).toBeVisible();

    await user.click(within(intelligenceDialog).getByRole("button", { name: /create finance task/i }));

    expect(screen.getByText(/generate arrears campaign task created/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "FINANCE_INTELLIGENCE_TASK_CREATED",
          module: "finance",
        }),
      ]),
    );
  });

  it("makes security search and emergency controls visible as working actions", async () => {
    const user = userEvent.setup();

    renderWithProviders(<SecurityCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/quick search visitors, id numbers, vehicles, students, staff, or incidents/i), "Grace");
    await user.click(screen.getByRole("button", { name: /grace achieng/i }));

    expect(screen.getByText(/grace achieng opened in security records/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /emergency panic/i }));
    const panicDialog = screen.getByRole("dialog", { name: /security emergency panic/i });
    expect(panicDialog).toBeVisible();
    expect(within(panicDialog).getAllByText(/principal, deputy, security team, and system monitor/i).length).toBeGreaterThan(0);

    await user.click(within(panicDialog).getByRole("button", { name: /raise emergency alert/i }));

    expect(screen.getByText(/emergency panic alert raised/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "SECURITY_EMERGENCY_PANIC_RAISED",
          module: "security",
        }),
      ]),
    );

    await user.click(screen.getByRole("button", { name: /security notifications/i }));
    const notificationsDialog = screen.getByRole("dialog", { name: /security notifications/i });
    expect(notificationsDialog).toBeVisible();
    expect(within(notificationsDialog).getByText(/active security incidents/i)).toBeVisible();

    await user.click(within(notificationsDialog).getByRole("button", { name: /mark urgent alerts reviewed/i }));

    expect(screen.getByText(/security notifications reviewed/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "SECURITY_NOTIFICATIONS_REVIEWED",
          module: "security",
        }),
      ]),
    );
  });

  it("lets security check in and check out a visitor from the active visitor desk", async () => {
    const user = userEvent.setup();
    const printMock = jest.fn();
    Object.defineProperty(window, "print", { value: printMock, writable: true });

    renderWithProviders(<SecurityCommandCenter routeMode="hosted" />);

    await user.type(screen.getByLabelText(/quick search visitors, id numbers, vehicles, students, staff, or incidents/i), "Grace");
    await user.click(screen.getByRole("button", { name: /grace achieng/i }));

    await user.type(screen.getByLabelText(/visitor name/i), "Peter Ouma");
    await user.type(screen.getByLabelText(/id or passport number/i), "28473390");
    await user.type(screen.getByLabelText(/visitor phone/i), "0711 222 333");
    await user.type(screen.getByLabelText(/person being visited/i), "Secretary");
    await user.type(screen.getByLabelText(/visit reason/i), "Admission inquiry");
    await user.type(screen.getByLabelText(/vehicle registration/i), "KDD 129P");
    await user.click(screen.getByRole("button", { name: /check in/i }));

    expect(screen.getByText(/peter ouma checked in/i)).toBeVisible();
    expect(screen.getByText(/admission inquiry/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "VISITOR_CHECKED_IN",
          module: "visitors",
        }),
      ]),
    );

    await user.click(screen.getAllByRole("button", { name: /alert office/i })[0]);
    expect(screen.getByText(/office alerted about peter ouma/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "SECURITY_OFFICE_ALERT_SENT",
          module: "security",
        }),
      ]),
    );

    await user.click(screen.getAllByRole("button", { name: /print slip/i })[0]);
    expect(screen.getByText(/visitor slip opened for printing/i)).toBeVisible();
    expect(screen.getByRole("dialog", { name: /visitor gate slip/i })).toBeVisible();
    expect(printMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /^print$/i }));
    expect(printMock).toHaveBeenCalled();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "VISITOR_SLIP_PRINTED",
          module: "visitors",
        }),
      ]),
    );

    await user.click(screen.getAllByRole("button", { name: /check out/i })[0]);
    expect(screen.getByText(/peter ouma checked out/i)).toBeVisible();
    expect(screen.getByText(/exited/i)).toBeVisible();
    expect(readSchoolData<Record<string, unknown>>("events", "kb-high")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          schoolId: "kb-high",
          type: "VISITOR_CHECKED_OUT",
          module: "visitors",
        }),
      ]),
    );
  });
});
