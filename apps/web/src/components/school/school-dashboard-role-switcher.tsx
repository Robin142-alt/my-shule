"use client";

import {
  Check,
  ChevronDown,
  GraduationCap,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";

function optionDescription(input: {
  isTeacherMode: boolean;
  isPrimary: boolean;
}) {
  if (input.isTeacherMode) {
    return "Use your assigned classes, subjects, timetable and teacher workflows.";
  }

  if (input.isPrimary) {
    return "Your primary school role and its assigned permissions.";
  }

  return "An additional role genuinely assigned to this school account.";
}

export function SchoolDashboardRoleSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const roleState = useOptionalSchoolDashboardRole();
  const [open, setOpen] = useState(false);

  if (
    !roleState
    || !roleState.liveDataEnabled
    || (roleState.availableRoles.length <= 1 && !roleState.error)
  ) {
    return null;
  }

  const activeOption = roleState.availableRoles.find(
    (option) => option.authorizationRoleCode.trim().toLowerCase()
      === roleState.activeAuthorizationRoleCode.trim().toLowerCase(),
  );
  const activeLabel = activeOption?.roleName ?? "Current dashboard";
  const degraded = roleState.availableRoles.length <= 1 && Boolean(roleState.error);

  return (
    <>
      <Button
        variant="secondary"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={degraded
          ? "Dashboard access is degraded. Open recovery details."
          : `Switch dashboard. Working as ${activeLabel}`}
        onClick={() => {
          setOpen(true);
        }}
        className={`min-h-11 min-w-0 max-w-full justify-between gap-2 px-3 text-left sm:min-w-[210px] ${className}`}
        data-testid="school-dashboard-role-switcher"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.14em] text-muted">
            {degraded ? "Dashboard access" : "Working as"}
          </span>
          <span className="block truncate text-xs font-black text-foreground">
            {degraded ? "Needs attention" : activeLabel}
          </span>
        </span>
        {degraded ? (
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        ) : roleState.isLoading || roleState.isSwitching ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
        )}
      </Button>

      <Modal
        open={open}
        onClose={() => {
          if (!roleState.isSwitching) {
            setOpen(false);
          }
        }}
        title="Switch dashboard"
        description="Your identity and school stay the same. Permissions follow the active working role."
        size="sm"
        mobileFullScreen
      >
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] px-4 py-3">
          <p className="truncate text-sm font-black text-[#071D49]">{roleState.userLabel}</p>
          <p className="mt-1 text-xs font-semibold text-[#64748B]">
            One authenticated account | {roleState.availableRoles.length} available dashboards
          </p>
        </div>

        <div
          role="radiogroup"
          aria-label="Available dashboards"
          className="mt-4 space-y-2"
        >
          {roleState.availableRoles.map((option) => {
            const active = option.authorizationRoleCode.trim().toLowerCase()
              === roleState.activeAuthorizationRoleCode.trim().toLowerCase();
            const switching = option.authorizationRoleCode.trim().toLowerCase()
              === roleState.switchingToAuthorizationRoleCode?.trim().toLowerCase();
            const hasRouteAliasCollision = roleState.availableRoles.filter(
              (candidate) => candidate.roleCode === option.roleCode,
            ).length > 1;
            const Icon = option.isTeacherMode ? GraduationCap : ShieldCheck;

            return (
              <button
                key={`${option.roleCode}:${option.authorizationRoleCode}`}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={roleState.isSwitching}
                onClick={() => {
                  void roleState.switchDashboardRole(option.authorizationRoleCode)
                    .then(() => setOpen(false))
                    .catch(() => undefined);
                }}
                className={`flex min-h-14 w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#2563EB]/35 focus:ring-offset-1 disabled:cursor-default disabled:opacity-100 ${
                  active
                    ? "border-[#2563EB] bg-[#EFF6FF]"
                    : "border-[#D8E0EC] bg-white hover:border-[#93B4E8] hover:bg-[#F8FAFC]"
                }`}
              >
                <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg ${active ? "bg-[#2563EB] text-white" : "bg-[#EAF0F8] text-[#1D4ED8]"}`}>
                  {switching ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-[#071D49]">{option.roleName}</span>
                    {option.isPrimary ? (
                      <span className="rounded-full bg-[#E2E8F0] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#475569]">
                        Primary
                      </span>
                    ) : null}
                    {hasRouteAliasCollision ? (
                      <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] text-[#475569]">
                        {option.authorizationRoleCode.replace(/[_-]+/g, " ")}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs font-semibold leading-5 text-[#64748B]">
                    {optionDescription(option)}
                  </span>
                </span>
                {active ? <Check className="mt-1 h-4 w-4 shrink-0 text-[#1D4ED8]" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>

        {roleState.error ? (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
          >
            <p>{roleState.error}</p>
            <Button
              variant="secondary"
              size="sm"
              disabled={roleState.isLoading || roleState.isSwitching}
              onClick={() => {
                void roleState.reloadDashboardRoles().catch(() => undefined);
              }}
              className="mt-3"
            >
              {roleState.isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
              Retry role access
            </Button>
          </div>
        ) : null}

        <p className="sr-only" aria-live="polite">
          {roleState.switchingToAuthorizationRoleCode
            ? `Switching to ${roleState.availableRoles.find((option) => (
                option.authorizationRoleCode.trim().toLowerCase()
                === roleState.switchingToAuthorizationRoleCode?.trim().toLowerCase()
              ))?.roleName ?? "dashboard"}.`
            : ""}
        </p>
      </Modal>
    </>
  );
}
