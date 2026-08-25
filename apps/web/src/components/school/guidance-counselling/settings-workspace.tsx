"use client";

import { useState } from "react";
import { Settings } from "lucide-react";
import { toast } from "sonner";

import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

import { fieldClassName, Panel, WorkspaceFailure } from "./shared";

type CounsellingSettings = {
  notify_referrer_on_acceptance: boolean;
  require_audit_reason: boolean;
  default_case_visibility: "restricted" | "private" | "team";
};

type SettingsData = {
  settings: CounsellingSettings;
  saved_at: string | null;
  saved_by_user_id: string | null;
};

const defaults: CounsellingSettings = {
  notify_referrer_on_acceptance: true,
  require_audit_reason: true,
  default_case_visibility: "restricted",
};

export function SettingsWorkspace() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const { data, error, isLoading, refetch } = useSchoolQuery<SettingsData>(
    "/admin-command/guidance-counselling/settings",
  );
  const [draft, setDraft] = useState<CounsellingSettings | null>(null);
  const canWrite = hasPermission("counselling:write");
  const settings = draft ?? data?.settings ?? defaults;

  function updateSettings(patch: Partial<CounsellingSettings>) {
    setDraft((current) => ({ ...(current ?? data?.settings ?? defaults), ...patch }));
  }

  const saveSettings = useSchoolMutation<SettingsData, CounsellingSettings>(
    "/admin-command/guidance-counselling/settings",
    "POST",
    {
      onSuccess: async () => {
        toast.success("Counselling privacy settings saved.");
        await refetch();
        setDraft(null);
      },
      onError: (mutationError) => toast.error("Counselling settings were not saved", { description: mutationError.message }),
    },
  );

  return (
    <Panel
      title="Counselling Settings"
      description="Tenant-scoped privacy, audit, and referral notification rules for the school counselling workflow."
      icon={Settings}
    >
      {error ? (
        <WorkspaceFailure title="Counselling settings could not be loaded." error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-6 text-sm text-[#64748B]">Loading counselling settings…</div>
      ) : (
        <div className="max-w-2xl space-y-4">
          <label className="flex items-start gap-3 rounded-xl border border-[#D8E0EC] p-4 text-sm text-[#334155]">
            <input
              type="checkbox"
              checked={settings.notify_referrer_on_acceptance}
              onChange={(event) => updateSettings({ notify_referrer_on_acceptance: event.target.checked })}
              className="mt-1 h-4 w-4"
            />
            <span><strong className="block text-[#071D49]">Notify the referrer when a referral is accepted</strong>Creates a school-scoped workflow notification without exposing private case notes.</span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-[#D8E0EC] p-4 text-sm text-[#334155]">
            <input
              type="checkbox"
              checked={settings.require_audit_reason}
              onChange={(event) => updateSettings({ require_audit_reason: event.target.checked })}
              className="mt-1 h-4 w-4"
            />
            <span><strong className="block text-[#071D49]">Require an audit reason for sensitive actions</strong>Preserves an explicit reason when counsellors flag or escalate records.</span>
          </label>
          <label className="block rounded-xl border border-[#D8E0EC] p-4 text-sm font-bold text-[#334155]">
            Default case visibility
            <select
              aria-label="Default case visibility"
              value={settings.default_case_visibility}
              onChange={(event) => updateSettings({
                default_case_visibility: event.target.value as CounsellingSettings["default_case_visibility"],
              })}
              className={fieldClassName}
            >
              <option value="restricted">Restricted counselling team</option>
              <option value="private">Assigned counsellor only</option>
              <option value="team">Authorised welfare team</option>
            </select>
          </label>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#64748B]">{data?.saved_at ? `Last saved ${data.saved_at}` : "Using secure defaults until this school saves its settings."}</p>
            <button
              type="button"
              disabled={permissionsLoading || !canWrite || saveSettings.isPending}
              onClick={() => saveSettings.mutate(settings)}
              title={!permissionsLoading && !canWrite ? "Counselling write permission is required" : undefined}
              className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveSettings.isPending ? "Saving…" : "Save Settings"}
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
