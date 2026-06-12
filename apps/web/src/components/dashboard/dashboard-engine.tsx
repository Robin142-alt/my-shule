// @ts-nocheck
"use client";

import React, { useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  createWidgetRegistry, 
  resolveRegisteredWidgets, 
  resolveWidgetActions,
  type ResolvedWidgetDefinition,
  type WidgetRegistry
} from "@/lib/widget-registry/widget-registry";

// For demo purposes, we will load a static registry. In production, this might come from the API.
const demoRegistry: WidgetRegistry = {
  version: "2026.06",
  widgets: [
    {
      widgetId: "finance.feeStatus",
      name: "Fee Collection Status",
      moduleSource: "finance",
      tenantScope: "TENANT",
      rolesAllowed: ["principal", "accountant"],
      capabilitiesRequired: ["finance:read"],
      lifecycleState: "ACTIVE",
      eventSubscriptions: ["fee.paid"],
      dataContract: { inputSchema: {}, outputSchema: {} },
      uiSchema: { type: "widget", layout: "card", renderMode: "LIVE" },
      states: {
        ACTIVE: { label: "Active", visibility: "VISIBLE" },
        EMPTY: { label: "Empty", visibility: "VISIBLE", message: "No data" },
        LOCKED: { label: "Locked", visibility: "DISABLED", message: "Capability required" },
        DEGRADED: { label: "Degraded", visibility: "READONLY", message: "Showing fallback data", retryable: true },
        FAILED: { label: "Failed", visibility: "VISIBLE", message: "Retry available", retryable: true },
        LOADING: { label: "Loading", visibility: "VISIBLE", message: "Loading latest data", retryable: false },
      },
      actions: [
        {
          actionId: "view-ledger",
          label: "View Ledger",
          type: "NAVIGATE",
          capabilityRequired: "finance:read",
          handler: { type: "EVENT_BUS", target: "finance.ledger.opened" },
          failurePolicy: "DEGRADE",
        }
      ]
    },
    {
      widgetId: "exams.pendingReviews",
      name: "Pending Exam Reviews",
      moduleSource: "exams",
      tenantScope: "TENANT",
      rolesAllowed: ["dean-academics", "principal", "exams-manager"],
      capabilitiesRequired: ["exams:read"],
      lifecycleState: "ACTIVE",
      eventSubscriptions: ["exam.submitted"],
      dataContract: { inputSchema: {}, outputSchema: {} },
      uiSchema: { type: "widget", layout: "table", renderMode: "LIVE" },
      states: {
        ACTIVE: { label: "Active", visibility: "VISIBLE" },
        EMPTY: { label: "Empty", visibility: "VISIBLE", message: "No exams pending" },
        LOCKED: { label: "Locked", visibility: "DISABLED", message: "Capability required" },
        DEGRADED: { label: "Degraded", visibility: "READONLY", message: "Showing fallback data", retryable: true },
        FAILED: { label: "Failed", visibility: "VISIBLE", message: "Retry available", retryable: true },
        LOADING: { label: "Loading", visibility: "VISIBLE", message: "Loading latest data", retryable: false },
      },
      actions: [
        {
          actionId: "approve-all",
          label: "Approve All",
          type: "APPROVE",
          capabilityRequired: "exams:review",
          handler: { type: "API", target: "/api/exams/approve-all" },
          failurePolicy: "ESCALATE",
        }
      ]
    }
  ]
};

export interface DashboardEngineProps {
  role: string;
  moduleEntitlements?: Record<string, boolean>;
  rolePermissions?: string[];
  runtimeStates?: Record<string, any>;
}

export function DashboardEngine({
  role,
  moduleEntitlements = { finance: true, exams: true },
  rolePermissions = ["finance:read", "exams:read", "exams:review"],
  runtimeStates = {}
}: DashboardEngineProps) {
  
  // Resolve widgets through AGP Capability Engine
  const resolvedWidgets = useMemo(() => {
    return resolveRegisteredWidgets({
      registry: createWidgetRegistry(demoRegistry),
      moduleEntitlements,
      rolePermissions,
      dataAvailability: {
        "finance.feeStatus": true,
        "exams.pendingReviews": true,
      },
      runtimeStates,
      role,
    });
  }, [role, moduleEntitlements, rolePermissions, runtimeStates]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {resolvedWidgets.map((widget) => (
        <WidgetRenderer key={widget.widgetId} widget={widget} rolePermissions={rolePermissions} />
      ))}
    </div>
  );
}

function WidgetRenderer({ widget, rolePermissions }: { widget: ResolvedWidgetDefinition; rolePermissions: string[] }) {
  if (widget.stateConfig.visibility === "DISABLED") {
    return null;
  }

  const actions = resolveWidgetActions(widget, { rolePermissions });

  return (
    <Card className={`relative overflow-hidden ${widget.state === 'DEGRADED' ? 'border-yellow-500' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          {widget.name}
          {widget.state === 'DEGRADED' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
          {widget.state === 'FAILED' && <AlertCircle className="w-5 h-5 text-destructive" />}
        </CardTitle>
        <CardDescription>{widget.moduleSource.toUpperCase()} MODULE</CardDescription>
      </CardHeader>
      <CardContent>
        {widget.state === "LOADING" && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        )}
        
        {widget.state === "FAILED" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Widget Failed</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              {widget.message}
              {widget.stateConfig.retryable && (
                <Button variant="outline" size="sm" className="ml-2 h-7 px-2">
                  <RotateCw className="w-3 h-3 mr-1" /> Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {widget.state === "EMPTY" && (
          <div className="py-6 text-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
            {widget.message}
          </div>
        )}

        {(widget.state === "ACTIVE" || widget.state === "DEGRADED") && (
          <div className="py-4">
            <p className="text-sm text-muted-foreground">{widget.state === 'DEGRADED' ? widget.message : 'Data rendering placeholder...'}</p>
          </div>
        )}

        {/* Render Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.actionId}
              variant={action.state === "DEGRADED" ? "secondary" : "default"}
              size="sm"
              disabled={!action.enabled}
              className={action.state === "FAILED" ? "bg-destructive text-destructive-foreground" : ""}
            >
              {action.label}
              {action.state === "FAILED" && <AlertCircle className="w-3 h-3 ml-2" />}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
