export function getMissingFieldError(fields: Array<{ label: string; value: string }>) {
  const missingField = fields.find((field) => field.value.trim().length === 0);
  return missingField ? `${missingField.label} is required.` : null;
}

export function getApiResponseMessage(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }
  return null;
}
