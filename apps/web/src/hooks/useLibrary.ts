"use client";

import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import type { LibraryLoan } from "@/types/shared";

interface LibraryFilters {
  status?: string;
  student_id?: string;
}

export function useLibraryLoans(studentId: string | null) {
  return useSchoolQuery<LibraryLoan[]>(
    studentId ? `/api/students/${studentId}/library` : null
  );
}

export function useAllLibraryLoans(filters?: LibraryFilters) {
  const queryParams = filters
    ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
    : "";
  return useSchoolQuery<LibraryLoan[]>(`/api/library/loans${queryParams}`);
}

export function useIssueBook() {
  return useSchoolMutation<LibraryLoan, Omit<LibraryLoan, "id" | "school_id">>(
    "/api/library/issue"
  );
}

export function useReturnBook(loanId: string) {
  return useSchoolMutation<LibraryLoan, { return_date: string; status: "RETURNED" }>(
    `/api/library/loans/${loanId}`,
    "PATCH"
  );
}
