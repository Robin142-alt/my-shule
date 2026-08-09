"use client";

import { Building2, type LucideIcon } from "lucide-react";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DashboardGreeting } from "@/components/common/dashboard-greeting";
import { SchoolDashboardRoleSwitcher } from "@/components/school/school-dashboard-role-switcher";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { tenantSlugToName } from "@/lib/seo/tenant-routes";

type SchoolIdentityResponse = {
  schoolName?: string | null;
  logoUrl?: string | null;
};

type SchoolCommandIdentityContextValue = {
  schoolName: string;
  logoUrl: string | null;
  userLabel: string;
};

const SchoolCommandIdentityContext = createContext<SchoolCommandIdentityContextValue | null>(null);

function fallbackSchoolName(tenantSlug?: string | null) {
  const normalized = tenantSlug?.trim();
  return normalized ? tenantSlugToName(normalized) : "School workspace";
}

export function SchoolCommandIdentityProvider({
  tenantSlug,
  userLabel,
  children,
}: {
  tenantSlug?: string | null;
  userLabel?: string | null;
  children: ReactNode;
}) {
  const { data: identity } = useSchoolQuery<SchoolIdentityResponse>("/school/identity", {
    tenantId: tenantSlug?.trim() || undefined,
  });
  const value = useMemo<SchoolCommandIdentityContextValue>(() => ({
    schoolName: identity?.schoolName?.trim() || fallbackSchoolName(tenantSlug),
    logoUrl: identity?.logoUrl?.trim() || null,
    userLabel: userLabel?.trim() || "School user",
  }), [identity?.logoUrl, identity?.schoolName, tenantSlug, userLabel]);

  return (
    <SchoolCommandIdentityContext.Provider value={value}>
      {children}
    </SchoolCommandIdentityContext.Provider>
  );
}

export function useSchoolCommandIdentity() {
  const value = useContext(SchoolCommandIdentityContext);
  return value ?? {
    schoolName: "School workspace",
    logoUrl: null,
    userLabel: "School user",
  };
}

export function SchoolCommandSidebarIdentity({
  eyebrow,
  title,
  subtitle,
  icon: Icon = Building2,
  tone = "dark",
  className = "",
}: {
  eyebrow: string;
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: "dark" | "light";
  className?: string;
}) {
  const { schoolName, logoUrl } = useSchoolCommandIdentity();
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const canShowLogo = Boolean(logoUrl && failedLogoUrl !== logoUrl);
  const isLight = tone === "light";

  return (
    <div className={`mb-5 rounded-2xl border p-4 ${isLight ? "border-[#D8E0EC] bg-[#F8FAFC]" : "border-white/12 bg-white/[0.08] backdrop-blur"} ${className}`}>
      <div className="flex items-center gap-3">
        {canShowLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl ?? undefined}
            alt={`${schoolName} logo`}
            className={`h-14 w-14 shrink-0 rounded-xl border bg-white object-contain p-1.5 ${isLight ? "border-[#D8E0EC]" : "border-white/15"}`}
            onError={() => setFailedLogoUrl(logoUrl)}
          />
        ) : (
          <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl border ${isLight ? "border-[#D8E0EC] bg-white" : "border-white/15 bg-white/10"}`}>
            <Icon className={`h-7 w-7 ${isLight ? "text-[#1D4ED8]" : "text-cyan-200"}`} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0">
          <p className={`text-xs font-black uppercase tracking-[0.16em] ${isLight ? "text-[#1D4ED8]" : "text-cyan-200"}`}>{eyebrow}</p>
          <p className={`mt-1 truncate text-xl font-black ${isLight ? "text-[#071D49]" : "text-white"}`}>{schoolName}</p>
        </div>
      </div>
      {title ? <p className={`mt-3 text-sm font-black ${isLight ? "text-[#071D49]" : "text-white"}`}>{title}</p> : null}
      {subtitle ? <p className={`mt-1 text-xs font-semibold leading-5 ${isLight ? "text-[#64748B]" : "text-white/62"}`}>{subtitle}</p> : null}
    </div>
  );
}

export function IntegratedSchoolCommandHeader({
  roleTitle,
  fallbackUserLabel,
  contextLabel = "command center",
  actions,
  className = "",
}: {
  roleTitle: string;
  fallbackUserLabel?: string;
  contextLabel?: string;
  actions?: ReactNode;
  className?: string;
}) {
  const { schoolName, userLabel } = useSchoolCommandIdentity();
  const greetingName = userLabel === "School user" && fallbackUserLabel
    ? fallbackUserLabel
    : userLabel;

  return (
    <header
      className={`rounded-[var(--radius-xl)] border border-[#C8D5EA] bg-white p-4 text-[#071D49] shadow-[0_18px_50px_rgba(7,29,73,0.12)] md:p-5 ${className}`}
      data-testid="integrated-school-command-header"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <DashboardGreeting name={greetingName} context={`${schoolName} ${contextLabel}`} />
          <h1 className="mt-1 text-2xl font-black">{roleTitle}</h1>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:max-w-[68%] xl:justify-end">
          <SchoolDashboardRoleSwitcher className="w-full sm:w-auto" />
          {actions}
        </div>
      </div>
    </header>
  );
}
