/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SuperadminPageHeader } from "@/components/platform/superadmin-pages";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createPlatformSecurityPolicy } from "@/lib/platform/school-onboarding-client";

export function SecurityPoliciesWorkspace() {
  const [activeTab, setActiveTab] = useState("mfa");
  const [require12Chars, setRequire12Chars] = useState(true);
  const [requireSpecialChars, setRequireSpecialChars] = useState(true);
  const [force90DayReset, setForce90DayReset] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-security-policies"],
    queryFn: async () => {
      const res = await fetch("/api/platform/security-policies");
      if (!res.ok) throw new Error("Failed to load security policies");
      return res.json();
    }
  });

  useEffect(() => {
    if (data?.policies) {
      setRequire12Chars(!!data.policies.require12Chars);
      setRequireSpecialChars(!!data.policies.requireSpecialChars);
      setForce90DayReset(!!data.policies.force90DayReset);
    }
  }, [data]);

  async function handleSavePolicies() {
    setIsSaving(true);
    try {
      await createPlatformSecurityPolicy({
        require12Chars,
        requireSpecialChars,
        force90DayReset
      });
      toast.success("Security policies saved successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to save security policies");
    } finally {
      setIsSaving(false);
    }
  }

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
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={require12Chars}
                      onChange={(e) => setRequire12Chars(e.target.checked)}
                      disabled={isSaving}
                    />
                    Require 12+ characters
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={requireSpecialChars}
                      onChange={(e) => setRequireSpecialChars(e.target.checked)}
                      disabled={isSaving}
                    />
                    Require special characters
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={force90DayReset}
                      onChange={(e) => setForce90DayReset(e.target.checked)}
                      disabled={isSaving}
                    />
                    Force 90-day reset for Staff
                  </label>
                  <Button onClick={handleSavePolicies} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Policies"}
                  </Button>
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
                        <td className="px-4 py-3 font-medium">{u.user || u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            {u.mfaStatus || "Enabled"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{u.lastLogin || u.last_login || "N/A"}</td>
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
