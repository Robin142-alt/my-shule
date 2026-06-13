"use client";

import { Download, PieChart, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReportsWorkspace() {
  const teacherReports = [
    { id: "class-performance", title: "Class Performance Summary", desc: "Average scores across all your assigned subjects.", icon: PieChart },
    { id: "attendance-register", title: "Monthly Attendance Register", desc: "Downloadable attendance sheet for your homeroom class.", icon: FileText },
    { id: "student-behavior", title: "Student Behavior Log", desc: "A consolidated report of all anecdotal notes you have submitted.", icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Generate analytics and downloadable sheets for your classes.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teacherReports.map((report) => (
          <Card key={report.id} className="p-6 border border-slate-200 flex flex-col hover:shadow-sm transition-shadow">
            <div className="p-3 bg-slate-50 w-fit rounded-lg mb-4 border border-slate-100">
              <report.icon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-2">{report.title}</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">{report.desc}</p>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Download className="w-4 h-4" /> Download Report
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
