"use client";

import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import type { DisciplineCase } from "@/types/shared";

interface DisciplineFilters {
  status?: string;
  student_id?: string;
}

export function useDiscipline(studentId: string | null) {
  return useSchoolQuery<DisciplineCase[]>(
    studentId ? `/api/students/${studentId}/discipline` : null
  );
}

export function useAllDisciplineCases(filters?: DisciplineFilters) {
  const queryParams = filters
    ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
    : "";
  return useSchoolQuery<DisciplineCase[]>(`/api/discipline${queryParams}`);
}

export function useReportDisciplineCase() {
  return useSchoolMutation<DisciplineCase, Omit<DisciplineCase, "id" | "school_id">>(
    "/api/discipline/cases"
  );
}

export function useUpdateDisciplineCase(caseId: string) {
  return useSchoolMutation<DisciplineCase, Partial<DisciplineCase>>(
    `/api/discipline/cases/${caseId}`,
    "PATCH"
  );
}
