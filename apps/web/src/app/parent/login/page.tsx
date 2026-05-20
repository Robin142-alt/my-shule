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

export default function ParentLoginPage() {
  return (
    <AuthShell
      eyebrow="Parent portal login"
      heroTitle="See fees, grades, discipline and health updates without calling the school."
      heroDescription="Parent login saves families from office queues and repeated calls. Check fee balance, M-PESA guidance, grades, discipline score, medical notes, notices, downloads, and SMS reminders from your phone."
      badge="Family access"
      logoMark="PT"
      helper="Parent sessions are linked only to verified learners, so each family sees the records, balances, and school updates meant for them."
      highlights={[
        {
          id: "payments",
          title: "No fee-balance trips",
          description: "Balances, recent payments, SMS reminders, and M-PESA instructions stay easy to understand on phones.",
        },
        {
          id: "progress",
          title: "Progress before report day",
          description: "Grades, discipline score, and learner updates are visible before a small concern becomes stress.",
        },
        {
          id: "care",
          title: "Health and notices together",
          description: "Medical history, clinic notes, school notices, and downloads live inside the same trusted portal.",
        },
      ]}
      trustNotes={[
        { id: "family-safe", label: "Private family access", icon: "shield" },
        { id: "mpesa", label: "Payment aware", icon: "check" },
        { id: "secure", label: "Secure session", icon: "lock" },
      ]}
    >
      <PortalLoginView mode="parent" />
    </AuthShell>
  );
}
