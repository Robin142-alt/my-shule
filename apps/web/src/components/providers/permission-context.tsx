"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";

interface PermissionContextType {
  permissions: string[];
  isLoading: boolean;
  hasPermission: (key: string) => boolean;
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: [],
  isLoading: true,
  hasPermission: () => false,
});

export function permissionAllows(permissions: readonly string[], key: string) {
  const required = key.trim().toLowerCase();
  if (!required) return true;

  const granted = permissions
    .map((permission) => permission.trim().toLowerCase())
    .filter(Boolean);

  if (granted.includes("*:*")) return true;
  if (granted.includes(required)) return true;

  const delimiter = required.includes(":") ? ":" : ".";
  const resource = required.split(delimiter)[0];

  return granted.some((permission) => {
    if (permission === "*") return true;
    if (permission === `${resource}:*` || permission === `${resource}.*`) return true;

    if (!permission.endsWith("*")) return false;
    const permissionDelimiter = permission.includes(":") ? ":" : ".";
    const permissionParts = permission.split(permissionDelimiter);
    const requiredParts = required.split(delimiter);
    const prefixParts = permissionParts.slice(0, -1);

    return prefixParts.length < requiredParts.length
      && prefixParts.every((part, index) => part === requiredParts[index]);
  });
}

export function buildPermissionQueryKey(
  schoolId: string | undefined,
  userId: string,
  activeAuthorizationRoleCode: string,
) {
  return [
    "permissions",
    schoolId ?? "session",
    userId,
    activeAuthorizationRoleCode,
  ] as const;
}

export function PermissionProvider({ 
  children,
  schoolId 
}: { 
  children: ReactNode;
  schoolId?: string;
}) {
  const dashboardRole = useOptionalSchoolDashboardRole();
  const activeAuthorizationRoleCode = dashboardRole?.activeAuthorizationRoleCode ?? "session-role";
  const userId = dashboardRole?.userId ?? "session-user";
  const { data, isLoading } = useQuery({
    queryKey: buildPermissionQueryKey(schoolId, userId, activeAuthorizationRoleCode),
    queryFn: async () => {
      if (!schoolId) return [];
      const res = await fetch(`/api/permissions/me?schoolId=${schoolId}`);
      if (!res.ok) throw new Error("Failed to fetch permissions");
      const json = await res.json();
      return json.data as string[];
    },
    enabled: !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const permissions = data || [];

  const hasPermission = (key: string) => permissionAllows(permissions, key);

  return (
    <PermissionContext.Provider value={{ permissions, isLoading, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
