"use client";

import dynamic from 'next/dynamic';

// Load the shared library only when an academic dashboard opens Exam Analytics.
export const ExamAnalyticsWorkspace = dynamic(
  () => import('./exams-manager/exam-analytics-workspace').then(module => module.ExamAnalyticsWorkspace),
  { loading: () => <p role="status" className="p-6 text-muted">Loading Exam Analytics…</p> },
);
