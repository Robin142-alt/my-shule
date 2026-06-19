/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updatePlatformSettings, fetchPlatformSettings } from "@/lib/platform/school-onboarding-client";
import { toast } from "sonner";

export function SettingsWorkspace() {
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadData() {
    setIsLoading(true);
    try {
      const data = await fetchPlatformSettings();
      setSettings(data || {});
      setMaintenanceMode(data?.maintenanceMode || false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    setIsSaving(true);
    try {
      const updated = {
        ...settings,
        platformName: formData.get("platformName") || settings?.platformName,
        supportEmail: formData.get("supportEmail") || settings?.supportEmail,
        defaultAcademicYear: formData.get("defaultAcademicYear") || settings?.defaultAcademicYear,
        defaultCountry: formData.get("defaultCountry") || settings?.defaultCountry,
        maintenanceMode,
      };
      await updatePlatformSettings(updated);
      setSettings(updated);
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMaintenanceToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.checked;
    if (val) {
      const conf = prompt("Type ENABLE MAINTENANCE to confirm");
      if (conf !== "ENABLE MAINTENANCE") return;
    } else {
      const conf = prompt("Type DISABLE MAINTENANCE to confirm");
      if (conf !== "DISABLE MAINTENANCE") return;
    }

    setMaintenanceMode(val);
    setIsSaving(true);
    try {
      const updated = {
        ...settings,
        maintenanceMode: val,
      };
      await updatePlatformSettings(updated);
      setSettings(updated);
      toast.success(val ? "Maintenance mode enabled" : "Maintenance mode disabled");
    } catch (error: any) {
      toast.error(error.message || "Failed to update maintenance settings");
      setMaintenanceMode(!val);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SuperadminPageHeader title="Platform Settings" description="Global platform rules and configurations." />
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Platform Identity</h3>
          {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block space-y-1"><span className="text-sm font-semibold">Platform Name</span><input name="platformName" className="input-base w-full" defaultValue={settings?.platformName || "MyShule"} /></label>
              <label className="block space-y-1"><span className="text-sm font-semibold">Support Email</span><input name="supportEmail" className="input-base w-full" defaultValue={settings?.supportEmail || "support@myshule.com"} /></label>
              <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Identity"}</Button>
            </form>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Default School Settings</h3>
          {isLoading ? <p className="text-sm text-gray-500">Loading...</p> : (
            <form onSubmit={handleSave} className="space-y-4">
              <label className="block space-y-1"><span className="text-sm font-semibold">Default Academic Year</span><input name="defaultAcademicYear" className="input-base w-full" defaultValue={settings?.defaultAcademicYear || new Date().getFullYear().toString()} /></label>
              <label className="block space-y-1"><span className="text-sm font-semibold">Default Country</span><select name="defaultCountry" className="input-base w-full" defaultValue={settings?.defaultCountry || "Kenya"}><option>Kenya</option><option>Uganda</option><option>Tanzania</option></select></label>
              <Button type="submit" variant="secondary" disabled={isSaving}>Save Defaults</Button>
            </form>
          )}
        </Card>

        <Card className="p-6 md:col-span-2 border-red-200">
          <h3 className="font-semibold text-lg mb-4 text-red-700">Environment Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded border border-red-100">
              <div>
                <div className="font-semibold text-red-900">Maintenance Mode</div>
                <div className="text-sm text-red-700">Forces all tenants offline except Super Admins.</div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500"
                  checked={maintenanceMode}
                  onChange={handleMaintenanceToggle}
                  disabled={isLoading || isSaving}
                />
                <span className="text-sm font-semibold text-red-950">Active</span>
              </label>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
