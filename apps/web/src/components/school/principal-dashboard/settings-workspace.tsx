"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, Bell, Lock, Monitor } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalSettingsData = {
  status: "active" | "degraded" | "setup_required";
  notifications: {
    emailAlerts: boolean;
    smsAlerts: boolean;
    dailyDigest: boolean;
  };
  dashboard: {
    theme: string;
    showTeachingWorkspace: boolean;
    defaultView: string;
  };
  security: {
    twoFactorAuth: boolean;
    lastPasswordChange: string;
  };
};

export function PrincipalSettingsWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalSettingsData>('/admin-command/principal/settings');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Settings</h2>
        </div>
      </Card>
    );
  }

  // A helper to trigger the custom event for teaching toggle
  const toggleTeaching = (e: React.ChangeEvent<HTMLInputElement>) => {
    const event = new CustomEvent("principal-teaching-toggle", { detail: e.target.checked });
    window.dispatchEvent(event);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <Monitor className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">Dashboard Preferences</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Show Teaching Workspace</p>
                <p className="text-xs text-white/60">Enable if you actively teach classes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  defaultChecked={data.dashboard.showTeachingWorkspace}
                  onChange={toggleTeaching}
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Theme Preference</p>
                <p className="text-xs text-white/60">Current: {data.dashboard.theme}</p>
              </div>
              <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition">
                Change
              </button>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <Bell className="h-6 w-6 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Notifications</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Email Alerts</p>
                <p className="text-xs text-white/60">Receive important updates via email</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={data.notifications.emailAlerts} />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-white">Daily Digest</p>
                <p className="text-xs text-white/60">Receive a daily summary of school activities</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked={data.notifications.dailyDigest} />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 md:col-span-2">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-4">
            <Lock className="h-6 w-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Security</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="font-bold text-white">Two-Factor Authentication</p>
                <p className="text-xs text-white/60">Status: {data.security.twoFactorAuth ? "Enabled" : "Disabled"}</p>
              </div>
              <button className={`px-4 py-2 rounded text-sm font-bold transition ${data.security.twoFactorAuth ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                {data.security.twoFactorAuth ? "Disable" : "Enable"}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
              <div>
                <p className="font-bold text-white">Password</p>
                <p className="text-xs text-white/60">Last changed: {data.security.lastPasswordChange}</p>
              </div>
              <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm font-bold transition">
                Update
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
