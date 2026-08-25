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
  provider_accepted_count: number;
  delivery_unknown_count: number;
  failed_count: number;
  skipped_count: number;
  provider_accepted: Array<{ recipient_id: string; status: "provider_accepted" }>;
  delivery_unknown: Array<{ recipient_id: string; status: "delivery_unknown"; reason: string }>;
  failed: Array<{ recipient_id: string; reason: string }>;
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
  return `SMS provider accepted: ${result.provider_accepted_count}; needs delivery review: ${result.delivery_unknown_count}; failed: ${result.failed_count}; skipped: ${result.skipped_count}.`;
}
