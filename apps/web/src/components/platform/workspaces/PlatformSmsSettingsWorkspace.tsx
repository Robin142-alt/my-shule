/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";

export function PlatformSmsSettingsWorkspace() {
  const [activeTab, setActiveTab] = useState("sms");
  const [isSmsOpen, setIsSmsOpen] = useState(false);

  const smsColumns: DataTableColumn<any>[] = [
    { id: "provider", header: "Provider Name", render: (row) => "Africa's Talking" },
    { id: "senderId", header: "Sender ID", render: (row) => "MYSHULE" },
    { id: "status", header: "Status", render: (row) => "Active" },
    { id: "balance", header: "Estimated Balance", render: (row) => "KES 4,500" },
    { id: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm">Edit</Button> }
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Platform SMS & Email Providers" 
        description="Configure global messaging gateways and monitor delivery health." 
      />
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><div className="text-sm font-medium text-muted">Active SMS Gateways</div><div className="mt-2 text-2xl font-bold">1</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Active Email Gateways</div><div className="mt-2 text-2xl font-bold">1</div></Card>
        <Card className="p-4"><div className="text-sm font-medium text-muted">Messages Sent (Today)</div><div className="mt-2 text-2xl font-bold">1,204</div></Card>
        <Card className="p-4 border-red-500 bg-red-50/50"><div className="text-sm font-medium text-red-600">Failed Deliveries</div><div className="mt-2 text-2xl font-bold text-red-700">12</div></Card>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <button className={`px-4 py-2 border-b-2 ${activeTab === "sms" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("sms")}>SMS Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "email" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("email")}>Email Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "logs" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("logs")}>Delivery Logs</button>
        </div>
        {activeTab === "sms" && <div className="pt-4 space-y-4">
          <div className="flex justify-end"><Button onClick={() => setIsSmsOpen(true)}>Add SMS Provider</Button></div>
          <DataTable title="SMS Gateways" subtitle="Configured providers." columns={smsColumns} rows={[{id: "1"}]} getRowKey={(row) => row.id} />
        </div>}
        {activeTab === "email" && <div className="pt-4 space-y-4">
          <div className="flex justify-end"><Button>Add Email Provider</Button></div>
          <DataTable title="Email Gateways" subtitle="Configured SMTP services." columns={smsColumns} rows={[] as any[]} getRowKey={(row) => row.id} emptyMessage="No email providers configured." />
        </div>}
        {activeTab === "logs" && <div className="pt-4">
          <DataTable title="Recent Deliveries" subtitle="System-wide message logs." columns={[]} rows={[] as any[]} getRowKey={(row) => row.id} emptyMessage="No logs available." />
        </div>}
      </div>
      
      <Modal open={isSmsOpen} title="Add SMS Provider" onClose={() => setIsSmsOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); setIsSmsOpen(false); }}>
          <label className="block space-y-1"><span className="text-sm font-semibold">Provider Name</span><input className="input-base w-full" placeholder="e.g. Africa's Talking" required /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">API Base URL</span><input className="input-base w-full" required /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">API Key</span><input type="password" className="input-base w-full" required /></label>
          <label className="block space-y-1"><span className="text-sm font-semibold">Sender ID</span><input className="input-base w-full" required /></label>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsSmsOpen(false)} type="button">Cancel</Button>
            <Button type="submit">Save Provider</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
