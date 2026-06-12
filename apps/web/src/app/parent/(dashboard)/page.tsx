import React from 'react';
import { cookies } from "next/headers";
import { readAccessCookie, readTenantCookie } from "@/lib/auth/server-session";
import { getDashboardApiBaseUrl } from "@/lib/dashboard/api-client";
import { UnifiedLayoutRenderer } from "@/components/dashboard/UnifiedLayoutRenderer";

export default async function DashboardPage() {
  const token = readAccessCookie(await cookies());
  const tenantId = readTenantCookie(await cookies());
  const baseUrl = getDashboardApiBaseUrl();
  
  // Extract role from path or session (defaulting to user)
  // For the sake of the dynamic layout, we'll infer from context or pass a fixed one based on the app directory.
  // In a real app, role is extracted from the JWT payload.
  const role = "parent"; // AGP will resolve actual capabilities based on the token.

  let layoutPayload = null;
  
  if (token && tenantId) {
    try {
      const qs = new URLSearchParams({ role }).toString();
      const response = await fetch(`${baseUrl}/dashboard/layout?${qs}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-tenant-id": tenantId,
          "Cache-Control": "no-cache",
        },
        cache: "no-store"
      });

      if (response.ok) {
        layoutPayload = await response.json();
      } else {
        console.error("Dashboard layout fetch failed:", response.status, await response.text());
      }
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      <UnifiedLayoutRenderer layoutPayload={layoutPayload} />
    </div>
  );
}
