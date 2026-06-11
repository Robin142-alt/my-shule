import { Settings } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherSettings } from "@/lib/data/class-teacher-hooks";

export function SettingsWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherSettings(streamId);

  if (isLoading) {
    return (
      <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load settings.</div>
      </Panel>
    );
  }

  return (
    <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
      <div className="space-y-6">
        <section className="rounded-xl border border-[#D8E0EC] bg-white p-6">
          <h3 className="font-bold text-[#071D49] mb-4">Workspace Preferences</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#071D49]">Enable Notifications</span>
              <input type="checkbox" checked={data.notificationsEnabled} readOnly className="h-4 w-4 rounded text-[#1D4ED8]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#071D49]">Default View</span>
              <select className="rounded-md border border-[#D8E0EC] px-3 py-1 text-sm text-[#071D49]" value={data.defaultView} disabled>
                <option>Overview</option>
                <option>My Class Register</option>
                <option>Timetable</option>
              </select>
            </label>
          </div>
          <div className="mt-6 flex justify-end">
            <button className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white">Save Changes</button>
          </div>
        </section>
      </div>
    </Panel>
  );
}
