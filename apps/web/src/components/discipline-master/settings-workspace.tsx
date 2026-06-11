"use client";

import { Settings } from "lucide-react";
import { Panel } from "./shared";

export function SettingsWorkspace() {
  return (
    <Panel title="Settings" description="Configure global discipline module preferences." icon={Settings}>
      <form className="max-w-2xl space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase text-[#071D49] border-b border-[#D8E0EC] pb-2">Notifications</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#071D49]">Email Alerts for Critical Incidents</p>
              <p className="text-xs text-[#64748B]">Receive an email immediately when a critical severity incident is logged.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <div className="peer h-6 w-11 rounded-full bg-[#D8E0EC] after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#071D49] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#071D49]">SMS Alerts for Pending Approvals</p>
              <p className="text-xs text-[#64748B]">Notify Deputy Principal via SMS for serious cases requiring approval.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" />
              <div className="peer h-6 w-11 rounded-full bg-[#D8E0EC] after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#071D49] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-[#D8E0EC]">
          <h3 className="text-sm font-black uppercase text-[#071D49] border-b border-[#D8E0EC] pb-2">Automation Rules</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#071D49]">Auto-Escalate Repeat Offenders</p>
              <p className="text-xs text-[#64748B]">Automatically flag a student if they have more than 3 offenses in a month.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" defaultChecked />
              <div className="peer h-6 w-11 rounded-full bg-[#D8E0EC] after:absolute after:left-[2px] after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#071D49] peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
            </label>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <button type="submit" className="rounded-xl bg-[#071D49] px-6 py-2.5 text-sm font-black text-white hover:bg-[#0A2661]">
            Save Preferences
          </button>
        </div>
      </form>
    </Panel>
  );
}
