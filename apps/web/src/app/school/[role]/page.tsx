import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";

import { ContactStrip } from "@/components/marketing/contact-strip";
import { HeroSection } from "@/components/marketing/hero-section";
import { InfoCard } from "@/components/marketing/info-card";
import { PublicSiteShell } from "@/components/marketing/public-site-shell";
import { SeoJsonLd } from "@/components/marketing/seo-json-ld";
import { SchoolPages } from "@/components/school/school-pages";
import { readAccessCookie } from "@/lib/auth/server-session";
import { getSchoolRoleAlias } from "@/lib/auth/school-role-normalization";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { readPublicSchoolSession } from "@/lib/routing/public-experience-session";
import { createTenantMetadata } from "@/lib/seo/metadata";
import {
  isReservedSchoolRouteSlug,
  normalizeTenantSlug,
  tenantSlugToName,
} from "@/lib/seo/tenant-routes";

const allowedRoles = [
  "principal",
  "deputy-principal",
  "secretary",
  "bursar",
  "accountant",
  "teacher",
  "dean-academics",
  "exams-manager",
  "hod",
  "class-teacher",
  "grade-master",
  "admin",
  "storekeeper",
  "admissions",
  "librarian",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
  "guidance-counselling",
  "discipline-master",
] as const;

function isAllowedRole(value: string): value is SchoolExperienceRole {
  return allowedRoles.includes(value as SchoolExperienceRole);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ role: string }>;
}): Promise<Metadata> {
  const { role } = await params;

  if (isAllowedRole(role)) {
    return {
      title: {
        absolute: "School Portal - MyShule",
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  if (isReservedSchoolRouteSlug(role)) {
    return {
      title: {
        absolute: "School Portal - MyShule",
      },
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const slug = normalizeTenantSlug(role);
  return createTenantMetadata({
    schoolName: tenantSlugToName(slug),
    slug,
  });
}

function PublicTenantSchoolPage({ slug }: { slug: string }) {
  const schoolName = tenantSlugToName(slug);
  const title = `${schoolName} School Portal`;
  const description = `${schoolName} can use MyShule to connect parent communication, school reporting, and daily school operations in one clear school portal.`;

  return (
    <PublicSiteShell>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: title,
          description,
          url: `https://myshule.online/school/${slug}`,
        }}
      />
      <HeroSection
        title={title}
        description={description}
        secondaryDescription="This public school route is ready for verified school pages while role-based school dashboards continue to use protected access."
        primaryCta={{ label: "School Portal", href: "/school-portal" }}
        secondaryCta={{ label: "Login to Dashboard", href: "/school/login" }}
        visual={
          <div className="rounded-xl border border-white/10 bg-surface/80 p-5 shadow-[0_20px_70px_rgba(2,6,23,0.26)] backdrop-blur">
            <div className="rounded-xl bg-[#071D49] p-5 text-white">
              <p className="text-sm font-semibold">{schoolName}</p>
              <p className="mt-2 text-3xl font-semibold leading-tight">School-ready visibility</p>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Parent Portal, School Portal, and Dashboard routes remain connected to the MyShule public hierarchy.
              </p>
            </div>
          </div>
        }
      />
      <section className="mx-auto grid w-full max-w-7xl gap-4 px-5 py-12 sm:px-8 md:grid-cols-3 lg:px-10">
        <InfoCard title="Parent visibility" description="Families get a structured route to official school updates." />
        <InfoCard title="School control" description="Staff access remains role-aware and school protected." tone="blue" />
        <InfoCard title="Dashboard clarity" description="Leadership visibility connects to the public MyShule hierarchy." tone="orange" />
      </section>
      <ContactStrip primaryHref="/school-portal" primaryLabel="Request Demo" />
    </PublicSiteShell>
  );
}

export default async function SchoolRoleHomePage({
  params,
}: {
  params: Promise<{ role: string }>;
}) {
  const { role } = await params;
  const roleAlias = getSchoolRoleAlias(role);

  if (roleAlias) {
    redirect(`/school/${roleAlias}`);
  }

  if (!isAllowedRole(role)) {
    if (isReservedSchoolRouteSlug(role)) {
      notFound();
    }

    return <PublicTenantSchoolPage slug={normalizeTenantSlug(role)} />;
  }

  if (!allowedRoles.includes(role)) {
    notFound();
  }

  const session = await readPublicSchoolSession(role);
  const cookieStore = await cookies();
  const liveDataEnabled = Boolean(readAccessCookie(cookieStore));

  return (
    <SchoolPages
      role={session.role}
      tenantSlug={session.tenantSlug}
      routeMode="public"
      liveDataEnabled={liveDataEnabled}
    />
  );
}
