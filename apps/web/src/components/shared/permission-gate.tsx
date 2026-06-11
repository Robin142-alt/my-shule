import React from 'react';
import { useRolePermissions } from '../../hooks/useRolePermissions';
import { ErrorState } from './error-state';

interface PermissionGateProps {
  requiredRole?: string;
  requiredAnyRole?: string[];
  requiredPermission?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  requiredRole,
  requiredAnyRole,
  requiredPermission,
  children,
  fallback
}) => {
  const { hasRole, hasAnyRole, hasPermission, isLoading } = useRolePermissions();

  if (isLoading) {
    return null; // Or a subtle skeleton
  }

  let isAllowed = true;

  if (requiredRole && !hasRole(requiredRole)) isAllowed = false;
  if (requiredAnyRole && !hasAnyRole(requiredAnyRole)) isAllowed = false;
  if (requiredPermission && !hasPermission(requiredPermission)) isAllowed = false;

  if (!isAllowed) {
    return fallback ? <>{fallback}</> : (
      <ErrorState 
        title="Access Denied" 
        message="You do not have the required permissions to view this content." 
      />
    );
  }

  return <>{children}</>;
};
