export type SmsReadinessResponse = {
  can_send: boolean;
  disabled_reason?: string;
  missing?: string[];
};

export type CommunicationRecipient = {
  id: string;
  name: string;
  role: "parent" | "guardian" | "staff" | "student";
  phone?: string;
  linkedStudent?: string;
};

export type BulkSmsResult = {
  sent_count: number;
  failed_count: number;
  skipped_count: number;
  failures: Array<{ recipient_id: string; reason: string }>;
  skipped: Array<{ recipient_id: string; reason: string }>;
};

export function mapSmsReadinessToDisabledReason(readiness: SmsReadinessResponse): string | null {
  if (readiness.can_send) {
    return null;
  }

  return `Disabled: ${readiness.disabled_reason || "SMS provider is not configured."}`;
}

export function splitSmsRecipients(recipients: CommunicationRecipient[]) {
  return {
    sendable: recipients.filter((recipient) => Boolean(recipient.phone?.trim())),
    missingPhone: recipients.filter((recipient) => !recipient.phone?.trim()),
  };
}

export function smsResultSummary(result: BulkSmsResult) {
  return `SMS queued: ${result.sent_count} sent, ${result.failed_count} failed, ${result.skipped_count} skipped.`;
}
