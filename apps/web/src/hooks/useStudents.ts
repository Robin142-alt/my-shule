"use client";

import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { useStudentEvents } from "./useStudentEvents";
import type { Student, StudentGuardian } from "@/types/shared";

interface StudentFilters {
  class_id?: string;
  stream_id?: string;
  status?: string;
  search?: string;
}

export function useStudents(filters?: StudentFilters) {
  const queryParams = filters
    ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
    : "";

  useStudentEvents();

  return useSchoolQuery<Student[]>(`/api/students${queryParams}`);
}

export function useStudentProfile(studentId: string | null) {
  return useSchoolQuery<Student>(studentId ? `/api/students/${studentId}` : null);
}

export function useStudentGuardians(studentId: string | null) {
  return useSchoolQuery<StudentGuardian[]>(
    studentId ? `/api/students/${studentId}/guardians` : null
  );
}

export function useAdmitStudent() {
  return useSchoolMutation<Student, Omit<Student, "id" | "school_id">>("/api/students/admit");
}

export function useUpdateStudent(studentId: string) {
  return useSchoolMutation<Student, Partial<Student>>(
    `/api/students/${studentId}`,
    "PATCH"
  );
}
