"use client";

import { useSchoolQuery } from "@/lib/data/school-hooks";

// --- API Contracts / Types ---

export interface LinkedChild {
  id: string;
  name: string;
  admissionNumber: string;
  gradeForm: string;
  stream: string;
  school: string;
  status: string;
}

export interface ReportCard {
  id: string;
  childId: string;
  childName: string;
  exam: string;
  term: string;
  year: string;
  gradeForm: string;
  reportType: string;
  publishedDate: string;
  viewedStatus: string;
  acknowledged: boolean;
  summary: string;
}

export interface FeeRecord {
  id: string;
  date: string;
  amount: string;
  method: string;
  reference: string;
  status: string;
}

// --- Hooks for Parents/Students ---

export function usePortalLinkedChildren() {
  // If backend route is missing, it will return 404, caught by DataErrorState.
  return useSchoolQuery<LinkedChild[]>("/api/portals/parent/children");
}

export function usePortalReportCards(studentId?: string) {
  return useSchoolQuery<ReportCard[]>(
    `/api/portals/reports${studentId ? `?studentId=${studentId}` : ""}`,
    { enabled: studentId !== undefined }
  );
}

export function usePortalFeeHistory(studentId?: string) {
  return useSchoolQuery<FeeRecord[]>(
    `/api/portals/fees/history${studentId ? `?studentId=${studentId}` : ""}`
  );
}

