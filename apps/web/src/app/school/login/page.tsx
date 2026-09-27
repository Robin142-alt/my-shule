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
  const acceptedInvite = readSearchParam(resolvedSearchParams, "accepted").trim() === "1";
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");
  const resolution = resolveSchoolBranding(host);

  return (
    <>
      <AuthShell>
      <SchoolLoginView
        resolution={resolution}
        initialEmail={initialEmail}
        initialTenantSlug={initialTenantSlug}
        acceptedInvite={acceptedInvite}
      />
      </AuthShell>
    </>
  );
}
