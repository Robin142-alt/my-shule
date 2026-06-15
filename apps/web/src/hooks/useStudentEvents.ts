"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

const STUDENT_EVENTS = [
  "STUDENT_ADMITTED",
  "STUDENT_UPDATED",
  "STUDENT_ENROLLED",
  "STUDENT_CLASS_PLACED",
  "STUDENT_PROMOTED",
  "STUDENT_STATUS_CHANGED",
] as const;

export function useStudentEvents() {
  const queryClient = useQueryClient();
  const eventBus = useDashboardEventBus();

  useEffect(() => {
    if (!eventBus) return;

    const tenantId = getCurrentSchoolId();

    const unsubscribeFunctions = STUDENT_EVENTS.map((eventType) => {
      return eventBus.subscribe(eventType, (event) => {
        // Invalidate all student queries so dashboards auto-refresh
        queryClient.invalidateQueries({ queryKey: ["school", tenantId] });
      });
    });

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, [eventBus, queryClient]);
}
