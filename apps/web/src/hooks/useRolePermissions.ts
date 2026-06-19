import { useQuery } from '@tanstack/react-query';

interface AuthMeResponse {
  session: {
    role?: string;
    permissions?: string[]; // Assuming backend can provide this if needed, or we just map roles
  };
  user: {
    id: string;
    email: string;
  };
}

export function useRolePermissions() {
  const { data, isLoading } = useQuery<AuthMeResponse>({
    queryKey: ['auth', 'me', 'school'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me?audience=school');
      if (!res.ok) throw new Error('Not authenticated');
      return res.json();
    },
    retry: false,
  });

  // Extract role and permissions from session
  // If the backend doesn't supply permissions array, we can default to empty or mock based on role
  const roles = data?.session?.role ? [data.session.role] : [];
  const permissions = data?.session?.permissions || [];

  const hasRole = (role: string) => roles.includes(role);
  const hasAnyRole = (checkRoles: string[]) => checkRoles.some(r => roles.includes(r));
  const hasPermission = (permission: string) => permissions.includes(permission);

  return { 
    roles, 
    permissions, 
    hasRole, 
    hasAnyRole, 
    hasPermission, 
    isLoading 
  };
}
