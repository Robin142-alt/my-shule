"use client";

import { useState } from "react";
import { Fingerprint, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TeacherAttendanceWorkspace() {
  const [checkedIn, setCheckedIn] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const history = [
    { date: "Yesterday", status: "Present", time: "07:45 AM" },
    { date: "Wednesday", status: "Present", time: "07:50 AM" },
    { date: "Tuesday", status: "Absent", time: "-" },
    { date: "Monday", status: "Present", time: "07:40 AM" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Attendance</h2>
          <p className="text-sm text-slate-500 mt-1">Clock in for the day and view your attendance history.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 border border-slate-200 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
            <Fingerprint className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">Daily Check-In</h3>
          <p className="text-sm text-slate-500 mb-8">Current Time: <span className="font-medium text-slate-900">{currentTime}</span></p>
          
          {checkedIn ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="font-medium text-emerald-700">You are checked in for today.</p>
              <p className="text-xs text-slate-500 mt-1">Clocked in at {currentTime}</p>
            </div>
          ) : (
            <Button size="lg" className="w-full max-w-xs" onClick={() => setCheckedIn(true)}>
              Clock In Now
            </Button>
          )}
        </Card>

        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Recent History
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((record, i) => (
              <div key={i} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">{record.date}</div>
                  <div className="text-xs text-slate-500">Clock in: {record.time}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                  ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
