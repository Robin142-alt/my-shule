import React from 'react';
import { StudentCommandCenter } from "@/components/student/student-command-center";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100">
      <StudentCommandCenter />
    </div>
  );
}
