import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { PortalLoginView } from "@/components/auth/portal-login-view";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Parent Portal Login",
  description:
    "My Shule parent and student portal login for fee balance, grades, discipline, medical notes, notices, downloads, and mobile school updates.",
  alternates: {
    canonical: "/portal/login",
  },
  openGraph: {
    title: "Parent Portal Login | My Shule",
    description:
      "Families can see school records and payments in one mobile portal instead of calling or travelling for simple updates.",
    url: absoluteUrl("/portal/login"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default function PortalLoginPage() {
  return (
    <AuthShell>
      <PortalLoginView />
    </AuthShell>
  );
}
