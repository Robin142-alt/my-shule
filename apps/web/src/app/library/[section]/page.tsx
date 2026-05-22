import { notFound } from "next/navigation";
import Link from "next/link";

import { LibraryWorkspace } from "@/components/library/library-workspace";
import {
  isLibrarySection,
  type LibrarySectionId,
} from "@/lib/library/library-data";
import { getSchoolModuleAccessFailureMessage } from "@/lib/module-access/server-school-module-access";
import { readLibrarianLibrarySession } from "@/lib/routing/public-experience-session";

export default async function LibrarianLibrarySectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!isLibrarySection(section)) {
    notFound();
  }

  const session = await readLibrarianLibrarySession();

  if (!session.libraryModuleAccess.enabled) {
    return (
      <LibraryModuleDisabledPage
        message={getSchoolModuleAccessFailureMessage(session.libraryModuleAccess)}
        tenantSlug={session.tenantSlug}
        userLabel={session.userLabel}
      />
    );
  }

  return (
    <LibraryWorkspace
      section={section as LibrarySectionId}
      userLabel={session.userLabel}
      tenantSlug={session.tenantSlug}
    />
  );
}

function LibraryModuleDisabledPage({
  message,
  tenantSlug,
  userLabel,
}: {
  message: string;
  tenantSlug: string;
  userLabel: string;
}) {
  return (
    <main className="min-h-screen bg-[#eef3f1] px-4 py-10 text-foreground">
      <section className="mx-auto max-w-2xl rounded-[var(--radius-sm)] border border-border bg-surface p-6 shadow-sm">
        <p className="font-mono text-[12px] font-semibold text-muted">{tenantSlug}</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Module not enabled for your school
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-muted">{message}</p>
        <div className="mt-5 rounded-[var(--radius-sm)] border border-border bg-surface-muted px-3 py-2 text-[13px] text-muted">
          Signed in as <span className="font-semibold text-foreground">{userLabel}</span>.
        </div>
        <Link
          className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[#071D49] px-3 text-[13px] font-semibold text-white transition hover:bg-[#0F2345]"
          href="/school/librarian"
        >
          Back to school workspace
        </Link>
      </section>
    </main>
  );
}
