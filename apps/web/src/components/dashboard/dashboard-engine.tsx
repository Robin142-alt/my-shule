
"use client";

import React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { resolveDashboardActionHref } from "@/lib/dashboard/action-routes";
import type { ResolvedWidgetAction, ResolvedWidgetDefinition } from "@/lib/widget-registry/widget-registry";

export interface DashboardEngineProps {
  role: string;
}

type ActionButtonDto = {
  id: string;
  label: string;
  action: string;
  executionType?: 'ROUTE';
  href?: string;
  state: 'ACTIVE' | 'DEGRADED' | 'FAILED' | 'LOCKED';
};

type DashboardLayoutDto = {
  tenantId: string;
  role: string;
  widgets: ResolvedWidgetDefinition[];
  buttons: ActionButtonDto[];
};

export function DashboardEngine({ role }: DashboardEngineProps) {
  const { data, isLoading, error } = useSchoolQuery<DashboardLayoutDto>(`/dashboard/layout?role=${role}`);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Alert className="border-red-500/50 bg-red-500/10 text-red-500">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Widget Registry Failed</AlertTitle>
        <AlertDescription>
          Failed to load dashboard layout for role: {role}
        </AlertDescription>
      </Alert>
    );
  }

  const widgets = Array.isArray(data.widgets) ? data.widgets : [];
  const buttons = Array.isArray(data.buttons) ? data.buttons : [];
  const hasMalformedLayout = !Array.isArray(data.widgets) || !Array.isArray(data.buttons);

  return (
    <div className="space-y-6">
      {hasMalformedLayout ? (
        <Alert className="border-warning/40 bg-warning/10 text-warning">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Dashboard layout needs refresh</AlertTitle>
          <AlertDescription>
            This role is visible, but the live layout contract did not include a valid widget registry payload.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Quick Action Buttons governed by backend Button/Action Contract */}
      {buttons.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {buttons.map((btn) => {
            const href = btn.href ?? resolveDashboardActionHref(role, btn.action);

            if (btn.state === "ACTIVE" && href) {
              return (
                <Link
                  key={btn.id}
                  href={href}
                  className={buttonClasses({ variant: "default", size: "md" })}
                  aria-label={`${btn.label}: open ${btn.action} workspace`}
                >
                  {btn.label}
                </Link>
              );
            }

            return (
              <Button
                key={btn.id}
                disabled
                variant="secondary"
                className={btn.state === "FAILED" ? "bg-destructive text-white" : ""}
                title={btn.state === "LOCKED" ? "You do not have permission for this action." : "Action unavailable in the current workflow state."}
              >
                {btn.label}
                <AlertCircle className="w-4 h-4 ml-2 opacity-50" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Render Dynamic Widgets from Backend Registry */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map((widget) => (
          <WidgetRenderer key={widget.widgetId} widget={widget} />
        ))}
        {widgets.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/50 bg-white/5 rounded-xl border border-white/10">
            No widgets available for this role.
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: ResolvedWidgetDefinition }) {
  if (widget.stateConfig?.visibility === "DISABLED") {
    return null;
  }

  // Use defensive parsing since backend dto might differ from frontend exact type
  const state = widget.state || 'ACTIVE';
  const stateConfig = widget.stateConfig || { visibility: 'VISIBLE' };
  const actions = (widget.actions || []) as ResolvedWidgetAction[];

  return (
    <Card className={`relative overflow-hidden bg-white/5 border border-white/10 text-white ${state === 'DEGRADED' ? 'border-yellow-500/50' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          {widget.name}
          {state === 'DEGRADED' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
          {state === 'FAILED' && <AlertCircle className="w-5 h-5 text-destructive" />}
        </CardTitle>
        <CardDescription className="text-white/50">{widget.moduleSource?.toUpperCase()} MODULE</CardDescription>
      </CardHeader>
      <CardContent>
        {state === "LOADING" && (
          <div className="space-y-2 mt-4">
            <Skeleton className="h-4 w-full bg-white/10" />
            <Skeleton className="h-4 w-4/5 bg-white/10" />
          </div>
        )}
        
        {state === "FAILED" && (
          <Alert className="mt-4 bg-red-500/10 border-red-500/20 text-red-400">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Widget Failed</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              {widget.message || "Failed to load"}
              {stateConfig.retryable && (
                <Button variant="outline" size="sm" className="self-start mt-2 border-red-500/20 hover:bg-red-500/20">
                  <RotateCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {state === "EMPTY" && (
          <div className="py-6 mt-4 text-center text-white/50 bg-white/5 rounded-md border border-white/10 border-dashed">
            {widget.message || "No data available"}
          </div>
        )}

        {(state === "ACTIVE" || state === "DEGRADED") && (
          <div className="py-4">
            <p className="text-sm text-white/70">{state === 'DEGRADED' ? (widget.message || 'Showing fallback data') : 'Data rendering placeholder...'}</p>
          </div>
        )}

        {/* Render Actions */}
        {actions.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-white/10">
            {actions.map((action) => (
              <Button
                key={action.actionId}
                variant={action.state === "DEGRADED" ? "secondary" : "default"}
                size="sm"
                disabled={!action.enabled && action.state !== "FAILED"}
                className={action.state === "FAILED" ? "bg-destructive text-destructive-foreground" : ""}
              >
                {action.label}
                {action.state === "FAILED" && <AlertCircle className="w-3 h-3 ml-2" />}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
