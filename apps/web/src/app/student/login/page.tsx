import { AuthShell } from "@/components/auth/auth-shell";
import { PortalLoginView } from "@/components/auth/portal-login-view";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const read = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  };
  return (
    <AuthShell>
      <PortalLoginView
        mode="student"
        initialEmail={read("email")}
        initialTenantSlug={read("tenant") || null}
        acceptedInvite={read("accepted") === "1"}
      />
    </AuthShell>
  );
}
