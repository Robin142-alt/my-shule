/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PlatformSmsSettingsWorkspace() {
  const [activeTab, setActiveTab] = useState("sms");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-sms-settings"],
    queryFn: async () => {
      const res = await fetch("/api/platform/sms-settings");
      if (!res.ok) throw new Error("Failed to load SMS settings");
      return res.json();
    }
  });

  const providers = data?.providers || [];
  const metrics = data?.metrics || { activeSms: 0, activeEmail: 0, messagesSent: 0, failedDeliveries: 0 };

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
        <div className="flex gap-2 border-b">
          <button className={`px-4 py-2 border-b-2 ${activeTab === "sms" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("sms")}>SMS Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "email" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("email")}>Email Providers</button>
          <button className={`px-4 py-2 border-b-2 ${activeTab === "logs" ? "border-primary font-semibold" : "border-transparent text-muted-foreground"}`} onClick={() => setActiveTab("logs")}>Delivery Logs</button>
        </div>
        
        {activeTab === "sms" && (
          <div className="pt-4 space-y-4">
            <div className="flex justify-end">
              <Button>Add SMS Provider</Button>
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
                    providers.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3">{p.provider || p.name || "Default Provider"}</td>
                        <td className="px-4 py-3 font-medium">{p.senderId || p.sender_id || "N/A"}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {p.status || "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{p.balance || p.estimated_balance || "N/A"}</td>
                        <td className="px-4 py-3"><Button variant="ghost" size="sm">Edit</Button></td>
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
    </div>
  );
}
