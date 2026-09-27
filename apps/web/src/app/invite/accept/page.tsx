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
    <AuthShell>
      <InviteAcceptanceView initialToken={initialToken} initialTenantSlug={initialTenantSlug} />
    </AuthShell>
  );
}
