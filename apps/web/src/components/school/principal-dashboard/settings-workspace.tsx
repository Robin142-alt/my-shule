"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, Bell, Lock, Monitor, Paintbrush } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";

type PrincipalPreferences = {
  notifications: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    dailyDigest: boolean;
  };
  dashboard: {
    theme: "system" | "dark" | "light";
    defaultView: "overview" | "academics" | "attendance" | "fees";
  };
};

type PrincipalSettingsData = {
  status: "active" | "degraded" | "setup_required";
  updatedAt: string | null;
  notifications: PrincipalPreferences["notifications"];
  dashboard: PrincipalPreferences["dashboard"] & {
    showTeachingWorkspace: boolean;
  };
  security: {
    twoFactorAuth: boolean;
    lastPasswordChange: string | null;
  };
};

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="relative inline-flex min-h-11 shrink-0 cursor-pointer items-center">
      <span className="sr-only">{label}</span>
      <input
        aria-label={label}
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="relative h-6 w-11 rounded-full bg-white/10 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
    </label>
  );
}

export function PrincipalSettingsWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalSettingsData>("/admin-command/principal/settings");
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const [preferences, setPreferences] = useState<PrincipalPreferences | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPreferences({
      notifications: { ...data.notifications },
      dashboard: {
        theme: data.dashboard.theme,
        defaultView: data.dashboard.defaultView,
      },
    });
  }, [data]);

  const savePreferences = async (next: PrincipalPreferences, action: string) => {
    const previous = preferences;
    setPreferences(next);
    setActionBusy(action);
    try {
      await requestPrincipalApi("/admin-command/principal/settings/preferences", {
        method: "PATCH",
        body: next,
      });
      await refetch();
      toast.success("Principal preferences saved.");
    } catch (saveError) {
      setPreferences(previous);
      toast.error(saveError instanceof Error ? saveError.message : "Principal preferences could not be saved.");
    } finally {
      setActionBusy(null);
    }
  };

  const updateNotifications = (patch: Partial<PrincipalPreferences["notifications"]>, action: string) => {
    if (!preferences) return;
    void savePreferences({
      ...preferences,
      notifications: { ...preferences.notifications, ...patch },
    }, action);
  };

  const updateDashboard = (patch: Partial<PrincipalPreferences["dashboard"]>, action: string) => {
    if (!preferences) return;
    void savePreferences({
      ...preferences,
      dashboard: { ...preferences.dashboard, ...patch },
    }, action);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !data || !preferences) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Settings</h2>
          <Button type="button" size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      </Card>
    );
  }

  const settingsBusy = actionBusy !== null;
  const passwordChange = data.security.lastPasswordChange
    ? new Date(data.security.lastPasswordChange).toLocaleDateString()
    : "No password-change timestamp recorded";

  return (
    <section aria-label="Principal settings workspace" className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white sm:text-2xl">Principal Settings</h2>
        <p className="mt-1 text-sm text-white/60">Per-user preferences and verified account security for this school membership.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="app-workspace-panel border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <Monitor className="h-5 w-5 shrink-0 text-cyan-400" />
            <h3 className="text-base font-semibold text-white sm:text-xl">Dashboard Preferences</h3>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-white">Teaching workspace access</p>
                <p className="text-xs text-white/60">Derived from active class and subject assignments; it cannot be self-enabled.</p>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${data.dashboard.showTeachingWorkspace ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/60"}`}>
                {data.dashboard.showTeachingWorkspace ? "Assigned" : "Not assigned"}
              </span>
            </div>

            <label className="block space-y-2 text-sm font-semibold text-white">
              <span className="flex items-center gap-2"><Paintbrush className="h-4 w-4 text-cyan-300" /> Theme preference</span>
              <select
                aria-label="Theme preference"
                value={preferences.dashboard.theme}
                disabled={settingsBusy}
                onChange={(event) => updateDashboard({ theme: event.target.value as PrincipalPreferences["dashboard"]["theme"] }, "theme")}
                className="w-full rounded border border-white/15 bg-slate-950 p-2 text-sm text-white"
              >
                <option value="system">Use device setting</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <label className="block space-y-2 text-sm font-semibold text-white">
              Default Principal view
              <select
                aria-label="Default Principal view"
                value={preferences.dashboard.defaultView}
                disabled={settingsBusy}
                onChange={(event) => updateDashboard({ defaultView: event.target.value as PrincipalPreferences["dashboard"]["defaultView"] }, "default-view")}
                className="w-full rounded border border-white/15 bg-slate-950 p-2 text-sm text-white"
              >
                <option value="overview">Overview</option>
                <option value="academics">Teacher allocations</option>
                <option value="attendance">Attendance</option>
                <option value="fees">Fees</option>
              </select>
            </label>
          </div>
        </Card>

        <Card className="app-workspace-panel border border-white/10 bg-white/5 p-6">
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <Bell className="h-5 w-5 shrink-0 text-emerald-400" />
            <h3 className="text-base font-semibold text-white sm:text-xl">Notifications</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div><p className="font-bold text-white">Email alerts</p><p className="text-xs text-white/60">Receive important school updates by email.</p></div>
              <Toggle label="Email alerts" checked={preferences.notifications.emailAlerts} disabled={settingsBusy} onChange={(checked) => updateNotifications({ emailAlerts: checked }, "email-alerts")} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div><p className="font-bold text-white">SMS alerts</p><p className="text-xs text-white/60">Allow urgent account notifications by SMS.</p></div>
              <Toggle label="SMS alerts" checked={preferences.notifications.smsAlerts} disabled={settingsBusy} onChange={(checked) => updateNotifications({ smsAlerts: checked }, "sms-alerts")} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div><p className="font-bold text-white">Daily digest</p><p className="text-xs text-white/60">Receive a daily summary of school activity.</p></div>
              <Toggle label="Daily digest" checked={preferences.notifications.dailyDigest} disabled={settingsBusy} onChange={(checked) => updateNotifications({ dailyDigest: checked }, "daily-digest")} />
            </div>
          </div>
        </Card>

        <Card className="app-workspace-panel border border-white/10 bg-white/5 p-6 md:col-span-2">
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <Lock className="h-5 w-5 shrink-0 text-purple-400" />
            <h3 className="text-base font-semibold text-white sm:text-xl">Security</h3>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-white">Multi-factor authentication</p>
                <p className="text-xs text-white/60">Principal access is governed by the privileged-role MFA policy.</p>
              </div>
              <span className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${data.security.twoFactorAuth ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-200"}`}>
                {data.security.twoFactorAuth ? "Enabled" : "Setup required"}
              </span>
            </div>

            <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-bold text-white">Password</p>
                <p className="text-xs text-white/60">Last changed: {passwordChange}</p>
              </div>
              <Link
                className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                href="/school/forgot-password"
              >
                Open secure reset
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
