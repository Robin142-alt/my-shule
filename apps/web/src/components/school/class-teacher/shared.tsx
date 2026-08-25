"use client";

import { type ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";
export type TeacherView = "home" | "register" | "attendance" | "progress" | "comments" | "discipline" | "welfare" | "health" | "communication" | "meetings" | "homework" | "timetable" | "documents" | "requests" | "reports" | "notifications" | "settings" | string;

export const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    card: "border-blue-200 bg-blue-50 text-blue-950",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50 text-rose-950",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-white text-[#071D49]",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

function classTeacherActionSlug(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function persistClassTeacherWorkflowAction(title: string, body: string, tone: "success" | "info" | "warning" | "danger") {
  return requestDashboardApi("/api/admin-command/class-teacher/actions", {
    method: "POST",
    body: {
      action: classTeacherActionSlug(title),
      title,
      description: body,
      priority: tone === "danger" || tone === "warning" ? "high" : "normal",
      source: "class-teacher-dashboard",
    },
  });
}

type ClassTeacherCommunicationInput = {
  audience: string;
  message: string;
  subject?: string;
  learnerId?: string;
  classSectionId?: string;
  sendSms?: boolean;
  source?: string;
};

export async function sendClassTeacherCommunication(input: ClassTeacherCommunicationInput) {
  const message = input.message.trim();
  if (!message) {
    toast.error("Message is required before sending a class-teacher communication.");
    return false;
  }

  try {
    const response = await requestDashboardApi<{ message?: string }>("/api/admin-command/class-teacher/communications", {
      method: "POST",
      body: {
        audience: input.audience,
        message,
        subject: input.subject,
        learnerId: input.learnerId,
        classSectionId: input.classSectionId,
        sendSms: Boolean(input.sendSms),
        source: input.source ?? "class-teacher-dashboard",
      },
    });

    toast.success(response?.message || "Class-teacher communication queued.", {
      description: input.subject || message,
    });
    publishSchoolOperationalEvent({
      type: "class_teacher.communication_sent",
      module: "class_teacher",
      actorRole: "class_teacher",
      title: input.subject || "Class-teacher communication",
      body: message,
    });
    return true;
  } catch (error) {
    toast.error("Class-teacher communication was not sent", {
      description: error instanceof Error ? error.message : "The communication could not be queued for the selected audience.",
    });
    return false;
  }
}

export function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export async function recordClassTeacherAction(title: string, body: string, tone: "success" | "info" | "warning" | "danger" = "info") {
  try {
    await persistClassTeacherWorkflowAction(title, body, tone);
  } catch (error) {
    toast.error("Class-teacher action was not saved", {
      description: error instanceof Error ? error.message : "The action could not be persisted for audit and dashboard follow-up.",
    });
    return false;
  }

  const notify = tone === "danger" ? toast.error : tone === "success" ? toast.success : toast.info;
  notify(title, { description: body });
  publishSchoolOperationalEvent({
    type: "class_teacher.workflow_action",
    module: "class_teacher",
    actorRole: "class_teacher",
    title,
    body,
  });
  return true;
}

export async function openClassTeacherRecord(title: string, rows: Array<[string, string]>) {
  const persisted = await recordClassTeacherAction("Class-teacher record opened", `${title} is ready for preview, print, or PDF download.`, "success");
  if (!persisted) {
    return;
  }

  openPrintDocument({
    eyebrow: "MyShule Class Teacher",
    title,
    subtitle: `School: ${getCurrentSchoolId() || "current tenant"} | Generated ${new Date().toLocaleString()}`,
    rows: rows.map(([label, value]) => ({ label, value })),
    footer: "Class teacher actions should preserve learner, parent, stream, and follow-up context.",
  });
}

export async function exportClassTeacherCsv(filename: string, headers: string[], rows: string[][], title: string) {
  const persisted = await recordClassTeacherAction("Class-teacher export created", `${title} was downloaded for the current class stream.`, "success");
  if (!persisted) {
    return;
  }

  downloadCsvFile({ filename, headers, rows });
}
