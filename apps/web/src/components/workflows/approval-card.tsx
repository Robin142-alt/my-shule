import React from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';

interface ApprovalCardProps {
  id: string;
  title: string;
  description: string;
  requesterName: string;
  requesterRole: string;
  status: string;
  href: string;
  onApprove?: (note?: string) => void;
  onReject?: (note?: string) => void;
}

export function ApprovalCard({
  id,
  title,
  description,
  requesterName,
  requesterRole,
  status,
  href,
  onApprove,
  onReject,
}: ApprovalCardProps) {
  const isPending = status.toLowerCase() === 'pending';

  return (
    <Card className={`p-4 transition-colors ${isPending ? 'border-accent/40 bg-accent/5' : 'hover:bg-surface-muted'}`}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={href} className="group min-w-0">
              <h4 className="text-sm font-semibold text-foreground group-hover:text-accent truncate">
                {title}
              </h4>
              <p className="mt-1 text-xs text-muted line-clamp-2">
                {description}
              </p>
            </Link>
            {!isPending && (
              <StatusPill 
                label={status} 
                tone={status.toLowerCase() === 'approved' ? 'ok' : 'critical'} 
                compact 
              />
            )}
          </div>
          
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Requester:</span>
              <span className="text-xs font-medium text-foreground">{requesterName}</span>
              <StatusPill label={requesterRole} tone="ok" compact />
            </div>
          </div>
        </div>

        {isPending && (onApprove || onReject) && (
          <div className="mt-4 flex shrink-0 items-center gap-2 md:mt-0 md:ml-4">
            {onReject && (
              <button
                type="button"
                onClick={() => onReject()}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] border border-danger bg-surface px-3 text-[12px] font-semibold text-danger transition-colors hover:bg-danger/10"
              >
                <X className="h-3.5 w-3.5" />
                Reject
              </button>
            )}
            {onApprove && (
              <button
                type="button"
                onClick={() => onApprove()}
                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-accent px-3 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                <Check className="h-3.5 w-3.5" />
                Approve
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
