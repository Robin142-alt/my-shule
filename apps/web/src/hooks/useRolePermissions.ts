import { useState, useEffect } from 'react';

// In a real implementation this might fetch from an API or read from a JWT token / AuthContext
export function useRolePermissions() {
  const [roles, setRoles] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock loading permissions from localStorage or auth state
    try {
      const storedRoles = JSON.parse(localStorage.getItem('userRoles') || '[]');
      const storedPerms = JSON.parse(localStorage.getItem('userPermissions') || '[]');
      setRoles(storedRoles);
      setPermissions(storedPerms);
    } catch (e) {
      console.error('Failed to load permissions', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasRole = (role: string) => roles.includes(role);
  const hasAnyRole = (checkRoles: string[]) => checkRoles.some(r => roles.includes(r));
  const hasPermission = (permission: string) => permissions.includes(permission);

  return { roles, permissions, hasRole, hasAnyRole, hasPermission, isLoading };
}
