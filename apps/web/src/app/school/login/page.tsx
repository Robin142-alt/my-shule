import { headers } from "next/headers";
import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { SchoolLoginView } from "@/components/auth/school-login-view";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "School Login",
  description:
    "My Shule school login for principals, bursars, teachers, and staff to manage M-PESA fees, SMS reminders, academics, discipline, clinic, inventory, library, and reports.",
  alternates: {
    canonical: "/school/login",
  },
  openGraph: {
    title: "School Login | My Shule",
    description:
      "Open the school dashboard for fees, M-PESA reconciliation, SMS fee reminders, academics, discipline, clinic, and principal insights.",
    url: absoluteUrl("/school/login"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function SchoolLoginPage() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");
  const resolution = resolveSchoolBranding(host);

  return (
    <AuthShell
      eyebrow="School staff login"
      heroTitle="Run your school with operational clarity."
      heroDescription="Visibility across departments. Every payment accountable. Every incident traceable. Every student monitored responsibly."
      badge={`${resolution.branding.county} school ERP`}
      logoMark={resolution.branding.logoMark}
      helper="Staff sign-in opens a tenant-isolated command surface where modules, workflows, approvals, reports, and alerts appear only when the school has enabled them."
      highlights={[
        {
          id: "visibility",
          title: "Visibility across departments",
          description: "Leadership sees fee, academic, attendance, discipline, clinic, transport, and inventory signals in one controlled operating system.",
        },
        {
          id: "accountability",
          title: "Every action accountable",
          description: "Approvals, releases, write-offs, overrides, and sensitive updates are guarded by role policy and audit evidence.",
        },
        {
          id: "tenant-security",
          title: "One school, one tenant",
          description: "Each school enters its own workspace, branding, modules, workflows, analytics, and role-safe permissions.",
        },
      ]}
      trustNotes={[
        { id: "tenant", label: "Tenant protected", icon: "shield" },
        { id: "branding", label: "School branded", icon: "check" },
        { id: "secure", label: "Secure session", icon: "lock" },
      ]}
    >
      <SchoolLoginView resolution={resolution} />
    </AuthShell>
  );
}
