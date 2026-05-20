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
    <AuthShell
      eyebrow="Parent and student portal"
      heroTitle="The school update parents wanted before they made the call."
      heroDescription="Open fees, grades, discipline notes, health updates, notices, downloads, and SMS fee reminders from one calm mobile portal."
      badge="Portal access"
      logoMark="PT"
      helper="Parents only see linked learners, and students only see their own records, balances, comments, notices, and messages."
      highlights={[
        {
          id: "fees",
          title: "Fees without office queues",
          description: "Current balance, recent payments, M-PESA instructions, and reminders stay simple and visible.",
        },
        {
          id: "updates",
          title: "Daily visibility",
          description: "Families can check results, discipline score, health notes, and school updates without calling first.",
        },
        {
          id: "friendly",
          title: "Friendly by default",
          description: "The portal is designed for phones first, with language non-technical users can trust immediately.",
        },
      ]}
      trustNotes={[
        { id: "family-safe", label: "Private family access", icon: "shield" },
        { id: "mobile-ready", label: "Mobile first", icon: "check" },
        { id: "secure-login", label: "Secure login", icon: "lock" },
      ]}
    >
      <PortalLoginView />
    </AuthShell>
  );
}
