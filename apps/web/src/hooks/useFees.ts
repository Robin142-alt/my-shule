"use client";

import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import type { FeeAccount } from "@/types/shared";

interface FeeFilters {
  status?: string;
  class_id?: string;
}

export function useFees(studentId: string | null) {
  return useSchoolQuery<FeeAccount>(
    studentId ? `/api/students/${studentId}/fees` : null
  );
}

export function useAllFeeAccounts(filters?: FeeFilters) {
  const queryParams = filters
    ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
    : "";
  return useSchoolQuery<FeeAccount[]>(`/api/fees${queryParams}`);
}

export function useRecordPayment() {
  return useSchoolMutation<any, { student_id: string; amount: number; payment_method: string; ref_number: string }>(
    "/api/fees/payments"
  );
}

export function useFeeSummary() {
  return useSchoolQuery<{ total_expected: number; total_collected: number; total_arrears: number }>(
    "/api/fees/summary"
  );
}
