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
      heroTitle="School update parents wanted."
      heroDescription="Attendance, fees, progress, clinic notes, teacher messages, and school notices appear in a secure family workspace when the school enables those modules."
      badge="Portal access"
      helper="Parents only see linked learners, and students only see their own records, balances, comments, notices, and messages."
      highlights={[
        {
          id: "progress",
          title: "Child progress timeline",
          description: "Attendance snapshots, performance changes, and teacher communication stay connected to the verified learner profile.",
        },
        {
          id: "fees",
          title: "Fees with context",
          description: "Balances, recent payments, M-PESA instructions, and reminders stay private to the verified family account.",
        },
        {
          id: "care",
          title: "Care signals in one place",
          description: "Clinic, discipline, transport, notices, and downloads appear only when the school has enabled those modules.",
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
