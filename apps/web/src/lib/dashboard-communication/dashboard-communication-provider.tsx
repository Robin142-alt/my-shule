"use client";

import React, { createContext, useContext, useState } from "react";
import {
  createDashboardCommunicationSystem,
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
}

const DashboardCommunicationContext = createContext<DashboardCommunicationContextValue | null>(null);

export function DashboardCommunicationProvider({ children }: { children: React.ReactNode }) {
  const [system] = useState(() => createDashboardCommunicationSystem());

  return (
    <DashboardCommunicationContext.Provider value={system}>
      {children}
    </DashboardCommunicationContext.Provider>
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
