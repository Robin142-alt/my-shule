"use client";

import type { ReactNode } from "react";

export function AppFrame({
  sidebar,
  topbar,
  backdrop,
  children,
}: {
  sidebar: ReactNode;
  topbar: ReactNode;
  backdrop?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="enterprise-shell min-h-screen">
      <div className="min-h-screen">
      <div className="mx-auto grid min-h-screen max-w-[var(--content-max-width)] gap-4 px-3 py-3 md:px-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-6 lg:px-6">
        {sidebar}
        {backdrop}
        <div className="min-w-0">
          {topbar}
          <main className="space-y-6 pb-8">{children}</main>
        </div>
      </div>
      </div>
    </div>
  );
}
