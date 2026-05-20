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
      heroTitle={resolution.branding.name}
      heroDescription={`${resolution.branding.heroMessage} Save the school from scattered reports, repeated fee calls, missing payment proof, and slow leadership decisions.`}
      badge={`${resolution.branding.county} school ERP`}
      logoMark={resolution.branding.logoMark}
      helper="Staff sign-in opens the right dashboard for principals, bursars, teachers, and office teams, with role-safe access to the work they repeat every day."
      highlights={[
        {
          id: "collections",
          title: "Collections without chasing",
          description: "Fee balances, M-PESA matches, receipts, and SMS reminders reduce calls and payment confusion.",
        },
        {
          id: "academics",
          title: "Reports before pressure",
          description: "Academics, CBC reports, discipline, clinic, and class follow-ups stay close to leadership.",
        },
        {
          id: "tenant-security",
          title: "One school, one truth",
          description: "Each school enters its own workspace, branding, operational data, and principal insights.",
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
