"use client";

import type { ReactNode } from "react";

import { Modal } from "@/components/ui/modal";
import type { CommunicationRecipient } from "@/lib/dashboard/communication-workflows";

export function ActionConfirmationModal({
  open,
  title,
  description,
  recipients = [],
  missingRecipients = [],
  messagePreview,
  disabledReason,
  isSubmitting = false,
  confirmLabel = "Confirm",
  children,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description?: string;
  recipients?: CommunicationRecipient[];
  missingRecipients?: CommunicationRecipient[];
  messagePreview?: string;
  disabledReason?: string | null;
  isSubmitting?: boolean;
  confirmLabel?: string;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmDisabled = Boolean(disabledReason) || isSubmitting;

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-xs)] border border-border bg-surface px-3 py-2 text-xs font-bold text-foreground"
          >
            Close
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-[var(--radius-xs)] border border-accent/25 bg-accent-soft px-3 py-2 text-xs font-bold text-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Working..." : confirmLabel}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {children}

        {recipients.length ? (
          <section aria-label="Selected recipients" className="rounded-[var(--radius-sm)] border border-border bg-surface-muted p-3">
            <h4 className="text-xs font-black uppercase tracking-[0.12em] text-muted">Recipients</h4>
            <div className="mt-2 grid gap-2">
              {recipients.map((recipient) => (
                <p key={recipient.id} className="text-sm font-semibold text-foreground">
                  {recipient.name}
                  {recipient.linkedStudent ? <span className="text-muted"> - {recipient.linkedStudent}</span> : null}
                  {recipient.phone ? <span className="text-muted"> - {recipient.phone}</span> : null}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {missingRecipients.length ? (
          <section aria-label="Missing recipient contacts" className="rounded-[var(--radius-sm)] border border-warning/25 bg-warning-soft p-3">
            <h4 className="text-xs font-black uppercase tracking-[0.12em] text-warning">Missing contacts</h4>
            <div className="mt-2 grid gap-2">
              {missingRecipients.map((recipient) => (
                <p key={recipient.id} className="text-sm font-semibold text-warning">
                  {recipient.name}
                  {recipient.linkedStudent ? <span> - {recipient.linkedStudent}</span> : null}
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {messagePreview ? (
          <section aria-label="Message preview" className="rounded-[var(--radius-sm)] border border-border bg-surface p-3">
            <h4 className="text-xs font-black uppercase tracking-[0.12em] text-muted">Message preview</h4>
            <p className="mt-2 text-sm font-semibold leading-6 text-foreground">{messagePreview}</p>
          </section>
        ) : null}

        {disabledReason ? (
          <p className="rounded-[var(--radius-sm)] border border-danger/20 bg-danger-soft px-3 py-2 text-sm font-bold text-danger">
            {disabledReason}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
