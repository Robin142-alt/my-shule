"use client";

import { useSchoolQuery } from "@/hooks/use-school-api";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, BookOpen, Clock, AlertCircle } from "lucide-react";

export function OverviewWorkspace() {
  // Pass the role to the dashboard endpoint to get teacher-specific layout
  const { data: dashboard, isLoading, error } = useSchoolQuery<any>("/api/dashboard/layout?role=teacher");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading teacher dashboard...
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-500 gap-4">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p>Failed to load dashboard overview.</p>
      </div>
    );
  }

  // Teacher specific widgets could be resolved here. We'll use static stubs
  // that represent standard teacher metrics while mapping to real data later if available.
  const todayClasses = 4;
  const pendingGrading = 2;
  const unreadMessages = 5;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Teacher Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Your daily schedule, pending tasks, and class insights.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Classes Today
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">{todayClasses}</span>
              <span className="text-sm font-medium text-slate-500">sessions</span>
            </div>
            <p className="text-xs text-slate-500">First class: Math at 8:00 AM (Form 1 East)</p>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Pending Grading
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-rose-600">{pendingGrading}</span>
              <span className="text-sm font-medium text-slate-500">assignments</span>
            </div>
            <p className="text-xs text-slate-500">Mid-Term Math Exam needs scores.</p>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Lesson Plans
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">Up to date</span>
            </div>
            <p className="text-xs text-slate-500">All lesson plans submitted for this week.</p>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-medium text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Today's Schedule
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Time</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Class</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap">08:00 AM - 08:40 AM</td>
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">Form 1 East</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">Mathematics</td>
                <td className="px-4 py-3 text-emerald-600 font-medium whitespace-nowrap">Completed</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors bg-blue-50/30">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap">09:20 AM - 10:00 AM</td>
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">Form 2 West</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">Mathematics</td>
                <td className="px-4 py-3 text-blue-600 font-medium flex items-center gap-1 whitespace-nowrap"><span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> In Progress</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap">11:20 AM - 12:00 PM</td>
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">Form 3 South</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">Physics</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">Upcoming</td>
              </tr>
              <tr className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 text-slate-900 whitespace-nowrap">02:00 PM - 02:40 PM</td>
                <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">Form 1 East</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">Physics</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">Upcoming</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
