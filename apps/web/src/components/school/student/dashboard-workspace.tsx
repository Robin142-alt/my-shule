"use client";

import { Clock, BookOpen, Calendar, Bell, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DashboardWorkspace() {
  const scheduleToday = [
    { time: "08:00 AM", subject: "Mathematics", teacher: "Mr. J. Kamau", room: "Room 14", status: "Completed" },
    { time: "09:30 AM", subject: "Physics", teacher: "Mrs. N. Wanjiru", room: "Science Lab", status: "In Progress" },
    { time: "11:00 AM", subject: "English", teacher: "Mr. D. Ochieng", room: "Room 12", status: "Upcoming" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between shadow-md">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Welcome back, Alice!</h2>
          <p className="text-blue-100 max-w-md">You have 2 upcoming assignments due this week and your next class (Physics) is currently in progress.</p>
        </div>
        <div className="mt-6 md:mt-0 bg-white/20 p-4 rounded-xl backdrop-blur-sm border border-white/20 text-center min-w-[150px]">
          <div className="text-sm font-medium text-blue-50 mb-1">Form 1 East</div>
          <div className="text-3xl font-bold">Term 2</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Today's Schedule
            </h3>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600">Full Timetable</Button>
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {scheduleToday.map((period, i) => (
              <div key={i} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="text-sm font-medium text-slate-500 w-20 shrink-0">{period.time}</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{period.subject}</h4>
                  <p className="text-xs text-slate-500">{period.teacher} • {period.room}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide
                  ${period.status === 'Completed' ? 'bg-slate-100 text-slate-500' : 
                    period.status === 'In Progress' ? 'bg-emerald-100 text-emerald-700 animate-pulse' : 
                    'bg-blue-50 text-blue-700'}`}>
                  {period.status}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-purple-600" />
                Active Homework
              </h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="border border-slate-100 rounded-lg p-3 hover:border-slate-300 transition-colors cursor-pointer">
                <h4 className="font-medium text-slate-900 text-sm">Algebra Worksheet</h4>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Due Tomorrow</span>
                  <span className="text-xs text-slate-500">Mathematics</span>
                </div>
              </div>
              <div className="border border-slate-100 rounded-lg p-3 hover:border-slate-300 transition-colors cursor-pointer">
                <h4 className="font-medium text-slate-900 text-sm">Physics Lab Report</h4>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Due Friday</span>
                  <span className="text-xs text-slate-500">Physics</span>
                </div>
              </div>
              <Button variant="outline" className="w-full text-xs" size="sm">View All Assignments</Button>
            </div>
          </Card>

          <Card className="border border-slate-200 p-4 bg-gradient-to-br from-amber-50 to-orange-50/50">
            <h3 className="font-semibold text-amber-900 flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-amber-600" />
              Next Exam
            </h3>
            <p className="text-sm font-medium text-amber-800">Mid-Term Mathematics</p>
            <p className="text-xs text-amber-700/80 mt-1 mb-3">June 15, 2026 • 08:00 AM</p>
            <Button variant="secondary" size="sm" className="w-full bg-white text-amber-700 hover:bg-amber-100 border-amber-200">
              Download Syllabus Guide
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
