"use client";

import { ShieldCheck, ShieldAlert, Lock, AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/ui/status-pill";

export type WorkspacePermission = "FULL_ACCESS" | "VIEW_ONLY" | "RESTRICTED" | "APPROVAL_REQUIRED";
export type WorkspaceModuleStatus = "ACTIVE" | "LOCKED" | "PENDING_SETUP" | "DISABLED_BY_SUPER_ADMIN";

interface WorkspaceHeaderProps {
  title: string;
  description: string;
  contextBar: {
    schoolName: string;
    academicYear: string;
    term: string;
    weekDate: string;
    userRole: string;
    scope: string;
  };
  permission: WorkspacePermission;
  moduleStatus: WorkspaceModuleStatus;
}

export function WorkspaceHeader({
  title,
  description,
  contextBar,
  permission,
  moduleStatus,
}: WorkspaceHeaderProps) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-[#C8D5EA]/45 bg-[linear-gradient(135deg,#071D49_0%,#123A7A_62%,#0F172A_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.20)]">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/78">{description}</p>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          <ModuleStatusBadge status={moduleStatus} />
          <PermissionBadge permission={permission} />
        </div>
      </div>
      
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-white/15 bg-white/[0.08] p-3 text-xs font-medium text-white/80">
        <span className="font-bold text-white">{contextBar.schoolName}</span>
        <span className="opacity-50">•</span>
        <span>{contextBar.academicYear}</span>
        <span className="opacity-50">•</span>
        <span>{contextBar.term}</span>
        <span className="opacity-50">•</span>
        <span>{contextBar.weekDate}</span>
        <span className="opacity-50">•</span>
        <span className="font-semibold text-cyan-200">{contextBar.userRole}</span>
        <span className="opacity-50">•</span>
        <span className="bg-white/10 px-2 py-0.5 rounded-full">{contextBar.scope}</span>
      </div>
    </section>
  );
}

function PermissionBadge({ permission }: { permission: WorkspacePermission }) {
  switch (permission) {
    case "FULL_ACCESS":
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
          <ShieldCheck className="h-3 w-3" />
          FULL ACCESS
        </div>
      );
    case "VIEW_ONLY":
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-300">
          <Lock className="h-3 w-3" />
          VIEW ONLY
        </div>
      );
    case "APPROVAL_REQUIRED":
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-300">
          <ShieldAlert className="h-3 w-3" />
          APPROVAL REQUIRED
        </div>
      );
    case "RESTRICTED":
      return (
        <div className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-bold text-rose-300">
          <AlertTriangle className="h-3 w-3" />
          RESTRICTED
        </div>
      );
  }
}

function ModuleStatusBadge({ status }: { status: WorkspaceModuleStatus }) {
  switch (status) {
    case "ACTIVE":
      return <StatusPill label="MODULE ACTIVE" tone="ok" />;
    case "LOCKED":
      return <StatusPill label="MODULE LOCKED" tone="warning" />;
    case "PENDING_SETUP":
      return <StatusPill label="PENDING SETUP" tone="warning" />;
    case "DISABLED_BY_SUPER_ADMIN":
      return <StatusPill label="DISABLED GLOBALLY" tone="critical" />;
  }
}
