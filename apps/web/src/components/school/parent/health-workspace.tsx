"use client";

import { HeartPulse, Stethoscope, FilePlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function HealthWorkspace() {
  const records = [
    { id: 1, date: "April 10, 2026", issue: "Mild Fever", action: "Given paracetamol and rested in clinic for 2 hours.", staff: "Nurse W. Kariuki" },
    { id: 2, date: "Feb 05, 2026", issue: "Scraped Knee", action: "Cleaned and bandaged during P.E. class.", staff: "Nurse W. Kariuki" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Health & Clinic</h2>
          <p className="text-sm text-slate-500 mt-1">Review school clinic visits, medical alerts, and update health profiles.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <FilePlus className="w-4 h-4" /> Update Medical Profile
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200 col-span-1 md:col-span-1 bg-rose-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-100 rounded-lg">
              <HeartPulse className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="font-semibold text-slate-900">Medical Alerts</h3>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-900">• Asthma (Mild)</div>
            <div className="text-sm font-medium text-slate-900">• Peanut Allergy</div>
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-rose-100">Ensure the school clinic has an updated inhaler.</p>
        </Card>

        <Card className="border border-slate-200 overflow-hidden col-span-1 md:col-span-2">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-slate-500" />
              Clinic Visit History
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No clinic visits recorded for this term.</div>
            ) : (
              records.map(record => (
                <div key={record.id} className="p-4">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-medium text-slate-900">{record.issue}</h4>
                    <span className="text-xs text-slate-500">{record.date}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{record.action}</p>
                  <p className="text-xs text-slate-400">Attending Staff: {record.staff}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
