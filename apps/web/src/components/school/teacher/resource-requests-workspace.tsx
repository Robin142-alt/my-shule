"use client";

import { useState } from "react";
import { Package, Plus, Clock, CheckCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ResourceRequestsWorkspace() {
  const [view, setView] = useState<"list" | "create">("list");

  const requests = [
    { id: 1, type: "Lab Equipment", item: "Litmus Paper & Beakers", date: "2026-06-12", status: "Approved" },
    { id: 2, type: "Stationery", item: "Whiteboard Markers (Box of 12)", date: "2026-06-10", status: "Pending" },
    { id: 3, type: "IT Support", item: "Projector not connecting to laptop in Room 14", date: "2026-06-08", status: "Resolved" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Resource Requests</h2>
          <p className="text-sm text-slate-500 mt-1">Request lab materials, stationery, or IT support from administration.</p>
        </div>
        {view === "list" && (
          <Button onClick={() => setView("create")} className="gap-2">
            <Plus className="w-4 h-4" /> New Request
          </Button>
        )}
      </div>

      {view === "list" ? (
        <Card className="border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Request Type</th>
                <th className="px-4 py-3 font-medium">Item / Description</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{req.type}</td>
                  <td className="px-4 py-3 text-slate-700">{req.item}</td>
                  <td className="px-4 py-3 text-slate-500">{req.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
                      ${req.status === 'Approved' || req.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700' : 
                        'bg-amber-50 text-amber-700'}`}>
                      {(req.status === 'Approved' || req.status === 'Resolved') ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="p-6 border border-slate-200 max-w-2xl">
          <h3 className="font-medium text-slate-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-500" />
            Submit a Request
          </h3>
          <div className="space-y-4 mb-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Request Category</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
                <option>Stationery</option>
                <option>Lab Equipment</option>
                <option>IT / Technical Support</option>
                <option>Maintenance</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Item or Issue Description</label>
              <textarea placeholder="Please describe exactly what you need or the issue you are facing..." className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"/>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Priority Level</label>
              <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm">
                <option>Low (Needed within a week)</option>
                <option>Medium (Needed within 2-3 days)</option>
                <option>High (Needed today/immediately)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setView("list")}>Cancel</Button>
            <Button onClick={() => setView("list")}>Submit Request</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
