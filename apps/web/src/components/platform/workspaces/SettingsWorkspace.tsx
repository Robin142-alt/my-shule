import { useState } from "react";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updatePlatformSettings } from "@/lib/platform/school-onboarding-client";

export function SettingsWorkspace() {
  const [isSaving, setIsSaving] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await updatePlatformSettings({
        platformName: formData.get("platformName"),
        supportEmail: formData.get("supportEmail"),
        defaultAcademicYear: formData.get("defaultAcademicYear"),
        defaultCountry: formData.get("defaultCountry"),
        maintenanceMode,
      });
      setSaveMessage("Settings saved.");
    } catch (error) {
      console.error(error);
      setSaveMessage("Settings could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <SuperadminPageHeader title="Platform Settings" description="Global platform rules and configurations." />
      {saveMessage ? <div className="rounded border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{saveMessage}</div> : null}
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Platform Identity</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="block space-y-1"><span className="text-sm font-semibold">Platform Name</span><input name="platformName" className="input-base w-full" defaultValue="MyShule" /></label>
            <label className="block space-y-1"><span className="text-sm font-semibold">Support Email</span><input name="supportEmail" className="input-base w-full" defaultValue="support@myshule.com" /></label>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Identity"}</Button>
          </form>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-4">Default School Settings</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="block space-y-1"><span className="text-sm font-semibold">Default Academic Year</span><input name="defaultAcademicYear" className="input-base w-full" defaultValue="2026" /></label>
            <label className="block space-y-1"><span className="text-sm font-semibold">Default Country</span><select name="defaultCountry" className="input-base w-full"><option>Kenya</option></select></label>
            <Button type="submit" variant="secondary" disabled={isSaving}>Save Defaults</Button>
          </form>
        </Card>

        <Card className="p-6 md:col-span-2 border-red-200">
          <h3 className="font-semibold text-lg mb-4 text-red-700">Environment Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded border border-red-100">
              <div>
                <div className="font-semibold text-red-900">Maintenance Mode</div>
                <div className="text-sm text-red-700">Forces all tenants offline except Super Admins. Requires confirmation.</div>
              </div>
              <Button variant="danger" onClick={() => {
                const conf = prompt("Type ENABLE MAINTENANCE to confirm");
                if (conf === "ENABLE MAINTENANCE") setMaintenanceMode(true);
              }} disabled={maintenanceMode}>
                {maintenanceMode ? "Maintenance Active" : "Enable Maintenance"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
