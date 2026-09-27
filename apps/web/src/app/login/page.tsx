import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { PublicSchoolLoginView } from "@/components/auth/public-school-login-view";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function PublicLoginPage() {
  return <AuthShell><PublicSchoolLoginView /></AuthShell>;
}
