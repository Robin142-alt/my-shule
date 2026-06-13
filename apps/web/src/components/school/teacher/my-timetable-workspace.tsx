"use client";

import { Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function MyTimetableWorkspace() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const periods = [
    { time: "08:00 - 08:40", name: "Period 1" },
    { time: "08:40 - 09:20", name: "Period 2" },
    { time: "09:20 - 10:00", name: "Period 3" },
    { time: "10:00 - 10:30", name: "Break", isBreak: true },
    { time: "10:30 - 11:10", name: "Period 4" },
    { time: "11:10 - 11:50", name: "Period 5" },
    { time: "11:50 - 12:30", name: "Period 6" },
    { time: "12:30 - 01:30", name: "Lunch", isBreak: true },
    { time: "01:30 - 02:10", name: "Period 7" },
    { time: "02:10 - 02:50", name: "Period 8" },
  ];

  // Dummy timetable data mapped by [Day][PeriodIndex]
  const schedule: Record<string, Record<number, any>> = {
    "Monday": {
      0: { subject: "Math", class: "F1 East", room: "Room 12" },
      1: { subject: "Math", class: "F2 West", room: "Room 14" },
      5: { subject: "Physics", class: "F3 South", room: "Lab 1" },
    },
    "Tuesday": {
      4: { subject: "Math", class: "F1 East", room: "Room 12" },
      6: { subject: "Physics", class: "F1 East", room: "Lab 2" },
    },
    "Wednesday": {
      1: { subject: "Physics", class: "F3 South", room: "Lab 1" },
      2: { subject: "Math", class: "F2 West", room: "Room 14" },
      8: { subject: "Physics", class: "F1 East", room: "Room 12" },
    },
    "Thursday": {
      0: { subject: "Math", class: "F2 West", room: "Room 14" },
      5: { subject: "Math", class: "F1 East", room: "Room 12" },
      9: { subject: "Physics", class: "F3 South", room: "Lab 1" },
    },
    "Friday": {
      2: { subject: "Physics", class: "F1 East", room: "Lab 2" },
      4: { subject: "Math", class: "F2 West", room: "Room 14" },
      8: { subject: "Physics", class: "F3 South", room: "Lab 1" },
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Timetable</h2>
          <p className="text-sm text-slate-500 mt-1">Your weekly master schedule.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 gap-1"><ChevronLeft className="w-4 h-4"/> Prev Week</Button>
          <Button variant="outline" size="sm" className="h-9 gap-2"><CalendarIcon className="w-4 h-4"/> This Week</Button>
          <Button variant="outline" size="sm" className="h-9 gap-1">Next Week <ChevronRight className="w-4 h-4"/></Button>
        </div>
      </div>

      <Card className="border border-slate-200 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-6 border-b border-slate-200 bg-slate-50">
            <div className="p-4 border-r border-slate-200 font-medium text-slate-500 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Time
            </div>
            {days.map(day => (
              <div key={day} className="p-4 border-r last:border-0 border-slate-200 font-medium text-slate-900 text-center">
                {day}
              </div>
            ))}
          </div>

          <div className="divide-y divide-slate-200">
            {periods.map((period, pIndex) => (
              <div key={pIndex} className={`grid grid-cols-6 ${period.isBreak ? 'bg-slate-50/80' : ''}`}>
                <div className="p-3 border-r border-slate-200 flex flex-col justify-center text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{period.name}</span>
                  <span>{period.time}</span>
                </div>
                
                {period.isBreak ? (
                  <div className="col-span-5 p-3 flex items-center justify-center text-slate-400 text-sm font-medium tracking-widest uppercase">
                    {period.name}
                  </div>
                ) : (
                  days.map(day => {
                    const session = schedule[day]?.[pIndex];
                    return (
                      <div key={`${day}-${pIndex}`} className="p-2 border-r last:border-0 border-slate-200">
                        {session ? (
                          <div className={`h-full rounded-md p-2 border ${
                            session.subject === 'Math' ? 'bg-blue-50 border-blue-100' : 'bg-purple-50 border-purple-100'
                          }`}>
                            <div className={`text-xs font-semibold ${session.subject === 'Math' ? 'text-blue-900' : 'text-purple-900'}`}>
                              {session.subject}
                            </div>
                            <div className={`text-xs mt-1 ${session.subject === 'Math' ? 'text-blue-700' : 'text-purple-700'}`}>
                              {session.class}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                              <span>📍 {session.room}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-full w-full min-h-[80px]"></div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
