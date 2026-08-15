import type { SearchEntityType } from "@/lib/search/search-access-policy";

export type OperationalSearchAction = {
  label: string;
  href: string;
  capability?: string;
  auditEvent: string;
};

export type OperationalSearchRecord = {
  id: string;
  type: SearchEntityType;
  typeLabel: string;
  title: string;
  detail: string;
  keywords: string;
  scopeTags: string[];
  actions: OperationalSearchAction[];
};

/**
 * Operational records must come from a tenant-scoped backend search response.
 * Keeping this registry empty prevents production-looking learners, payments,
 * visitors, health records, and platform tenants from leaking into real schools.
 * Navigation search remains available while the live record result is loading
 * or unavailable.
 */
export const operationalSearchRegistry: OperationalSearchRecord[] = [];
