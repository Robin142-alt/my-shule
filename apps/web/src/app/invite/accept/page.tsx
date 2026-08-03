import { AuthShell } from "@/components/auth/auth-shell";
import { InviteAcceptanceView } from "@/components/auth/auth-invitation-view";
import { type ResetSearchParams } from "@/lib/auth/reset-token";

function readSearchParam(
  params: Record<string, string | string[] | undefined> | undefined,
  key: string,
) {
  const value = params?.[key];

  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function InviteAcceptancePage({
  searchParams,
}: {
  searchParams?: ResetSearchParams;
}) {
  const params = await searchParams;
  const initialToken = readSearchParam(params, "token");
  const initialTenantSlug = readSearchParam(params, "tenant");

  return (
    <AuthShell
      eyebrow="Invite acceptance"
      heroTitle="Secure school onboarding starts from a verified invitation."
      heroDescription="New administrators create their own password from a signed, short-lived invitation link before entering a school workspace."
      badge="User onboarding"
      helper="Invitation links bind the school, role, email address, and first password setup without exposing credentials."
      highlights={[
        {
          id: "school",
          title: "School bound",
          description: "The invitation activates access only for the school selected by the platform owner.",
        },
        {
          id: "email",
          title: "Email issued",
          description: "Users receive real email invitations and create passwords themselves.",
        },
        {
          id: "audit",
          title: "Audit ready",
          description: "Acceptance consumes the token and records activation in the auth system.",
        },
      ]}
      trustNotes={[
        { id: "secure", label: "Signed token", icon: "lock" },
        { id: "scoped", label: "School linked", icon: "shield" },
        { id: "verified", label: "Email verified", icon: "check" },
      ]}
    >
      <InviteAcceptanceView initialToken={initialToken} initialTenantSlug={initialTenantSlug} />
    </AuthShell>
  );
}
