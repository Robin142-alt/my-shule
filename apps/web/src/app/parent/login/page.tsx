import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { PortalLoginView } from "@/components/auth/portal-login-view";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Parent Login",
  description:
    "My Shule parent login for fee balances, M-PESA payment guidance, grades, discipline score, medical history, notices, and SMS fee reminders.",
  alternates: {
    canonical: "/parent/login",
  },
  openGraph: {
    title: "Parent Login | My Shule",
    description:
      "Parents can check fee balance, grades, discipline score, medical history, notices, and payment guidance without calling the school office.",
    url: absoluteUrl("/parent/login"),
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

export default async function ParentLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialEmail = readSearchParam(resolvedSearchParams, "email").trim();
  const initialTenantSlug = readSearchParam(resolvedSearchParams, "tenant").trim() || null;
  const acceptedInvite = readSearchParam(resolvedSearchParams, "accepted").trim() === "1";

  return (
    <>
      <AuthShell>
      <PortalLoginView
        mode="parent"
        initialEmail={initialEmail}
        initialTenantSlug={initialTenantSlug}
        acceptedInvite={acceptedInvite}
      />
      </AuthShell>
    </>
  );
}
