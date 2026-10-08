import { fireEvent, render, screen, within } from "@testing-library/react";
import { ResetPasswordView } from "@/components/auth/auth-recovery-view";
import { InviteAcceptanceView } from "@/components/auth/auth-invitation-view";
import { InvitationAcceptanceView } from "@/components/auth/invitation-acceptance-view";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import userEvent from "@testing-library/user-event";

const forms = [
  { name: "reset", render: () => <ResetPasswordView title="Reset password" subtitle="Choose your password" secretLabel="New password" secretPlaceholder="" backHref="/school/login" initialToken={"a".repeat(40)} />, password: "New password", confirm: "Confirm new password", submit: "Save new password" },
  { name: "invitation", render: () => <InviteAcceptanceView initialToken={"a".repeat(40)} />, password: "Create password", confirm: "Confirm password", submit: "Create account" },
  { name: "account activation", render: () => <InvitationAcceptanceView initialToken={"a".repeat(40)} />, password: "Password", confirm: "Confirm password", submit: "Activate account" },
];

beforeEach(() => { global.fetch = jest.fn(); });

test.each(forms)("$name gives live requirements, strength and matching feedback", (form) => {
  render(form.render());
  const password = screen.getByLabelText(form.password, { exact: true });
  const confirmation = screen.getByLabelText(form.confirm, { exact: true });
  const rules = screen.getByRole("list", { name: "Password requirements" });
  expect(within(rules).getAllByRole("listitem")).toHaveLength(5);
  expect(password).toHaveAttribute("autocomplete", "new-password");
  expect(password).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByText(/Symbols and spaces are allowed/)).toBeVisible();
  fireEvent.change(password, { target: { value: "short" } });
  expect(password).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText(/Add at least 5 more characters/)).toBeVisible();
  expect(screen.getByText(/Add an uppercase letter/)).toBeVisible();
  expect(screen.getByText(/Add a number/)).toBeVisible();
  expect(screen.getByRole("meter", { name: /Password strength/ })).toHaveAttribute("aria-valuetext", "Weak");
  fireEvent.change(password, { target: { value: "NairobiBooks7!" } });
  expect(password).toHaveAttribute("aria-invalid", "false");
  expect(screen.queryByText(/Add at least/)).not.toBeInTheDocument();
  expect(within(rules).getAllByText("Met", { exact: true })).toHaveLength(5);
  fireEvent.change(confirmation, { target: { value: "different" } });
  expect(confirmation).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText(/Passwords do not match/)).toBeVisible();
  fireEvent.change(confirmation, { target: { value: "NairobiBooks7!" } });
  expect(screen.getByText("Passwords match.")).toBeVisible();
  fireEvent.change(password, { target: { value: "NairobiBooks8!" } });
  expect(screen.getByText(/Passwords do not match/)).toBeVisible();
  expect(global.fetch).not.toHaveBeenCalled();
});

test.each(forms)("$name rejects overlong input without truncation and clears stale submit errors", (form) => {
  render(form.render());
  const password = screen.getByLabelText(form.password, { exact: true });
  const confirmation = screen.getByLabelText(form.confirm, { exact: true });
  fireEvent.click(screen.getByRole("button", { name: form.submit }));
  expect(password).toHaveAttribute("aria-invalid", "true");
  const long = "Aa1" + "x".repeat(126);
  fireEvent.change(password, { target: { value: long } });
  fireEvent.change(confirmation, { target: { value: long } });
  expect(password).toHaveValue(long);
  expect(screen.getByText(/Remove 1 character to stay within 128/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: form.submit }));
  expect(global.fetch).not.toHaveBeenCalled();
  fireEvent.change(password, { target: { value: "NairobiBooks7!" } });
  fireEvent.change(confirmation, { target: { value: "NairobiBooks7!" } });
  expect(password).toHaveAttribute("aria-invalid", "false");
  expect(confirmation).toHaveAttribute("aria-invalid", "false");
  expect(screen.queryByText(/Remove 1 character/)).not.toBeInTheDocument();
});

test("paste preserves supported Unicode, symbols and whitespace; clearing restores guidance", async () => {
  const user = userEvent.setup();
  render(forms[0].render());
  const password = screen.getByLabelText("New password", { exact: true });
  const confirmation = screen.getByLabelText("Confirm new password");
  const value = "  Nairobi7!😀  ";
  await user.click(password);
  await user.paste(value);
  await user.click(confirmation);
  await user.paste(value);
  expect(password).toHaveValue(value);
  expect(password).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByText("Passwords match.")).toBeVisible();
  await user.clear(password);
  expect(screen.getByText(/Passwords do not match/)).toBeVisible();
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Not entered");
  expect(global.fetch).not.toHaveBeenCalled();
});

test("strength is advisory and does not call long repetitive passwords strong", () => {
  const props = { confirmation: "", onPasswordChange: jest.fn(), onConfirmationChange: jest.fn() };
  const { rerender } = render(<NewPasswordFields {...props} password="Aa1aaaaaaaaaaaaaaaaaaaa" />);
  expect(screen.getByLabelText("New password", { exact: true })).toHaveAttribute("aria-invalid", "false");
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Weak");
  rerender(<NewPasswordFields {...props} password="River7!Orbit-Lantern" />);
  expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Strong");
});

test("requirements and match guidance are associated with inputs and Caps Lock does not hide errors", () => {
  render(forms[0].render());
  const password = screen.getByLabelText("New password", { exact: true });
  fireEvent.change(password, { target: { value: "short" } });
  const event = new KeyboardEvent("keyup", { bubbles: true });
  Object.defineProperty(event, "getModifierState", { value: () => true });
  fireEvent(password, event);
  expect(screen.getByText("Caps Lock is on.")).toBeVisible();
  expect(screen.getByText(/Add at least 5 more characters/)).toBeVisible();
  const helpers = password.getAttribute("aria-describedby")!.split(" ").map((id) => document.getElementById(id));
  expect(helpers.every(Boolean)).toBe(true);
  expect(helpers.some((helper) => helper!.textContent!.includes("Password requirements"))).toBe(true);
  expect(helpers.some((helper) => helper!.getAttribute("aria-live") === "polite")).toBe(true);
  fireEvent.click(screen.getAllByRole("button", { name: "Show password" })[0]);
  expect(password).toHaveAttribute("type", "text");
  fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
  expect(password).toHaveAttribute("type", "password");
});
