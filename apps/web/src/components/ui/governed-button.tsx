import { Button } from "./button";
import { usePermissions } from "../providers/permission-context";
import { Lock, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export interface GovernedButtonProps extends React.ComponentProps<typeof Button> {
  requiredCapability?: string;
  actionName?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => Promise<any> | void;
  // External overrides
  isDegraded?: boolean;
  isFailed?: boolean;
  isLoading?: boolean;
}

export function GovernedButton({
  requiredCapability,
  actionName,
  children,
  onClick,
  variant = "primary",
  isDegraded,
  isFailed,
  isLoading,
  ...props
}: GovernedButtonProps) {
  const { hasPermission } = usePermissions();
  
  // Capability Check
  const hasAccess = requiredCapability ? hasPermission(requiredCapability) : true;
  
  // Internal State Machine
  const [internalState, setInternalState] = useState<'ACTIVE' | 'LOADING' | 'DEGRADED' | 'FAILED' | 'LOCKED'>(
    hasAccess ? 'ACTIVE' : 'LOCKED'
  );

  // Sync with external states if provided
  useEffect(() => {
    if (!hasAccess) {
      setInternalState('LOCKED');
    } else if (isLoading) {
      setInternalState('LOADING');
    } else if (isFailed) {
      setInternalState('FAILED');
    } else if (isDegraded) {
      setInternalState('DEGRADED');
    } else {
      setInternalState('ACTIVE');
    }
  }, [hasAccess, isLoading, isFailed, isDegraded]);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (internalState === 'LOCKED' || internalState === 'LOADING') {
      e.preventDefault();
      return;
    }
    
    if (!onClick) return;

    try {
      if (isLoading === undefined) setInternalState('LOADING');
      const result = await onClick(e);
      
      // Auto-detect degraded/fallback signatures from AGP backend
      if (result && typeof result === 'object' && ('degraded' in result || 'fallback' in result)) {
        if (isDegraded === undefined) setInternalState('DEGRADED');
      } else {
        if (isLoading === undefined) setInternalState('ACTIVE');
      }
    } catch (error) {
      if (isFailed === undefined) setInternalState('FAILED');
      // Autonomous self-healing console event
      console.warn(`[AGP Self-Healing Frontend] Button action failed: ${actionName || 'unknown_action'}`, error);
    }
  };

  const isLocked = internalState === 'LOCKED';
  const isCurrentlyLoading = internalState === 'LOADING';
  const isCurrentlyDegraded = internalState === 'DEGRADED';
  const isCurrentlyFailed = internalState === 'FAILED';

  // Override variant and styling based on health
  let finalVariant = variant;
  if (isLocked) finalVariant = 'outline';
  else if (isCurrentlyFailed) finalVariant = 'danger';

  return (
    <Button
      variant={finalVariant}
      onClick={handleClick}
      disabled={isLocked || props.disabled}
      className={`${props.className || ''} ${isCurrentlyDegraded ? 'ring-2 ring-yellow-500 ring-offset-1 border-yellow-500 bg-yellow-50 text-yellow-900 hover:bg-yellow-100' : ''}`}
      {...props}
    >
      {isCurrentlyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {isLocked && <Lock className="w-4 h-4 text-slate-400" />}
      {isCurrentlyDegraded && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
      {isCurrentlyFailed && <XCircle className="w-4 h-4 text-white" />}
      
      {/* Label wrapping */}
      <span className={isLocked ? 'text-slate-400' : ''}>
        {isLocked ? `Locked (${requiredCapability})` : children}
      </span>
    </Button>
  );
}
