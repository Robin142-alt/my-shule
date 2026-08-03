import { AuthShell } from "@/components/auth/auth-shell";
import { SuperadminLoginView } from "@/components/auth/superadmin-login-view";

export default function SuperadminLoginPage() {
  return (
    <AuthShell
      eyebrow="Super admin login"
      heroTitle="Operate the platform with confidence."
      heroDescription="Monitor school health, subscriptions, MPESA reliability, and infrastructure from one premium control center designed for platform owners and support teams."
      badge="My Shule Platform Control"
      helper="Platform-wide actions are audit logged, role protected, and separated from school data access."
      highlights={[
        {
          id: "tenant-visibility",
          title: "School-wide visibility",
          description: "Open schools, subscriptions, and support signals without losing platform-level context.",
        },
        {
          id: "secure-recovery",
          title: "Secure recovery",
          description: "Verified email, managed sessions, and audit trails keep high-privilege access accountable.",
        },
        {
          id: "ops-ready",
          title: "Operations ready",
          description: "Designed for the people who keep the SaaS business healthy every day.",
        },
      ]}
      trustNotes={[
        { id: "verified-email", label: "Email verified", icon: "shield" },
        { id: "audit", label: "Audit logged", icon: "check" },
        { id: "session", label: "Session managed", icon: "lock" },
      ]}
    >
      <SuperadminLoginView />
    </AuthShell>
  );
}
