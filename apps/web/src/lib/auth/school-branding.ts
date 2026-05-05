export interface SchoolBranding {
  slug: string;
  name: string;
  shortName: string;
  county: string;
  supportEmail: string;
  supportPhone: string;
  heroMessage: string;
  logoMark: string;
}

export interface SchoolBrandingResolution {
  status: "resolved" | "default" | "unknown";
  requestedSlug: string | null;
  host: string | null;
  branding: SchoolBranding;
}

const defaultBranding: SchoolBranding = {
  slug: "amani-prep",
  name: "Amani Preparatory",
  shortName: "Amani Prep",
  county: "Nairobi County",
  supportEmail: "support@amaniprep.ac.ke",
  supportPhone: "+254 712 345 801",
  heroMessage: "Keep admissions, collections, academics, and attendance moving with one trusted school workspace.",
  logoMark: "AP",
};

const schoolBrandingMap: Record<string, SchoolBranding> = {
  "amani-prep": defaultBranding,
  amanischool: defaultBranding,
  "baraka-academy": {
    slug: "baraka-academy",
    name: "Baraka Academy",
    shortName: "Baraka",
    county: "Kiambu County",
    supportEmail: "help@barakaacademy.sch.ke",
    supportPhone: "+254 723 456 811",
    heroMessage: "A familiar, secure workspace for bursars, principals, teachers, and school office teams.",
    logoMark: "BA",
  },
  barakaacademy: {
    slug: "baraka-academy",
    name: "Baraka Academy",
    shortName: "Baraka",
    county: "Kiambu County",
    supportEmail: "help@barakaacademy.sch.ke",
    supportPhone: "+254 723 456 811",
    heroMessage: "A familiar, secure workspace for bursars, principals, teachers, and school office teams.",
    logoMark: "BA",
  },
  "mwangaza-junior": {
    slug: "mwangaza-junior",
    name: "Mwangaza Junior School",
    shortName: "Mwangaza",
    county: "Kisumu County",
    supportEmail: "support@mwangazajunior.sch.ke",
    supportPhone: "+254 734 567 822",
    heroMessage: "School operations feel simple when collections, roll call, and reports all live in one calm workflow.",
    logoMark: "MJ",
  },
  mwangaza: {
    slug: "mwangaza-junior",
    name: "Mwangaza Junior School",
    shortName: "Mwangaza",
    county: "Kisumu County",
    supportEmail: "support@mwangazajunior.sch.ke",
    supportPhone: "+254 734 567 822",
    heroMessage: "School operations feel simple when collections, roll call, and reports all live in one calm workflow.",
    logoMark: "MJ",
  },
};

const reservedSubdomains = new Set([
  "www",
  "app",
  "portal",
  "superadmin",
  "localhost",
]);

function normalizeHost(host: string | null | undefined) {
  if (!host) {
    return null;
  }

  return host.split(":")[0].trim().toLowerCase();
}

function extractSubdomain(host: string | null) {
  if (!host) {
    return null;
  }

  const parts = host.split(".");

  if (parts.length <= 2) {
    return null;
  }

  const candidate = parts[0];

  if (reservedSubdomains.has(candidate)) {
    return null;
  }

  return candidate;
}

export function resolveSchoolBranding(host: string | null | undefined) {
  const normalizedHost = normalizeHost(host);
  const requestedSlug = extractSubdomain(normalizedHost);

  if (!requestedSlug) {
    return {
      status: "default" as const,
      requestedSlug: null,
      host: normalizedHost,
      branding: defaultBranding,
    } satisfies SchoolBrandingResolution;
  }

  const resolvedBranding = schoolBrandingMap[requestedSlug];

  if (!resolvedBranding) {
    return {
      status: "unknown" as const,
      requestedSlug,
      host: normalizedHost,
      branding: {
        ...defaultBranding,
        name: "School workspace not found",
        shortName: "Unknown school",
        heroMessage: "We could not match this school link to an active tenant. Confirm the school address or contact support.",
        logoMark: requestedSlug.slice(0, 2).toUpperCase(),
      },
    } satisfies SchoolBrandingResolution;
  }

  return {
    status: "resolved" as const,
    requestedSlug,
    host: normalizedHost,
    branding: resolvedBranding,
  } satisfies SchoolBrandingResolution;
}
