export const MFA_CHALLENGE_REQUIRED_MESSAGE =
  "MFA challenge required for this role";

export const MFA_CHALLENGE_HELP_TEXT =
  "Enter the verification code sent to your account email to continue.";

export function isMfaChallengeRequiredMessage(message?: string | null) {
  return Boolean(
    message?.toLowerCase().includes("mfa challenge required"),
  );
}

export function isMfaChallengeRequiredError(error: unknown) {
  return error instanceof Error && isMfaChallengeRequiredMessage(error.message);
}

export function normalizeMfaCode(value?: string | null) {
  return (value ?? "").replace(/\D/g, "").slice(0, 6);
}
