"use client";

import { useState } from "react";
import { FileText, Download, PieChart, TrendingUp, Users, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery } from "@/hooks/use-school-api";

export function ReportsWorkspace() {
  const [activeCategory, setActiveCategory] = useState<"all" | "students" | "finance" | "academics">("all");

  const { data: reportsList, isLoading } = useSchoolQuery<any[]>("/api/admin-command/principal/reports");

  const standardReports = [
    { id: "demographics", title: "Enrollment & Demographics", desc: "Detailed breakdown of students by age, gender, and class.", icon: Users, category: "students" },
    { id: "attendance", title: "Monthly Attendance Summary", desc: "Aggregated absence rates across all grades.", icon: PieChart, category: "students" },
    { id: "fee-balances", title: "Outstanding Fee Balances", desc: "List of students with pending invoices for the current term.", icon: Banknote, category: "finance" },
    { id: "collections", title: "Revenue Collections", desc: "Daily/weekly payment mix and total collections.", icon: TrendingUp, category: "finance" },
    { id: "exam-mastersheet", title: "Term Exam Mastersheet", desc: "Comprehensive score matrix across all subjects and classes.", icon: FileText, category: "academics" },
    { id: "teacher-loads", title: "Teacher Workloads", desc: "Assigned lessons and subjects per staff member.", icon: Users, category: "academics" },
  ];

  const handleDownload = async (reportId: string) => {
    // In reality, this would fetch a blob and trigger browser download
    alert(`Generating report: ${reportId}. The download will begin shortly.`);
  };

  const filteredReports = activeCategory === "all" ? standardReports : standardReports.filter(r => r.category === activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Reports Center</h2>
          <p className="text-sm text-slate-500 mt-1">Generate and download operational reports for your school.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeCategory === "all" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          All Reports
        </button>
        <button
          onClick={() => setActiveCategory("students")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeCategory === "students" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Students
        </button>
        <button
          onClick={() => setActiveCategory("finance")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeCategory === "finance" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Banknote className="w-4 h-4" />
          Finance
        </button>
        <button
          onClick={() => setActiveCategory("academics")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeCategory === "academics" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Academics
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id} className="p-6 border border-slate-200 flex flex-col h-full hover:border-slate-300 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-slate-50 rounded-md">
                <report.icon className="w-5 h-5 text-slate-700" />
              </div>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{report.category}</span>
            </div>
            <h3 className="font-medium text-slate-900 mb-2">{report.title}</h3>
            <p className="text-sm text-slate-500 mb-6 flex-1">{report.desc}</p>
            <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
              <Button variant="default" size="sm" className="w-full gap-2" onClick={() => handleDownload(report.id)}>
                <Download className="w-4 h-4" /> Generate PDF
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => handleDownload(report.id + "_csv")}>
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Generated Reports List (from Backend) */}
      <div className="pt-8">
        <h3 className="text-lg font-medium text-slate-900 mb-4">Recent Custom Reports</h3>
        <Card className="border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Report Name</th>
                <th className="px-4 py-3 font-medium">Requested By</th>
                <th className="px-4 py-3 font-medium">Generated At</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading recent reports...</td></tr>
              ) : reportsList?.length === 0 || !reportsList ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No custom reports generated recently.</td></tr>
              ) : (
                reportsList?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {r.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{r.requested_by}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-8">Download</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
