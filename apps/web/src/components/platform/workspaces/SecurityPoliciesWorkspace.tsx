/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";

export function SecurityPoliciesWorkspace() {
  const [activeTab, setActiveTab] = useState("mfa");

  const { data, isLoading } = useQuery({
    queryKey: ["platform-security-policies"],
    queryFn: async () => {
      const res = await fetch("/api/platform/security-policies");
      if (!res.ok) throw new Error("Failed to load security policies");
      return res.json();
    }
  });

  const mfaUsers = data?.mfaUsers || [];
  const policies = data?.policies || {
    require12Chars: true,
    requireSpecialChars: true,
    force90DayReset: false
  };

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
        
        {activeTab === "login" && (
          <div className="pt-4 space-y-4">
            <div className="p-4 border rounded-xl bg-muted/50 space-y-4">
              <h3 className="font-semibold text-lg">Password Policies</h3>
              {isLoading ? (
                <div className="py-4 text-muted-foreground">Loading policies...</div>
              ) : (
                <>
                  <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={policies.require12Chars} /> Require 12+ characters</label>
                  <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={policies.requireSpecialChars} /> Require special characters</label>
                  <label className="flex items-center gap-2"><input type="checkbox" defaultChecked={policies.force90DayReset} /> Force 90-day reset for Staff</label>
                  <Button>Save Policies</Button>
                </>
              )}
            </div>
          </div>
        )}
        
        {activeTab === "mfa" && (
          <div className="pt-4 space-y-4">
            <div className="flex justify-end">
              <Button>Enforce MFA Globally</Button>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Platform Admin</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">MFA Status</th>
                    <th className="px-4 py-3 font-semibold">Last Login</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {isLoading ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Loading MFA status...</td></tr>
                  ) : mfaUsers.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No platform admins found.</td></tr>
                  ) : (
                    mfaUsers.map((u: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{u.user}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3"><span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{u.mfaStatus}</span></td>
                        <td className="px-4 py-3 text-muted-foreground">{u.lastLogin}</td>
                        <td className="px-4 py-3"><Button variant="ghost" size="sm">Reset MFA</Button></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(activeTab === "sessions" || activeTab === "support") && (
          <div className="pt-8 text-center text-muted-foreground">
            {activeTab === "sessions" ? "No active sessions." : "No support access requests."}
          </div>
        )}
      </div>
    </div>
  );
}
