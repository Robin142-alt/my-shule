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

function readSearchParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];

  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function SchoolLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialEmail = readSearchParam(resolvedSearchParams, "email").trim();
  const initialTenantSlug = readSearchParam(resolvedSearchParams, "tenant").trim() || null;
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
      helper="Staff sign-in opens a secure school dashboard where approvals, reports, and alerts match each person’s role."
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
          id: "school-security",
          title: "One school, one secure system",
          description: "Each school enters its own branded, role-safe operations desk with the modules and reports it uses.",
        },
      ]}
      trustNotes={[
        { id: "school", label: "School protected", icon: "shield" },
        { id: "branding", label: "School branded", icon: "check" },
        { id: "secure", label: "Secure session", icon: "lock" },
      ]}
    >
      <SchoolLoginView
        resolution={resolution}
        initialEmail={initialEmail}
        initialTenantSlug={initialTenantSlug}
      />
    </AuthShell>
  );
}
