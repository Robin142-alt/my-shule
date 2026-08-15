"use client";

import { useMemo, useState } from "react";
import { FileText, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  openPrintDocument,
  type PrintableRow,
} from "@/lib/dashboard/export";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";

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

function getSchoolScopedFormStorageKey(formId: string, schoolId: string) {
  const normalizedSchoolId = schoolId.trim();
  if (!normalizedSchoolId) {
    return null;
  }

  return `myshule:${normalizedSchoolId}:operational-form:${formId}`;
}

function loadSchoolScopedDraft(
  storageKey: string | null,
  defaultValues: OperationalFormValues,
) {
  if (typeof window === "undefined" || !storageKey) {
    return { ...defaultValues };
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    const parsed = stored ? JSON.parse(stored) as unknown : null;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ...defaultValues };
    }

    return Object.fromEntries(
      Object.entries(defaultValues).map(([key, fallback]) => [
        key,
        typeof (parsed as Record<string, unknown>)[key] === "string"
          ? (parsed as Record<string, string>)[key]
          : fallback,
      ]),
    ) as OperationalFormValues;
  } catch {
    return { ...defaultValues };
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
  const schoolId = useOptionalSchoolTenantId();
  const formId = fieldKey(contract.title);
  const storageKey = getSchoolScopedFormStorageKey(formId, schoolId ?? "");
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
  const [values, setValues] = useState<OperationalFormValues>(() =>
    loadSchoolScopedDraft(storageKey, defaultValues),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [draftScopeKey, setDraftScopeKey] = useState(storageKey);

  if (draftScopeKey !== storageKey) {
    setDraftScopeKey(storageKey);
    setValues(loadSchoolScopedDraft(storageKey, defaultValues));
    setErrors({});
    setNotice(null);
  }

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

    if (!storageKey) {
      throw new Error("A verified school context is required before saving this draft.");
    }

    window.localStorage.setItem(storageKey, JSON.stringify(nextValues));
  }

  function clearDraft() {
    if (typeof window !== "undefined" && storageKey) {
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

  async function runAction(action: OperationalFormFooterAction, nextValues: OperationalFormValues) {
    if (action !== "Preview" && action !== "Print" && action !== "Preview Print") {
      closeOpenPrintPreviews();
    }
    setBusyAction(action);

    try {
      if (action === "Save Draft") {
        persistDraft(nextValues);
      }

      if (onAction) {
        await onAction(action, contract, nextValues);
        if (action === "Submit") {
          clearDraft();
        }
      } else if (action === "Save Draft") {
        setNoticeTone("warning");
        setNotice("Draft saved locally for this verified school. It remains unsubmitted.");
        return;
      } else {
        throw new Error(`${action} is not connected to a school workflow. No school record was changed.`);
      }
      if (action === "Save Draft") {
        setNoticeTone("warning");
        setNotice("Draft saved locally for this verified school. It remains unsubmitted.");
      } else {
        setNoticeTone("success");
        setNotice(`${action} returned from the connected workflow.`);
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
                    setNoticeTone("success");
                    setNotice(`${contract.title} preview is ready. No school record was changed.`);
                  } else if (action === "Print") {
                    printValues(nextValues, `${contract.title} print copy`);
                    setNoticeTone("success");
                    setNotice(
                      `${contract.title} print copy ready with ${contract.fields.length} field${contract.fields.length === 1 ? "" : "s"} loaded. No school record was changed.`,
                    );
                  } else if (action === "Save Draft") {
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
                    setNoticeTone("success");
                    setNotice(
                      `${contract.title} print preview ready with ${contract.fields.length} field${contract.fields.length === 1 ? "" : "s"} loaded. No school record was changed.`,
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
