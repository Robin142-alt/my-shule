"use client";

import { useState } from "react";
import { BookOpen, Plus, FileText, CheckCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function LessonPlansWorkspace() {
  const [view, setView] = useState<"list" | "create">("list");

  const plans = [
    { id: 1, subject: "Mathematics", class: "Form 1 East", topic: "Algebraic Expressions", week: "Week 3", status: "Approved" },
    { id: 2, subject: "Mathematics", class: "Form 2 West", topic: "Quadratic Equations", week: "Week 3", status: "Pending Review" },
    { id: 3, subject: "Physics", class: "Form 3 South", topic: "Newton's Laws of Motion", week: "Week 3", status: "Draft" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Lesson Plans</h2>
          <p className="text-sm text-slate-500 mt-1">Draft, submit, and manage your weekly lesson plans.</p>
        </div>
        {view === "list" && (
          <Button onClick={() => setView("create")} className="gap-2">
            <Plus className="w-4 h-4" /> New Lesson Plan
          </Button>
        )}
      </div>

      {view === "list" ? (
        <Card className="border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Subject & Class</th>
                <th className="px-4 py-3 font-medium">Topic / Unit</th>
                <th className="px-4 py-3 font-medium">Week</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {plans.map(plan => (
                <tr key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{plan.subject}</div>
                    <div className="text-xs text-slate-500">{plan.class}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{plan.topic}</td>
                  <td className="px-4 py-3 text-slate-500">{plan.week}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                      ${plan.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 
                        plan.status === 'Draft' ? 'bg-slate-100 text-slate-700' : 
                        'bg-blue-50 text-blue-700'}`}>
                      {plan.status === 'Approved' && <CheckCircle className="w-3 h-3" />}
                      {plan.status === 'Pending Review' && <Clock className="w-3 h-3" />}
                      {plan.status === 'Draft' && <FileText className="w-3 h-3" />}
                      {plan.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm">View</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-6 border border-slate-200">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-slate-500" />
            Drafting New Plan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Class & Subject</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
                <option>Form 1 East - Mathematics</option>
                <option>Form 2 West - Mathematics</option>
                <option>Form 3 South - Physics</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Week / Period</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
                <option>Term 2 - Week 3</option>
                <option>Term 2 - Week 4</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Topic Title</label>
              <input type="text" placeholder="e.g. Introduction to Linear Equations" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm"/>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Objectives & Activities</label>
              <textarea placeholder="Outline the learning objectives, teaching methods, and student activities..." className="flex min-h-[150px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
            <Button variant="secondary">Save Draft</Button>
            <Button onClick={() => setView("list")}>Submit for Approval</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
