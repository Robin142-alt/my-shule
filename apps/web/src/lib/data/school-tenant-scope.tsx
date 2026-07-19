"use client";

import { createContext, useContext, type ReactNode } from "react";

const SchoolTenantScopeContext = createContext<string | null>(null);

export function SchoolTenantScopeProvider({
  tenantId,
  children,
}: {
  tenantId: string;
  children: ReactNode;
}) {
  const normalizedTenantId = tenantId.trim();

  if (!normalizedTenantId) {
    throw new Error("SchoolTenantScopeProvider requires a tenant ID");
  }

  return (
    <SchoolTenantScopeContext.Provider value={normalizedTenantId}>
      {children}
    </SchoolTenantScopeContext.Provider>
  );
}

export function useOptionalSchoolTenantId() {
  return useContext(SchoolTenantScopeContext);
}
