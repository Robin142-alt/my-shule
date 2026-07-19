"use client";

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  publishSchoolDataUpdate,
  subscribeToSchoolDataUpdates,
} from "@/lib/school/school-operational-store";
import {
  createDashboardCommunicationSystem,
  type DashboardEvent,
  type DashboardEventBus,
  type WidgetStateStore,
  type ModuleOutputRegistry,
  type NotificationChannelLayer,
} from "./dashboard-communication-system";

export interface DashboardCommunicationContextValue {
  eventBus: DashboardEventBus;
  widgetStateStore: WidgetStateStore;
  moduleOutputRegistry: ModuleOutputRegistry;
  notificationChannel: NotificationChannelLayer;
  registerWidgetSubscriber: ReturnType<typeof createDashboardCommunicationSystem>["registerWidgetSubscriber"];
  refreshVersion: number;
}

const DashboardCommunicationContext = createContext<DashboardCommunicationContextValue | null>(null);

interface DashboardRealtimeSnapshot {
  tenant_id: string;
  events: DashboardEvent[];
}

export function DashboardCommunicationProvider({
  children,
  tenantId,
}: {
  children: React.ReactNode;
  tenantId: string;
}) {
  const queryClient = useQueryClient();
  const normalizedTenantId = tenantId.trim();
  const seenEventIds = useRef(new Set<string>());
  const [refreshVersion, setRefreshVersion] = useState(0);
  const system = useMemo(
    () => createDashboardCommunicationSystem({ tenantId: normalizedTenantId }),
    [normalizedTenantId],
  );
  const contextValue = useMemo(
    () => ({ ...system, refreshVersion }),
    [refreshVersion, system],
  );

  useEffect(() => {
    seenEventIds.current.clear();
  }, [normalizedTenantId]);

  useEffect(() => {
    if (!normalizedTenantId) {
      return;
    }

    const refreshTenantQueries = () => {
      void queryClient.invalidateQueries({
        predicate: (query) => isTenantQueryKey(query.queryKey, normalizedTenantId),
      });
      setRefreshVersion((current) => current + 1);
    };

    const unsubscribeFromLocalUpdates = subscribeToSchoolDataUpdates((detail) => {
      if (detail.schoolId === normalizedTenantId) {
        refreshTenantQueries();
      }
    });

    if (typeof EventSource === "undefined") {
      return unsubscribeFromLocalUpdates;
    }

    const source = new EventSource(
      `/api/events/dashboard/stream?tenantSlug=${encodeURIComponent(normalizedTenantId)}`,
      { withCredentials: true },
    );
    const handleSnapshot = (rawEvent: Event) => {
      try {
        const snapshot = JSON.parse((rawEvent as MessageEvent<string>).data) as DashboardRealtimeSnapshot;

        if (snapshot.tenant_id !== normalizedTenantId || !Array.isArray(snapshot.events)) {
          return;
        }

        let acceptedEvents = 0;
        for (const event of snapshot.events) {
          if (
            event.tenantId !== normalizedTenantId
            || !event.id
            || seenEventIds.current.has(event.id)
          ) {
            continue;
          }

          seenEventIds.current.add(event.id);
          if (seenEventIds.current.size > 1000) {
            const oldestEventId = seenEventIds.current.values().next().value as string | undefined;
            if (oldestEventId) {
              seenEventIds.current.delete(oldestEventId);
            }
          }

          if (system.eventBus.emit(event)) {
            acceptedEvents += 1;
            if (event.notification) {
              system.notificationChannel.publish(event.notification);
            }
          }
        }

        if (acceptedEvents > 0) {
          publishSchoolDataUpdate(normalizedTenantId, "dashboard-realtime");
        }
      } catch {
        // EventSource reconnects automatically; malformed frames must not affect the workspace.
      }
    };

    source.addEventListener("dashboard.events", handleSnapshot);

    return () => {
      source.removeEventListener("dashboard.events", handleSnapshot);
      source.close();
      unsubscribeFromLocalUpdates();
    };
  }, [normalizedTenantId, queryClient, system]);

  return (
    <DashboardCommunicationContext.Provider value={contextValue}>
      {children}
    </DashboardCommunicationContext.Provider>
  );
}

export function DashboardCommunicationBoundary({
  children,
  tenantId,
}: {
  children: React.ReactNode;
  tenantId: string;
}) {
  const existingContext = useContext(DashboardCommunicationContext);

  if (existingContext) {
    return <>{children}</>;
  }

  return (
    <DashboardCommunicationProvider tenantId={tenantId}>
      {children}
    </DashboardCommunicationProvider>
  );
}

export function useDashboardCommunication() {
  const context = useContext(DashboardCommunicationContext);
  if (!context) {
    throw new Error("useDashboardCommunication must be used within a DashboardCommunicationProvider");
  }
  return context;
}

export function useDashboardEventBus() {
  const { eventBus } = useDashboardCommunication();
  return eventBus;
}

export function useDashboardRefreshVersion() {
  return useDashboardCommunication().refreshVersion;
}

export function isTenantQueryKey(queryKey: QueryKey, tenantId: string) {
  if (queryKey[0] === "school") {
    return queryKey[1] === tenantId;
  }

  return queryKey.some((segment) => {
    if (segment === tenantId) {
      return true;
    }

    if (segment && typeof segment === "object" && !Array.isArray(segment)) {
      const record = segment as Record<string, unknown>;
      return record.tenantId === tenantId
        || record.schoolId === tenantId
        || record.school_id === tenantId
        || record.tenantSlug === tenantId;
    }

    return false;
  });
}
