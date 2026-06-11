import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  status: string;
  dueDate?: string;
  href: string;
  onComplete?: () => void;
}

export function TaskCard({ id, title, description, status, dueDate, href, onComplete }: TaskCardProps) {
  return (
    <Card className="p-4 transition-colors hover:border-accent/40 hover:bg-surface-muted">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 min-w-0">
          <Link href={href} className="group">
            <h4 className="text-sm font-semibold text-foreground group-hover:text-accent truncate">
              {title}
            </h4>
            <p className="mt-1 text-xs text-muted line-clamp-2">
              {description}
            </p>
          </Link>
          
          <div className="mt-3 flex items-center gap-3">
            <StatusPill 
              label={status} 
              tone={status.toLowerCase() === 'completed' ? 'ok' : status.toLowerCase() === 'open' ? 'warning' : 'pending'} 
              compact 
            />
            {dueDate && (
              <span className="text-[11px] text-muted font-medium">
                Due: {dueDate}
              </span>
            )}
          </div>
        </div>

        {onComplete && status.toLowerCase() !== 'completed' && (
          <div className="mt-3 md:mt-0 md:ml-4 shrink-0">
            <button
              type="button"
              onClick={onComplete}
              className="inline-flex items-center justify-center rounded-[var(--radius-sm)] border border-accent bg-accent/10 px-3 py-1.5 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              Mark Complete
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
