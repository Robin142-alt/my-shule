const reservedSchoolRouteSlugs = new Set([
  "accountant",
  "admin",
  "admissions",
  "api",
  "app",
  "admissions-officer",
  "boarding-master",
  "bursar",
  "class-teacher",
  "clinic-staff",
  "computer-lab-manager",
  "computer-lab-user",
  "counsellor",
  "counselor",
  "dashboard",
  "dean",
  "dean-academics",
  "dean-of-academics",
  "dean-of-students",
  "deputy-principal",
  "department-head",
  "discipline-master",
  "exam-manager",
  "exam-officer",
  "examination-officer",
  "exams-manager",
  "exams-officer",
  "academic-dean",
  "form-master",
  "grade-master",
  "grade-form-master",
  "guidance-counselling",
  "head-of-department",
  "hod",
  "ict",
  "ict-manager",
  "ict-computer-lab-user",
  "forgot-password",
  "lab-technician",
  "laboratory-technician",
  "librarian",
  "login",
  "nurse",
  "parent-portal",
  "owner",
  "principal",
  "procurement",
  "procurement-manager",
  "procurement-officer",
  "registrar",
  "reset-password",
  "school-portal",
  "school-admin",
  "school-counsellor",
  "school-owner",
  "secretary",
  "security-officer",
  "storekeeper",
  "student",
  "superadmin",
  "teacher",
  "tenant-owner",
  "transport-manager",
  "www",
]);

export function normalizeTenantSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isReservedSchoolRouteSlug(slug: string) {
  return reservedSchoolRouteSlugs.has(normalizeTenantSlug(slug));
}

export function getTenantCanonicalUrl(
  slug: string,
  preferred: "path" | "subdomain" = "path",
) {
  const normalized = normalizeTenantSlug(slug);

  if (preferred === "subdomain") {
    return `https://${normalized}.myshule.online/`;
  }

  return `https://myshule.online/school/${normalized}`;
}

function normalizeHost(host: string) {
  const lower = host.trim().toLowerCase();
  const withoutProtocol = lower.replace(/^https?:\/\//, "");
  const withoutPath = withoutProtocol.split("/")[0] ?? withoutProtocol;

  if (withoutPath.startsWith("[")) {
    const bracketEnd = withoutPath.indexOf("]");
    return bracketEnd === -1 ? withoutPath : withoutPath.slice(1, bracketEnd);
  }

  const portIndex = withoutPath.lastIndexOf(":");
  if (portIndex > -1 && withoutPath.indexOf(":") === portIndex) {
    return withoutPath.slice(0, portIndex);
  }

  return withoutPath;
}

export function getSubdomainTenant(host: string | null | undefined) {
  if (!host) {
    return null;
  }

  const normalizedHost = normalizeHost(host);
  const suffix = ".myshule.online";

  if (!normalizedHost.endsWith(suffix)) {
    return null;
  }

  const subdomain = normalizedHost.slice(0, -suffix.length);

  if (!subdomain || subdomain.includes(".") || isReservedSchoolRouteSlug(subdomain)) {
    return null;
  }

  return normalizeTenantSlug(subdomain);
}

export function tenantSlugToName(slug: string) {
  return normalizeTenantSlug(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
