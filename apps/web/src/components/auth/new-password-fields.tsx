"use client";

import { Check, Circle, X } from "lucide-react";
import { useId } from "react";
import { AuthPasswordField } from "@/components/auth/auth-password-field";
import { evaluatePassword, getPasswordError } from "@/lib/auth/password-policy";

export function NewPasswordFields({
  value: password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  passwordLabel = "New password",
  confirmationLabel = "Confirm new password",
  passwordPlaceholder,
  showErrors = false,
  disabled = false,
}: {
  value: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  passwordLabel?: string;
  confirmationLabel?: string;
  passwordPlaceholder?: string;
  showErrors?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const { length, rules, valid } = evaluatePassword(password);
  const started = password.length > 0 || showErrors;
  const passwordError = started ? getPasswordError(password) : undefined;
  const confirmationError = confirmation
    ? password !== confirmation
      ? "Passwords do not match. Re-enter the same password in both fields."
      : undefined
    : showErrors ? "Re-enter your new password." : undefined;
  // This local estimate measures length and variety, not breach exposure or guessability.
  const variety = new Set(password.toLowerCase()).size;
  const score = !password ? 0 : !valid || variety < 6 ? 1 : length >= 18 && variety >= 10 ? 4 : length >= 14 && variety >= 8 ? 3 : 2;
  const strength = ["Not entered", "Weak", "Fair", "Good", "Strong"][score];
  const strengthColor = ["bg-border", "bg-danger", "bg-warning", "bg-accent", "bg-success"][score];

  return (
    <>
      <div className="space-y-3">
        <AuthPasswordField
          id={`${id}-password`}
          label={passwordLabel}
          placeholder={passwordPlaceholder}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="next"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          error={passwordError}
          aria-describedby={`${id}-requirements ${id}-strength-hint`}
          disabled={disabled}
        />
        <div className="space-y-3 rounded-[var(--radius)] border border-border bg-surface-muted p-3 text-sm">
          <div id={`${id}-requirements`}>
            <p className="mb-2 font-semibold text-foreground">Password requirements</p>
            <ul aria-label="Password requirements" className="space-y-1.5">
              {rules.map((rule) => {
                const state = started ? rule.met ? "Met" : "Not met" : "Required";
                const Icon = started ? rule.met ? Check : X : Circle;
                return (
                  <li key={rule.id} className={`flex items-start gap-2 ${started ? rule.met ? "text-success" : "text-danger" : "text-muted-strong"}`}>
                    <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span><span className="sr-only">{state}</span>{rule.label}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs leading-5 text-muted-strong">Symbols and spaces are allowed. Symbols are optional.</p>
          </div>
          <div className="space-y-1.5 border-t border-border pt-3">
            <p className="flex flex-wrap justify-between gap-x-3 text-xs font-semibold text-foreground" aria-live="polite" aria-atomic="true">
              <span>Password strength (estimate)</span><span>{strength}</span>
            </p>
            <div role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={4} aria-valuenow={score} aria-valuetext={strength} className="flex gap-1">
              {[1, 2, 3, 4].map((segment) => <span key={segment} aria-hidden="true" className={`h-1.5 flex-1 rounded-full ${score >= segment ? strengthColor : "bg-border"}`} />)}
            </div>
            <p id={`${id}-strength-hint`} className="text-xs leading-5 text-muted-strong">Use a long, unique password. Avoid names, common phrases and passwords you use elsewhere.</p>
          </div>
        </div>
      </div>
      <AuthPasswordField
        id={`${id}-confirmation`}
        label={confirmationLabel}
        autoComplete="new-password"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="go"
        value={confirmation}
        onChange={(event) => onConfirmationChange(event.target.value)}
        error={confirmationError}
        hint={confirmation && !confirmationError ? "Passwords match." : "Re-enter your new password exactly."}
        disabled={disabled}
      />
    </>
  );
}
