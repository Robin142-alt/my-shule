"use client";

import { useMemo, useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  openPrintDocument,
  type PrintableRow,
} from "@/lib/dashboard/export";
import {
  getCurrentSchoolId,
  publishSchoolOperationalEvent,
} from "@/lib/school/school-operational-store";

export type OperationalFormField = {
  id: string;
  label: string;
  type: "text" | "number" | "tel" | "email" | "date" | "time" | "textarea" | "select";
  value?: string;
  options?: string[];
  required?: boolean;
};

export type OperationalFormFooterAction =
  | "Cancel"
  | "Save Draft"
  | "Submit"
  | "Preview"
  | "Print"
  | "Submit for Approval"
  | "Send SMS"
  | "Preview Print";

export type OperationalFormContract = {
  title: string;
  description: string;
  fields: OperationalFormField[];
  footerActions: OperationalFormFooterAction[];
  auditAction: string;
  workflowBinding: string;
  capability: string;
};

export type OperationalFormValues = Record<string, string>;

function fieldKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSchoolScopedFormStorageKey(formId: string) {
  const fallbackSchoolId = "default-school";

  if (typeof window === "undefined") {
    return `myshule:${fallbackSchoolId}:operational-form:${formId}`;
  }

  try {
    const configuredSchoolId = window.localStorage.getItem("myshule.currentSchoolId");
    const routeSchoolId = window.location.pathname.match(/^\/school\/([^/?#]+)/)?.[1];
    const schoolId = configuredSchoolId || routeSchoolId || fallbackSchoolId;

    return `myshule:${schoolId}:operational-form:${formId}`;
  } catch {
    return `myshule:${fallbackSchoolId}:operational-form:${formId}`;
  }
}

function resolveOperationalSchoolId() {
  if (typeof window === "undefined") {
    return "default-school";
  }

  try {
    const configuredSchoolId = window.localStorage.getItem("myshule.currentSchoolId")?.trim();
    const routeSchoolId = window.location.pathname.match(/^\/school\/([^/?#]+)/)?.[1]?.trim();

    return configuredSchoolId || routeSchoolId || "default-school";
  } catch {
    return "default-school";
  }
}

export function OperationalFormShell({
  contract,
  onAction,
  showExecutionContract = true,
}: {
  contract: OperationalFormContract;
  onAction?: (
    action: OperationalFormFooterAction,
    contract: OperationalFormContract,
    values: OperationalFormValues,
  ) => void | Promise<void>;
  showExecutionContract?: boolean;
}) {
  const formId = fieldKey(contract.title);
  const storageKey = getSchoolScopedFormStorageKey(formId);
  const defaultValues = useMemo(
    () =>
      Object.fromEntries(
        contract.fields.map((field) => [fieldKey(field.label), field.value ?? ""]),
      ) as OperationalFormValues,
    [contract.fields],
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"success" | "warning" | "danger">("success");
  const [busyAction, setBusyAction] = useState<OperationalFormFooterAction | null>(null);
  const [values, setValues] = useState<OperationalFormValues>(() => {
    if (typeof window === "undefined") {
      return defaultValues;
    }

    try {
      const stored = window.localStorage.getItem(storageKey);

      return stored ? { ...defaultValues, ...(JSON.parse(stored) as OperationalFormValues) } : defaultValues;
    } catch {
      return defaultValues;
    }
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(nextValues: OperationalFormValues) {
    const nextErrors: Record<string, string> = {};

    contract.fields.forEach((field) => {
      const key = fieldKey(field.label);

      if (field.required === false) {
        return;
      }

      if (!nextValues[key]?.trim()) {
        nextErrors[key] = `${field.label} is required.`;
      }
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function persistDraft(nextValues: OperationalFormValues) {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextValues));
  }

  function clearDraft() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }

  function closeOpenPrintPreviews() {
    if (typeof document === "undefined") {
      return;
    }

    document.querySelectorAll("[data-myshule-print-preview]").forEach((preview) => preview.remove());
  }

  function printValues(nextValues: OperationalFormValues, title = contract.title) {
    const rows: PrintableRow[] = contract.fields.map((field) => ({
      label: field.label,
      value: nextValues[fieldKey(field.label)] || "Not provided",
    }));

    openPrintDocument({
      eyebrow: "School form printout",
      title,
      subtitle: contract.description,
      rows,
      footer: "Generated from MyShule school desk. Confirm details before filing.",
    });
  }

  function formEventType(action: OperationalFormFooterAction) {
    return `operational_form.${action.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "action"}`;
  }

  function publishFormAction(action: OperationalFormFooterAction, nextValues: OperationalFormValues) {
    const normalized = action.toLowerCase();
    const schoolId = getCurrentSchoolId(resolveOperationalSchoolId());
    const providedFields = Object.entries(nextValues)
      .filter(([, value]) => value.trim().length > 0)
      .map(([key]) => key);

    publishSchoolOperationalEvent({
      schoolId,
      type: formEventType(action),
      module: contract.workflowBinding || "operational-form",
      actorRole: "school-staff",
      entityId: `${contract.title}:${action}`,
      title: `${contract.title}: ${action}`,
      body: `${action} accepted for ${contract.title} with ${providedFields.length} completed field${providedFields.length === 1 ? "" : "s"}.`,
      severity: /approval|sms/.test(normalized) ? "warning" : "info",
      payload: {
        formTitle: contract.title,
        action,
        auditAction: contract.auditAction,
        workflowBinding: contract.workflowBinding,
        capability: contract.capability,
        providedFields,
        values: nextValues,
      },
      notifications: /approval|submit|sms/.test(normalized)
        ? [
            {
              audienceRoles: ["Principal", "Deputy Principal", "System Monitor"],
              title: `${contract.title}: ${action}`,
              body: `${action} was recorded for ${contract.title}.`,
              severity: /approval|sms/.test(normalized) ? "warning" : "info",
              relatedModule: contract.workflowBinding || "operational-form",
              relatedRecordId: `${contract.title}:${action}`,
              requiresAction: /approval/.test(normalized),
            },
          ]
        : undefined,
      sms: /sms/.test(normalized)
        ? [
            {
              recipient: nextValues.phone || nextValues.mobile || nextValues.parent || "school-contact",
              message: `${contract.title}: ${action} has been recorded by the school.`,
            },
          ]
        : undefined,
    });
  }

  async function runAction(action: OperationalFormFooterAction, nextValues: OperationalFormValues) {
    if (action !== "Preview" && action !== "Print" && action !== "Preview Print") {
      closeOpenPrintPreviews();
    }
    setBusyAction(action);

    try {
      if (onAction) {
        await onAction(action, contract, nextValues);
      } else {
        publishFormAction(action, nextValues);
      }
      setNoticeTone(action === "Save Draft" ? "warning" : "success");
      if (action === "Save Draft") {
        setNotice("Draft saved locally for this school. It will not be treated as submitted until you submit it.");
      } else if (onAction) {
        setNotice(`${action} returned from the connected workflow.`);
      } else {
        setNotice(`${action} was recorded for this school and queued for dashboard sync.`);
      }
    } catch (error) {
      setNoticeTone("danger");
      setNotice(error instanceof Error ? error.message : `${action} failed. Try again.`);
    } finally {
      setBusyAction(null);
    }
  }

  function setFieldValue(field: OperationalFormField, value: string) {
    const key = fieldKey(field.label);

    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function renderField(field: OperationalFormField) {
    const className =
      "mt-1 w-full rounded-[var(--radius-xs)] border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent";
    const name = fieldKey(field.label);
    const value = values[name] ?? "";

    if (field.type === "textarea") {
      return (
        <textarea
          id={field.id}
          name={name}
          value={value}
          onChange={(event) => setFieldValue(field, event.currentTarget.value)}
          className={`${className} min-h-24`}
        />
      );
    }

    if (field.type === "select") {
      const options = field.options ?? [field.value ?? "Select option"];

      return (
        <select
          id={field.id}
          name={name}
          value={value}
          onChange={(event) => setFieldValue(field, event.currentTarget.value)}
          className={className}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {options.filter(Boolean).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        id={field.id}
        name={name}
        type={field.type}
        value={value}
        onChange={(event) => setFieldValue(field, event.currentTarget.value)}
        className={className}
      />
    );
  }

  return (
    <Card className="p-5">
      <form
        id={formId}
        aria-label={contract.title}
        onSubmit={(event) => {
          event.preventDefault();
          const nextValues = { ...values };

          if (!validate(nextValues)) {
            setNotice("Check the highlighted fields before submitting.");
            return;
          }

          clearDraft();
          setNoticeTone("warning");
          setNotice("Saving...");
          void runAction("Submit", nextValues);
        }}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-[var(--radius-sm)] border border-accent/20 bg-accent-soft p-2 text-accent">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <p className="eyebrow">School form</p>
            <h2 className="mt-2 text-lg font-bold text-foreground">{contract.title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{contract.description}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {contract.fields.map((field) => (
            <label key={field.id} htmlFor={field.id} className="text-xs font-bold text-muted">
              {field.label}
              {renderField(field)}
              {errors[fieldKey(field.label)] ? (
                <span className="mt-1 block text-[11px] font-bold text-danger">
                  {errors[fieldKey(field.label)]}
                </span>
              ) : null}
            </label>
          ))}
        </div>

        {showExecutionContract ? (
          <div className="mt-5 rounded-[var(--radius-sm)] border border-border bg-primary-soft/35 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-accent" />
              Action details
            </div>
            <div className="mt-2 grid gap-2 text-[11px] font-semibold text-muted sm:grid-cols-3">
              <span>Permission checked</span>
              <span>Related records update after saving</span>
              <span>Reporting record kept</span>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-[var(--radius-sm)] border border-[#D7E0EF] bg-[#EEF6FF] px-3 py-2 text-xs font-semibold text-[#40608F]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0B3A7A]" />
            This form saves the update, refreshes related desks, and keeps a reporting record.
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {contract.footerActions.map((action) => (
            <button
              key={action}
              type={action === "Submit" ? "submit" : "button"}
              aria-label={action}
              onClick={(event) => {
                if (action !== "Submit") {
                  const currentForm = event.currentTarget.form;
                  const nextValues = { ...values };

                  if (action === "Cancel") {
                    closeOpenPrintPreviews();
                    setValues(defaultValues);
                    setErrors({});
                    clearDraft();
                    currentForm?.reset();
                    setNoticeTone("warning");
                    setNotice("Form cleared. No school record was changed.");
                    return;
                  } else if (action === "Preview") {
                    printValues(nextValues, `${contract.title} preview`);
                    publishFormAction(action, nextValues);
                    setNoticeTone("success");
                    setNotice(`${contract.title} preview is ready and the preview action was recorded.`);
                  } else if (action === "Print") {
                    printValues(nextValues, `${contract.title} print copy`);
                    publishFormAction(action, nextValues);
                    setNoticeTone("success");
                    setNotice(
                      `${contract.title} print copy ready with ${contract.fields.length} field${contract.fields.length === 1 ? "" : "s"} loaded.`,
                    );
                  } else if (action === "Save Draft") {
                    persistDraft(nextValues);
                    void runAction(action, nextValues);
                    return;
                  } else if (action === "Send SMS") {
                    if (!validate(nextValues)) {
                      setNoticeTone("danger");
                      setNotice("Check the highlighted fields before sending SMS.");
                      return;
                    }
                    setNoticeTone("warning");
                    setNotice("Queuing SMS...");
                    void runAction(action, nextValues);
                    return;
                  } else if (action === "Preview Print") {
                    if (!validate(nextValues)) {
                      setNoticeTone("danger");
                      setNotice("Check the highlighted fields before preparing the print preview.");
                      return;
                    }
                    printValues(nextValues, `${contract.title} print preview`);
                    publishFormAction(action, nextValues);
                    setNoticeTone("success");
                    setNotice(
                      `${contract.title} print preview ready with ${contract.fields.length} field${contract.fields.length === 1 ? "" : "s"} loaded.`,
                    );
                  } else if (action === "Submit for Approval") {
                    if (!validate(nextValues)) {
                      setNoticeTone("danger");
                      setNotice("Check the highlighted fields before submitting for approval.");
                      return;
                    }
                    setNoticeTone("warning");
                    setNotice("Submitting for approval...");
                    void runAction(action, nextValues);
                    return;
                  }

                  if (action !== "Preview" && action !== "Print" && action !== "Preview Print") {
                    void runAction(action, nextValues);
                  }
                }
              }}
              disabled={busyAction !== null}
              className={`rounded-[var(--radius-xs)] border px-3 py-2 text-xs font-bold transition hover:-translate-y-0.5 ${
                action === "Submit" || action === "Submit for Approval" || action === "Send SMS"
                  ? "border-accent/25 bg-accent-soft text-accent"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              {busyAction === action ? `${action}...` : action}
            </button>
          ))}
        </div>

        {notice ? (
          <div className={`mt-4 rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-bold ${
            noticeTone === "danger"
              ? "border-danger/20 bg-danger-soft text-danger"
              : noticeTone === "warning"
                ? "border-warning/20 bg-warning-soft text-warning"
                : "border-success/20 bg-success-soft text-success"
          }`}>
            {notice}
          </div>
        ) : null}
      </form>
    </Card>
  );
}
