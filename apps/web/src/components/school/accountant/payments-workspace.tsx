"use client";
import type { SchoolExperienceRole } from "@/lib/experiences/school-data";
import { PaymentRegister } from "./payment-register";

export function PaymentsWorkspace(props: {
  role: SchoolExperienceRole; tenantSlug?: string | null; routeMode?: "hosted" | "public";
  activeSection?: string; onNavigate?: (section: string) => void;
}) {
  return <PaymentRegister tenantSlug={props.tenantSlug} onNavigate={props.onNavigate} />;
}
