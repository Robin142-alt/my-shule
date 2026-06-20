import React from 'react';
import { Shield, Clock, User } from 'lucide-react';

export interface AuditLogEntry {
  id: string;
  aggregate_id: string;
  action: string;
  performed_by_id: string;
  performed_by_role: string;
  payload: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

interface AuditLogTimelineProps {
  logs: AuditLogEntry[];
}

export function AuditLogTimeline({ logs }: AuditLogTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-border p-8 text-center">
        <Shield className="mx-auto h-8 w-8 text-muted/50" />
        <h3 className="mt-4 text-sm font-semibold text-foreground">No audit logs found</h3>
        <p className="mt-1 text-xs text-muted">There is no recorded history for this item.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-border ml-3 space-y-6 pb-4">
      {logs.map((log, index) => {
        const isLatest = index === 0;
        const date = new Date(log.created_at);
        const timeLabel = isNaN(date.getTime()) 
          ? log.created_at 
          : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true }).format(date);

        return (
          <div key={log.id} className="relative pl-6">
            <span className="absolute -left-1.5 top-1 flex h-3 w-3 items-center justify-center rounded-full bg-background ring-4 ring-background">
              {isLatest ? (
                <span className="h-2 w-2 rounded-full bg-accent" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-muted" />
              )}
            </span>

            <div className="flex flex-col gap-1">
              <div className="flex items-center flex-wrap gap-2 text-[13px]">
                <span className="font-semibold text-foreground">{log.action.replace(/_/g, ' ')}</span>
                <span className="text-muted">•</span>
                <span className="flex items-center gap-1 text-muted">
                  <User className="h-3 w-3" />
                  {log.performed_by_role}
                </span>
                <span className="text-muted">•</span>
                <span className="flex items-center gap-1 text-muted">
                  <Clock className="h-3 w-3" />
                  {timeLabel}
                </span>
              </div>

              {Object.keys(log.payload || {}).length > 0 && (
                <div className="mt-2 rounded-[var(--radius-sm)] bg-surface-muted p-3 text-[11px] font-mono text-muted overflow-x-auto">
                  <pre>{JSON.stringify(log.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
