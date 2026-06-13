"use client";

import { useState } from "react";
import { User, Bell, AlertTriangle, Wallet, GraduationCap, Calendar, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DashboardWorkspace() {
  const [activeChild, setActiveChild] = useState(0);

  const children = [
    { id: 1, name: "Alice Kamau", grade: "Form 1 East", photo: "AK", attendance: "98%", nextExam: "Mid-Term Math (June 15)", balance: "$0.00" },
    { id: 2, name: "Brian Kamau", grade: "Form 3 South", photo: "BK", attendance: "92%", nextExam: "Physics Practical (June 12)", balance: "$150.00", alert: "Outstanding Fee Balance" },
  ];

  const child = children[activeChild];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
            {child.photo}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{child.name}</h2>
            <p className="text-sm text-slate-500 font-medium">{child.grade}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children.length > 1 && (
            <select 
              className="h-9 px-3 text-sm rounded-md border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none focus:ring-1 focus:ring-blue-500"
              value={activeChild}
              onChange={(e) => setActiveChild(Number(e.target.value))}
            >
              {children.map((c, i) => (
                <option key={c.id} value={i}>Switch to {c.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {child.alert && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-amber-800">Attention Required</h4>
            <p className="text-sm text-amber-700 mt-1">{child.alert}. Please visit the finance section to clear this balance before exams begin.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Attendance</h3>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{child.attendance}</div>
          <p className="text-sm text-slate-500">Present this term</p>
        </Card>

        <Card className="p-6 border border-slate-200 hover:shadow-sm transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Next Assessment</h3>
          </div>
          <div className="text-lg font-bold text-slate-900 mb-1">{child.nextExam}</div>
          <p className="text-sm text-slate-500">Ensure preparation is ongoing</p>
        </Card>

        <Card className="p-6 border border-slate-200 hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Wallet className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-semibold text-slate-900">Fee Balance</h3>
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 mb-1">{child.balance}</div>
          <p className="text-sm text-slate-500">For the current term</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-500" />
              Recent Updates
            </h3>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600">View All</Button>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">Academic</span>
                <span className="text-xs text-slate-400">Yesterday</span>
              </div>
              <p className="text-sm text-slate-700 font-medium">{child.name} submitted their Science Project.</p>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700">Event</span>
                <span className="text-xs text-slate-400">Monday</span>
              </div>
              <p className="text-sm text-slate-700 font-medium">PTA Meeting scheduled for next week Friday.</p>
            </div>
          </div>
        </Card>

        <Card className="border border-slate-200 p-6 flex flex-col justify-center items-center text-center bg-gradient-to-b from-white to-slate-50/50">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Need to reach out?</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">Use the Messages tab to quickly send a direct message to {child.name}'s class teacher or the school administration.</p>
          <Button>Message Class Teacher</Button>
        </Card>
      </div>

    </div>
  );
}
