"use client";

import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import type { AttendanceRecord } from "@/types/shared";

interface AttendanceFilters {
  date?: string;
  class_id?: string;
}

export function useAttendance(studentId: string | null) {
  return useSchoolQuery<AttendanceRecord[]>(
    studentId ? `/api/students/${studentId}/attendance` : null
  );
}

export function useClassAttendance(filters?: AttendanceFilters) {
  const queryParams = filters
    ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
    : "";
  return useSchoolQuery<AttendanceRecord[]>(`/api/attendance${queryParams}`);
}

export function useMarkAttendance() {
  return useSchoolMutation<any, { records: Omit<AttendanceRecord, "id" | "school_id">[] }>(
    "/api/attendance/mark"
  );
}
