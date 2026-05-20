import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { PublicSchoolLoginView } from "@/components/auth/public-school-login-view";
import { absoluteUrl, SITE_NAME } from "@/lib/seo";
import { redirectPublicEntryToKnownSession } from "@/lib/routing/public-entry-session";

export const metadata: Metadata = {
  title: "My Shule Dashboard Login",
  description:
    "My Shule dashboard login for school teams to open finance, M-PESA, SMS reminders, academics, discipline, clinic, inventory, library, and principal reporting.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "My Shule Dashboard Login",
    description:
      "Open the My Shule dashboard for school finance, SMS reminders, M-PESA payments, academics, discipline, clinic, and leadership insights.",
    url: absoluteUrl("/login"),
    siteName: SITE_NAME,
    type: "website",
  },
};

export default async function PublicLoginPage() {
  await redirectPublicEntryToKnownSession();

  return (
    <AuthShell
      eyebrow="School ERP sign-in"
      heroTitle="Open the dashboard that saves the school from daily confusion."
      heroDescription="My Shule gives teams one place for fee clarity, M-PESA payments, SMS reminders, academic progress, discipline, clinic records, and principal-level decisions."
      badge="Institutional school access"
      logoMark="SH"
      helper="Every school signs into its own operational environment with finance-safe access, role-aware routing, and clear dashboard paths."
      highlights={[
        {
          id: "finance",
          title: "Fewer balance calls",
          description: "Collections, M-PESA, SMS reminders, balances, and reporting stay visible for bursars and leaders.",
        },
        {
          id: "tenant",
          title: "Less dashboard confusion",
          description: "School branding, role access, and operational data load inside the correct tenant context automatically.",
        },
        {
          id: "trust",
          title: "One daily command center",
          description: "Built for routines schools depend on every day, from learner records to statements and reconciliations.",
        },
      ]}
      trustNotes={[
        { id: "sms", label: "SMS reminders", icon: "check" },
        { id: "tenant", label: "Tenant isolated", icon: "shield" },
        { id: "session", label: "Secure session", icon: "lock" },
      ]}
    >
      <PublicSchoolLoginView />
    </AuthShell>
  );
}
