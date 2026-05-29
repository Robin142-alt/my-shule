import { headers } from "next/headers";

import { AuthShell } from "@/components/auth/auth-shell";
import { SchoolLoginView } from "@/components/auth/school-login-view";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";

export default async function InternalSchoolLoginPage() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const resolution = resolveSchoolBranding(host);

  return (
    <AuthShell
      eyebrow="School staff login"
      heroTitle="Run your school with operational clarity."
      heroDescription="Visibility across departments. Every payment accountable. Every incident traceable. Every student monitored responsibly."
      badge={`${resolution.branding.county} school ERP`}
      logoMark={resolution.branding.logoMark}
      helper="Staff sign-in stays school-aware, module-aware, branded, and protected by role-safe approvals and reporting records."
      highlights={[
        {
          id: "collections",
          title: "Collections under control",
          description:
            "Fee collection, payment matching, receipts, and finance approvals stay visible without exposing other schools.",
        },
        {
          id: "academics",
          title: "Academics with oversight",
          description:
            "Performance, lesson coverage, exam releases, and class operations are governed by assigned permissions.",
        },
        {
          id: "school-security",
          title: "School-protected access",
          description:
            "Each school only enters its own branded operations desk and school data.",
        },
      ]}
      trustNotes={[
        { id: "school", label: "School protected", icon: "shield" },
        { id: "branding", label: "School branded", icon: "check" },
        { id: "secure", label: "Secure session", icon: "lock" },
      ]}
    >
      <SchoolLoginView resolution={resolution} />
    </AuthShell>
  );
}
