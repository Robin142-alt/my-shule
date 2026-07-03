import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  createPlatformSmsProvider,
  fetchPlatformSmsProviders,
  setDefaultPlatformSmsProvider,
  testPlatformSmsProvider,
  updatePlatformSmsProvider,
  type PlatformSmsProvider,
  type PlatformSmsProviderCode,
} from "@/lib/platform/school-onboarding-client";

type SmsProviderForm = {
  provider_name: string;
  provider_code: PlatformSmsProviderCode;
  api_key: string;
  username: string;
  sender_id: string;
  base_url: string;
  is_active: boolean;
  is_default: boolean;
};

const emptyProviderForm: SmsProviderForm = {
  provider_name: "TextSMS Kenya",
  provider_code: "textsms_kenya",
  api_key: "",
  username: "",
  sender_id: "MYSHULE",
  base_url: "",
  is_active: true,
  is_default: false,
};

const providerOptions: Array<{ code: PlatformSmsProviderCode; label: string }> = [
  { code: "textsms_kenya", label: "TextSMS Kenya" },
  { code: "africas_talking", label: "Africa's Talking" },
  { code: "twilio", label: "Twilio" },
];

export function PlatformSmsSettingsWorkspace() {
  const [activeTab, setActiveTab] = useState("sms");
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState<SmsProviderForm>(emptyProviderForm);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busyProviderId, setBusyProviderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["platform-sms-settings"],
    queryFn: async () => {
      const [settingsRes, providerRows] = await Promise.all([
        fetch("/api/platform/sms-settings", { credentials: "same-origin", cache: "no-store" }),
        fetchPlatformSmsProviders(),
      ]);
      if (!settingsRes.ok) throw new Error("Failed to load SMS settings");
      const settings = await settingsRes.json();
      return {
        ...settings,
        providers: providerRows,
      };
    }
  });

  const providers: PlatformSmsProvider[] = data?.providers || [];
  const metrics = data?.metrics || { activeSms: 0, activeEmail: 0, messagesSent: 0, failedDeliveries: 0 };

  function openCreateProvider() {
    setEditingProviderId(null);
    setSubmitError(null);
    setProviderForm(emptyProviderForm);
    setIsProviderOpen(true);
  }

  function openEditProvider(provider: PlatformSmsProvider) {
    setEditingProviderId(provider.id);
    setSubmitError(null);
    setProviderForm({
      provider_name: provider.provider_name,
      provider_code: provider.provider_code,
      api_key: "",
      username: "",
      sender_id: provider.sender_id,
      base_url: provider.base_url ?? "",
      is_active: provider.is_active,
      is_default: provider.is_default,
    });
    setIsProviderOpen(true);
  }

  function closeProviderModal() {
    if (isSubmitting) {
      return;
    }

    setIsProviderOpen(false);
    setEditingProviderId(null);
    setSubmitError(null);
    setProviderForm(emptyProviderForm);
  }

  async function saveProvider(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    const payload = {
      ...providerForm,
      api_key: providerForm.api_key.trim(),
      username: providerForm.username.trim(),
      base_url: providerForm.base_url.trim(),
    };

    try {
      if (editingProviderId) {
        const updatePayload = {
          provider_name: payload.provider_name,
          provider_code: payload.provider_code,
          api_key: payload.api_key || undefined,
          username: payload.username,
          sender_id: payload.sender_id,
          base_url: payload.base_url,
          is_active: payload.is_active,
        };
        await updatePlatformSmsProvider(editingProviderId, updatePayload);
        if (providerForm.is_default) {
          await setDefaultPlatformSmsProvider(editingProviderId);
        }
        setStatusMessage("SMS provider updated.");
      } else {
        await createPlatformSmsProvider(payload);
        setStatusMessage("SMS provider created.");
      }
      await refetch();
      setIsProviderOpen(false);
      setEditingProviderId(null);
      setProviderForm(emptyProviderForm);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save SMS provider.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function runProviderTest(provider: PlatformSmsProvider) {
    setBusyProviderId(provider.id);
    setStatusMessage(null);
    try {
      await testPlatformSmsProvider(provider.id);
      setStatusMessage(`${provider.provider_name} test passed.`);
      await refetch();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "SMS provider test failed.");
    } finally {
      setBusyProviderId(null);
    }
  }

  async function makeDefaultProvider(provider: PlatformSmsProvider) {
    setBusyProviderId(provider.id);
    setStatusMessage(null);
    try {
      await setDefaultPlatformSmsProvider(provider.id);
      setStatusMessage(`${provider.provider_name} is now the default SMS provider.`);
      await refetch();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to set default provider.");
    } finally {
      setBusyProviderId(null);
    }
  }

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Platform SMS & Email Providers" 
        description="Configure global messaging gateways and monitor delivery health." 
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Active SMS Gateways</div><div className="mt-2 text-2xl font-bold">{isLoading ? "..." : metrics.activeSms}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Active Email Gateways</div><div className="mt-2 text-2xl font-bold">{isLoading ? "..." : metrics.activeEmail}</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Messages Sent (Today)</div><div className="mt-2 text-2xl font-bold">{isLoading ? "..." : metrics.messagesSent}</div></Card>
        <Card className="p-4 border-red-500 bg-red-50/50"><div className="text-sm font-medium text-red-600">Failed Deliveries</div><div className="mt-2 text-2xl font-bold text-red-700">{isLoading ? "..." : metrics.failedDeliveries}</div></Card>
      </div>

      <div className="space-y-4">
        {statusMessage ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">
            {statusMessage}
          </div>
        ) : null}
        <div className="flex gap-2 border-b">
          <button className={`px-4 py-2 border-b-2 ${activeTab === "sms" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("sms")}>SMS Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "email" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("email")}>Email Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "logs" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("logs")}>Delivery Logs</button>
        </div>
        
        {activeTab === "sms" && (
          <div className="pt-4 space-y-4">
            <div className="flex justify-end">
              <Button onClick={openCreateProvider}>Add SMS Provider</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Provider Name</th>
                    <th className="px-4 py-3 font-semibold">Sender ID</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Estimated Balance</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading providers...</td></tr>
                  ) : providers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No SMS providers configured.</td></tr>
                  ) : (
                    providers.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{p.provider_name}</div>
                          <div className="text-xs text-muted-foreground">{p.provider_code.replaceAll("_", " ")}</div>
                        </td>
                        <td className="px-4 py-3 font-medium">{p.sender_id || "N/A"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {p.is_active ? "Active" : "Inactive"}{p.is_default ? " / Default" : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3">{p.api_key_masked ? `Key ${p.api_key_masked}` : "No key stored"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditProvider(p)}>Edit</Button>
                            <Button variant="ghost" size="sm" onClick={() => runProviderTest(p)} disabled={busyProviderId === p.id}>{busyProviderId === p.id ? "Testing..." : "Test"}</Button>
                            {!p.is_default ? <Button variant="ghost" size="sm" onClick={() => makeDefaultProvider(p)} disabled={busyProviderId === p.id}>Set default</Button> : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {(activeTab === "email" || activeTab === "logs") && (
          <div className="pt-8 text-center text-muted-foreground">
            {activeTab === "email" ? "No email providers configured." : "No recent delivery logs."}
          </div>
        )}
      </div>

      <Modal open={isProviderOpen} title={editingProviderId ? "Edit SMS Provider" : "Add SMS Provider"} onClose={closeProviderModal}>
        <form className="space-y-4" onSubmit={saveProvider}>
          {submitError ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          ) : null}
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Provider name</span>
            <input className="input-base w-full" required value={providerForm.provider_name} onChange={(event) => setProviderForm({ ...providerForm, provider_name: event.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Provider</span>
            <select className="input-base w-full" value={providerForm.provider_code} onChange={(event) => setProviderForm({ ...providerForm, provider_code: event.target.value as PlatformSmsProviderCode })} disabled={!!editingProviderId}>
              {providerOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Sender ID</span>
              <input className="input-base w-full" required minLength={2} maxLength={32} value={providerForm.sender_id} onChange={(event) => setProviderForm({ ...providerForm, sender_id: event.target.value })} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-semibold">Username</span>
              <input className="input-base w-full" value={providerForm.username} onChange={(event) => setProviderForm({ ...providerForm, username: event.target.value })} />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">API key</span>
            <input type="password" className="input-base w-full" required={!editingProviderId} minLength={editingProviderId ? undefined : 8} value={providerForm.api_key} onChange={(event) => setProviderForm({ ...providerForm, api_key: event.target.value })} />
            {editingProviderId ? <span className="text-xs text-muted-foreground">Leave blank to keep the encrypted key already stored for this provider.</span> : null}
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Base URL</span>
            <input className="input-base w-full" value={providerForm.base_url} onChange={(event) => setProviderForm({ ...providerForm, base_url: event.target.value })} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={providerForm.is_active} onChange={(event) => setProviderForm({ ...providerForm, is_active: event.target.checked })} />
              Active provider
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={providerForm.is_default} onChange={(event) => setProviderForm({ ...providerForm, is_default: event.target.checked })} />
              Make default
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" type="button" onClick={closeProviderModal} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : editingProviderId ? "Save Changes" : "Save Provider"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
