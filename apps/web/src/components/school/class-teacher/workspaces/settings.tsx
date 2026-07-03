import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Panel } from "../shared";
import { useClassTeacherSettings, useResolvedClassTeacherStreamId, useSaveClassTeacherSettings } from "@/lib/data/class-teacher-hooks";

export function SettingsWorkspace() {
  const { streamId } = useResolvedClassTeacherStreamId();
  const { data, isLoading, error } = useClassTeacherSettings(streamId);
  const saveClassTeacherSettings = useSaveClassTeacherSettings(streamId);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [defaultView, setDefaultView] = useState("Overview");

  useEffect(() => {
    const safeData = data as any;
    if (!safeData) return;
    setNotificationsEnabled(Boolean(safeData.notificationsEnabled ?? true));
    setDefaultView(String(safeData.defaultView || "Overview"));
  }, [data]);

  async function handleSaveClassTeacherSettings() {
    try {
      await saveClassTeacherSettings.mutateAsync({
        notificationsEnabled,
        defaultView,
      });
      toast.success("Class-teacher settings saved.");
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Class-teacher settings could not be saved.");
    }
  }

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

  const safeData = data as any;
  return (
    <Panel title="Settings" description="Manage your preferences and workspace settings." icon={Settings}>
      <div className="space-y-6">
        <section className="rounded-xl border border-[#D8E0EC] bg-white p-6">
          <h3 className="font-bold text-[#071D49] mb-4">Workspace Preferences</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#071D49]">Enable Notifications</span>
              <input type="checkbox" checked={notificationsEnabled} onChange={(event) => setNotificationsEnabled(event.currentTarget.checked)} className="h-4 w-4 rounded text-[#1D4ED8]" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm font-semibold text-[#071D49]">Default View</span>
              <select className="rounded-md border border-[#D8E0EC] px-3 py-1 text-sm text-[#071D49]" value={defaultView} onChange={(event) => setDefaultView(event.currentTarget.value)}>
                <option value="Overview">Overview</option>
                <option value="My Class Register">My Class Register</option>
                <option value="Timetable">Timetable</option>
              </select>
            </label>
          </div>
          {safeData.updatedAt ? <p className="mt-4 text-xs font-semibold text-[#64748B]">Last saved {new Date(safeData.updatedAt).toLocaleString("en-KE")}.</p> : null}
          <div className="mt-6 flex justify-end">
            <button type="button" disabled={saveClassTeacherSettings.isPending} className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-sm font-black text-white disabled:opacity-60" onClick={handleSaveClassTeacherSettings}>
              {saveClassTeacherSettings.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </Panel>
  );
}
