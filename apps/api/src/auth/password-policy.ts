// Browser-safe contract shared by password creation forms and API services.
// Symbols, Unicode and whitespace are supported; never trim or rewrite passwords.
export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

export function evaluatePassword(password: string) {
  // Match class-validator's character counting, including supplementary Unicode.
  const length = Array.from(password).length;
  const rules = [
    {
      id: 'min-length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: length >= PASSWORD_MIN_LENGTH,
      correction: `Add at least ${PASSWORD_MIN_LENGTH - length} more character${PASSWORD_MIN_LENGTH - length === 1 ? '' : 's'}.`,
    },
    {
      id: 'max-length',
      label: `No more than ${PASSWORD_MAX_LENGTH} characters`,
      met: length <= PASSWORD_MAX_LENGTH,
      correction: `Remove ${length - PASSWORD_MAX_LENGTH} character${length - PASSWORD_MAX_LENGTH === 1 ? '' : 's'} to stay within ${PASSWORD_MAX_LENGTH} characters.`,
    },
    { id: 'uppercase', label: 'An uppercase letter (A–Z)', met: /[A-Z]/.test(password), correction: 'Add an uppercase letter (A–Z).' },
    { id: 'lowercase', label: 'A lowercase letter (a–z)', met: /[a-z]/.test(password), correction: 'Add a lowercase letter (a–z).' },
    { id: 'number', label: 'A number (0–9)', met: /[0-9]/.test(password), correction: 'Add a number (0–9).' },
  ];
  return { length, rules, valid: rules.every((rule) => rule.met) };
}

export function getPasswordError(password: string): string | undefined {
  if (!password) return 'Enter a new password.';
  const errors = evaluatePassword(password).rules.filter((rule) => !rule.met);
  return errors.length ? errors.map((rule) => rule.correction).join(' ') : undefined;
}
