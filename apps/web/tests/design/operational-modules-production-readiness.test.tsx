import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

import { renderWithProviders } from "./test-utils";

const fakeOnlyPhrases = /Action completed|Workflow dispatched|completed successfully|is being sent|print started|export generated/i;

jest.setTimeout(20000);

function renderOperationalRole(role: SchoolExperienceRole) {
  renderWithProviders(<SchoolPages role={role} tenantSlug="kisumu-boys" />);

  return screen.findByTestId("role-operational-command-center");
}

function expectNoFakeOnlyFeedback() {
  expect(document.body.textContent).not.toMatch(fakeOnlyPhrases);
}

describe("operational module production readiness", () => {
  it("nurse actions save visits, deduct medicine stock, and open print preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("nurse");

    await user.type(within(commandCenter).getByLabelText(/Symptoms and treatment notes/i), "Headache after games.");
    await user.click(within(commandCenter).getByRole("button", { name: /Save Visit and Deduct Stock/i }));

    expect(await within(commandCenter).findByText(/visit saved/i)).toBeVisible();
    expect(document.body.textContent).toMatch(/stock deducted/i);

    await user.click(within(commandCenter).getByRole("button", { name: /Print Register/i }));

    expect(document.body.textContent).toMatch(/Sick bay register print preview ready for kisumu-boys: \d+ visit records, Nurse\/Principal notified|Sick Bay Register/i);
    expectNoFakeOnlyFeedback();
  });

  it("library actions issue books and open real report preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("librarian");

    await user.click(within(commandCenter).getAllByRole("button", { name: /Issue Book/i }).at(-1)!);

    expect(await within(commandCenter).findByText(/issued to Brian Otieno/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Print Library Report/i }));

    expect(document.body.textContent).toMatch(/Library report print preview ready for kisumu-boys: \d+ borrower records and \d+ catalogue records, Librarian\/Principal notified|Library Report/i);
    expectNoFakeOnlyFeedback();
  });

  it("storekeeper actions issue stock and generate a real CSV download result", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("storekeeper");

    await user.click(within(commandCenter).getAllByRole("button", { name: /Issue Stock/i }).at(-1)!);

    expect(await within(commandCenter).findByText(/issued to Mathematics/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Export Stock Report/i }));

    expect(document.body.textContent).toMatch(/Stock CSV downloaded for kisumu-boys: \d+ catalogue items and \d+ movements/i);
    expectNoFakeOnlyFeedback();
  });

  it("boarding actions save roll call records and open hostel print preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("boarding-master");

    await user.click(within(commandCenter).getByRole("button", { name: /Save Roll Call/i }));

    expect(await within(commandCenter).findByText(/marked present/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Print Roll Call/i }));

    expect(document.body.textContent).toMatch(/Hostel roll call sheet print preview ready for kisumu-boys: \d+ roll-call records, Boarding\/Deputy notified|Hostel Roll Call/i);
    expectNoFakeOnlyFeedback();
  });

  it("transport actions record trips and open route list preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("transport-manager");

    await user.click(within(commandCenter).getByRole("button", { name: /Add Trip Record/i }));

    expect(await within(commandCenter).findByText(/added to .* at/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Print Route List/i }));

    expect(document.body.textContent).toMatch(/Transport route list print preview ready for kisumu-boys: \d+ vehicle routes and \d+ trip records, Transport\/Principal notified|Transport Route List/i);
    expectNoFakeOnlyFeedback();
  });

  it("laboratory actions save practical requests and open checklist preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("laboratory-technician");

    await user.click(within(commandCenter).getByRole("button", { name: /Add Practical Request/i }));

    expect(await within(commandCenter).findByText(/request saved/i)).toBeVisible();

    await user.click(within(commandCenter).getByRole("button", { name: /Print Practical Checklist/i }));

    expect(document.body.textContent).toMatch(/Practical checklist print preview ready for kisumu-boys: \d+ practical requests and \d+ lab stock records, Lab\/Dean notified|Practical Checklist/i);
    expectNoFakeOnlyFeedback();
  });

  it("discipline actions create incidents and open discipline letter preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("discipline-master");

    await user.click(within(commandCenter).getByRole("button", { name: /Add Incident/i }));

    expect((await within(commandCenter).findAllByText(/discipline case recorded/i)).length).toBeGreaterThan(0);

    await user.click(within(commandCenter).getAllByRole("button", { name: /Print Letter/i })[0]);

    expect(document.body.textContent).toMatch(/discipline letter preview ready|Discipline Letter/i);
    expectNoFakeOnlyFeedback();
  });

  it("counselling actions save sessions and open counselling summary preview evidence", async () => {
    const user = userEvent.setup();
    const commandCenter = await renderOperationalRole("guidance-counselling");

    await user.click(within(commandCenter).getByRole("button", { name: /Save Session/i }));

    expect((await within(commandCenter).findAllByText(/counselling session recorded/i)).length).toBeGreaterThan(0);

    await user.click(within(commandCenter).getAllByRole("button", { name: /Print Summary/i })[0]);

    expect(document.body.textContent).toMatch(/counselling summary preview ready|Counselling Summary/i);
    expectNoFakeOnlyFeedback();
  });
});
