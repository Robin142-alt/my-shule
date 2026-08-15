"use client";
import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Panel } from "./shared";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";

export function DeputySettingsWorkspace() {
  const tenantId = useOptionalSchoolTenantId();
  const roleState = useOptionalSchoolDashboardRole();
  const settingsKey = tenantId && roleState?.userId
    ? `myshule:${tenantId}:${roleState.userId}:${roleState.activeAuthorizationRoleCode}:deputy-settings`
    : null;
  const [teachingEnabled, setTeachingEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (!settingsKey) return;

    try {
      const saved = localStorage.getItem(settingsKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        const nextTeachingEnabled = parsed.teachingEnabled ?? true;
        setTeachingEnabled(nextTeachingEnabled);
        setNotificationsEnabled(parsed.notificationsEnabled ?? true);
        window.dispatchEvent(new CustomEvent("myshule:deputy-teaching-toggle", {
          detail: { enabled: nextTeachingEnabled },
        }));
      }
    } catch {
      localStorage.removeItem(settingsKey);
    }
  }, [settingsKey]);

  const handleToggleTeaching = () => {
    const newVal = !teachingEnabled;
    setTeachingEnabled(newVal);
    saveSettings(newVal, notificationsEnabled);
    // Dispatch a global event so the sidebar can re-render
    window.dispatchEvent(new CustomEvent("myshule:deputy-teaching-toggle", { detail: { enabled: newVal } }));
  };

  const handleToggleNotifications = () => {
    const newVal = !notificationsEnabled;
    setNotificationsEnabled(newVal);
    saveSettings(teachingEnabled, newVal);
  };

  const saveSettings = (teaching: boolean, notifs: boolean) => {
    if (!settingsKey) return;
    localStorage.setItem(settingsKey, JSON.stringify({
      teachingEnabled: teaching,
      notificationsEnabled: notifs
    }));
  };

  return (
    <Panel title="Dashboard Settings" description="Personalize your dashboard preferences." icon={Settings}>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-white p-6">
          <h3 className="text-lg font-bold text-[#071D49] mb-4">Workspace Preferences</h3>
          
          <div className="flex items-center justify-between py-3 border-b border-[#D8E0EC]">
            <div>
              <div className="font-semibold text-[#071D49]">Show Teaching Workspace</div>
              <div className="text-sm text-[#64748B]">Enable this if you have classes assigned to you.</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={teachingEnabled} onChange={handleToggleTeaching} />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="font-semibold text-[#071D49]">Receive Immediate Notifications</div>
              <div className="text-sm text-[#64748B]">Get alerts for discipline, attendance, and welfare cases.</div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={notificationsEnabled} onChange={handleToggleNotifications} />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
          
        </div>
      </div>
    </Panel>
  );
}
