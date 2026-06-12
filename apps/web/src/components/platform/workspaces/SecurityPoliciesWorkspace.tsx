/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";

export function SecurityPoliciesWorkspace() {
  const [activeTab, setActiveTab] = useState("mfa");

  const mfaColumns: DataTableColumn<any>[] = [
    { id: "user", header: "Platform Admin", render: (row) => "System Root" },
    { id: "email", header: "Email", render: (row) => "admin@myshule.com" },
    { id: "mfaStatus", header: "MFA Status", render: (row) => "Enabled (App)" },
    { id: "lastLogin", header: "Last Login", render: (row) => "Just now" },
    { id: "actions", header: "Actions", render: (row) => <Button variant="ghost" size="sm">Reset MFA</Button> }
  ];

  return (
    <div className="space-y-6">
      <SuperadminPageHeader 
        title="Security & Access Policies" 
        description="Enforce global login rules, manage MFA for platform admins, and track active sessions." 
      />
      <div className="space-y-4">
        <div className="flex gap-2 border-b">
          <button className={`px-4 py-2 border-b-2 ${activeTab === "login" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("login")}>Login Security</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "mfa" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("mfa")}>MFA Status</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "sessions" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("sessions")}>Active Sessions</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "support" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("support")}>Support Access</button>
        </div>
        {activeTab === "login" && <div className="pt-4 space-y-4">
          <div className="p-4 border rounded-xl bg-muted/50 space-y-4">
            <h3 className="font-semibold text-lg">Password Policies</h3>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Require 12+ characters</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Require special characters</label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Force 90-day reset for Staff</label>
            <Button>Save Policies</Button>
          </div>
        </div>}
        {activeTab === "mfa" && <div className="pt-4">
          <DataTable title="Super Admin MFA" subtitle="Ensure all platform operators are secured." columns={mfaColumns} rows={[{id: "1"}]} getRowKey={(row) => row.id} />
        </div>}
        {activeTab === "sessions" && <div className="pt-4">
          <DataTable title="Active Platform Sessions" subtitle="Currently logged in Super Admins." columns={[]} rows={[] as any[]} getRowKey={(row) => row.id} emptyMessage="No other active sessions." />
        </div>}
        {activeTab === "support" && <div className="pt-4">
          <div className="p-4 rounded-xl border border-border">
            <h3 className="font-semibold mb-2">Support Access Grants</h3>
            <p className="text-sm text-muted-foreground">When a school grants Support Access, the authorization appears here.</p>
          </div>
        </div>}
      </div>
    </div>
  );
}
