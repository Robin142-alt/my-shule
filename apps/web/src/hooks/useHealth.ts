"use client";

import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import type { HealthVisit } from "@/types/shared";

interface HealthFilters {
  student_id?: string;
  date?: string;
}

export function useHealth(studentId: string | null) {
  return useSchoolQuery<HealthVisit[]>(
    studentId ? `/api/students/${studentId}/health` : null
  );
}

export function useAllHealthVisits(filters?: HealthFilters) {
  const queryParams = filters
    ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
    : "";
  return useSchoolQuery<HealthVisit[]>(`/api/health${queryParams}`);
}

export function useRecordHealthVisit() {
  return useSchoolMutation<HealthVisit, Omit<HealthVisit, "id" | "school_id">>(
    "/api/health/visits"
  );
}
