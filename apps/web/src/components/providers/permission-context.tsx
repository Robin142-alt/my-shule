"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

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

export function PermissionProvider({ 
  children,
  schoolId 
}: { 
  children: ReactNode;
  schoolId?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["permissions", schoolId],
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

  const hasPermission = (key: string) => {
    // If no specific permission is required, assume accessible.
    if (!key) return true;
    
    // exact match
    if (permissions.includes(key)) return true;
    
    // check wildcards (e.g. if we have 'finance.*', we allow 'finance.overview.view')
    const keyParts = key.split('.');
    for (const p of permissions) {
      if (p.includes('*')) {
        const pParts = p.split('.');
        let match = true;
        for (let i = 0; i < pParts.length; i++) {
          if (pParts[i] === '*') break; // wildcard matches the rest
          if (pParts[i] !== keyParts[i]) {
            match = false;
            break;
          }
        }
        if (match) return true;
      }
    }
    
    return false;
  };

  return (
    <PermissionContext.Provider value={{ permissions, isLoading, hasPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionContext);
}
