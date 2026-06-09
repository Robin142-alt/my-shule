export const PARENT_LOGIN_ROUTE = "/parent/login";
export const SCHOOL_LOGIN_ROUTE = "/school/login";

function normalizeInviteRole(role: string | null | undefined) {
  return role?.trim().toLowerCase().replace(/[_\s-]+/g, " ") ?? "";
}

export function isParentRole(role: string | null | undefined) {
  return normalizeInviteRole(role) === "parent";
}

export function redirectAfterInviteAcceptance(role: string | null | undefined) {
  return isParentRole(role) ? PARENT_LOGIN_ROUTE : SCHOOL_LOGIN_ROUTE;
}

export function buildInviteLoginHref(input: {
  role?: string | null;
  email?: string | null;
  tenantId?: string | null;
}) {
  const href = redirectAfterInviteAcceptance(input.role);
  const params = new URLSearchParams();
  const email = input.email?.trim().toLowerCase();
  const tenantId = input.tenantId?.trim();

  params.set("accepted", "1");

  if (email) {
    params.set("email", email);
  }

  if (tenantId) {
    params.set("tenant", tenantId);
  }

  const query = params.toString();

  return query ? `${href}?${query}` : href;
}

export function inviteLoginLabel(role: string | null | undefined) {
  return isParentRole(role) ? "Continue to Parent Login" : "Continue to School Login";
}
