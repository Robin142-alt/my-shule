"use client";

import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { StudentDataService } from "@/lib/students/student-data-service";
import { useMemo } from "react";

export function useStudentDataService() {
  const eventBus = useDashboardEventBus();
  
  return useMemo(() => {
    return new StudentDataService(eventBus);
  }, [eventBus]);
}
