"use client";

import { SchoolLoginView } from "@/components/auth/school-login-view";
import { resolveSchoolBranding } from "@/lib/auth/school-branding";

export function PublicSchoolLoginView({
  intent = "school",
}: {
  intent?: "school" | "teacher" | "accountant";
}) {
  return (
    <SchoolLoginView
      resolution={resolveSchoolBranding("myshule.online")}
      title={
        intent === "teacher"
          ? "Teacher sign in"
          : intent === "accountant"
            ? "Finance sign in"
            : "Sign in to MyShule"
      }
    />
  );
}
