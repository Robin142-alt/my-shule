"use client";

import { useState } from "react";
import { ClipboardList, Plus, AlertCircle, Star, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function StudentNotesWorkspace() {
  const [view, setView] = useState<"list" | "create">("list");

  const notes = [
    { id: 1, student: "David Mutua", type: "Behavioral", date: "2026-06-12", text: "Disrupting the class during Physics practicals. Needs to be seated at the front.", severity: "Warning" },
    { id: 2, student: "Alice Kamau", type: "Academic", date: "2026-06-10", text: "Excellent participation in Mathematics today. Helped explain concepts to peers.", severity: "Positive" },
    { id: 3, student: "Brian Ochieng", type: "General", date: "2026-06-08", text: "Seems very tired lately, falling asleep in morning classes. Should check with school nurse.", severity: "Info" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Student Notes & Anecdotals</h2>
          <p className="text-sm text-slate-500 mt-1">Log behavioral, academic, and general observations for your students.</p>
        </div>
        {view === "list" && (
          <Button onClick={() => setView("create")} className="gap-2">
            <Plus className="w-4 h-4" /> Add Note
          </Button>
        )}
      </div>

      {view === "list" ? (
        <Card className="border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input type="text" placeholder="Search by student name..." className="w-full h-9 pl-9 pr-3 rounded-md bg-white border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Student</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Observation Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notes.map(note => (
                <tr key={note.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-slate-900 whitespace-nowrap">{note.student}</td>
                  <td className="px-4 py-4 text-slate-500 whitespace-nowrap">{note.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                      ${note.severity === 'Positive' ? 'bg-emerald-50 text-emerald-700' : 
                        note.severity === 'Warning' ? 'bg-rose-50 text-rose-700' : 
                        'bg-blue-50 text-blue-700'}`}>
                      {note.severity === 'Positive' && <Star className="w-3 h-3" />}
                      {note.severity === 'Warning' && <AlertCircle className="w-3 h-3" />}
                      {note.severity === 'Info' && <ClipboardList className="w-3 h-3" />}
                      {note.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-700 max-w-md">{note.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-6 border border-slate-200">
          <h3 className="font-medium text-slate-900 mb-6">Log New Observation</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Select Student</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
                <option>David Mutua (Form 1 East)</option>
                <option>Alice Kamau (Form 1 East)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Note Category</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
                <option>Behavioral (Disciplinary)</option>
                <option>Academic (Commendation)</option>
                <option>General Observation</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Observation Details</label>
              <textarea placeholder="Describe what happened or what you observed..." className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"/>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
            <Button onClick={() => setView("list")}>Save Note</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
