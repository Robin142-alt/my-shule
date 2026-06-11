"use client";

import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SummaryCardState = "LOADING" | "ERROR" | "EMPTY" | "SUCCESS";

export interface WorkspaceSummaryCardProps {
  title: string;
  value?: string | number;
  subtext?: string;
  state: SummaryCardState;
  onRetry?: () => void;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export function WorkspaceSummaryCard({
  title,
  value,
  subtext,
  state,
  onRetry,
  onClick,
  icon,
}: WorkspaceSummaryCardProps) {
  return (
    <Card 
      className={`relative overflow-hidden p-5 transition-all ${
        onClick && state === "SUCCESS" ? "cursor-pointer hover:border-accent/40 hover:bg-accent/5" : ""
      }`}
      onClick={state === "SUCCESS" ? onClick : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-muted">{title}</p>
        {icon && <div className="text-muted/60">{icon}</div>}
      </div>

      <div className="mt-3 min-h-[3rem]">
        {state === "LOADING" && (
          <div className="flex items-center gap-2 text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading data...</span>
          </div>
        )}

        {state === "ERROR" && (
          <div className="flex flex-col items-start gap-2 text-rose-500">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Failed to load</span>
            </div>
            {onRetry && (
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onRetry(); }} className="h-7 px-2 text-xs text-rose-600 hover:bg-rose-50">
                Retry
              </Button>
            )}
          </div>
        )}

        {state === "EMPTY" && (
          <div className="text-sm font-medium text-muted">
            No data available
          </div>
        )}

        {state === "SUCCESS" && (
          <div>
            <h3 className="text-2xl font-black text-foreground">{value}</h3>
            {subtext && <p className="mt-1 text-xs font-medium text-muted">{subtext}</p>}
          </div>
        )}
      </div>
    </Card>
  );
}

export function WorkspaceSummaryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  );
}
