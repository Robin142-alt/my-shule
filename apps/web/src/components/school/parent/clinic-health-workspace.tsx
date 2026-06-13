"use client";

import { Activity, Stethoscope, Pill, AlertTriangle, FileText, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/hooks/use-school-api";

export function ClinicHealthWorkspace() {
  // Using 'me' or a hardcoded studentId for demonstration
  const { data: historyData, isLoading } = useSchoolQuery('/api/clinic/parent/students/me/history');

  const visits = historyData?.visits || [];
  const allergies = historyData?.allergies || ['Penicillin', 'Peanuts']; // Mocking if none returned
  const medications = historyData?.medications || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Clinic & Health</h2>
          <p className="text-sm text-slate-500 mt-1">View medical history, recent sick bay visits, and active medications.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" /> Medical Form
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border border-slate-200 bg-rose-50/30">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-500" /> Known Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {allergies.map((allergy: string, idx: number) => (
               <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-rose-100 text-rose-700">
                 {allergy}
               </span>
            ))}
            {allergies.length === 0 && (
               <p className="text-sm text-slate-500">No known allergies on file.</p>
            )}
          </div>
        </Card>

        <Card className="p-6 border border-slate-200 bg-blue-50/30">
          <h3 className="font-medium text-slate-900 flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-blue-500" /> Active Medications
          </h3>
          <div className="space-y-3">
            {medications.length > 0 ? (
               medications.map((med: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{med.name}</p>
                      <p className="text-xs text-slate-500">{med.dosage}</p>
                    </div>
                  </div>
               ))
            ) : (
               <p className="text-sm text-slate-500">No active medications registered.</p>
            )}
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <Activity className="w-5 h-5 text-emerald-500" />
          <h3 className="font-medium text-slate-900">Recent Clinic Visits</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
             <div className="p-8 text-center text-slate-500 animate-pulse">Loading medical history...</div>
          ) : visits.length > 0 ? (
             visits.map((visit: any, idx: number) => (
                <div key={idx} className="p-4 flex flex-col md:flex-row gap-4 hover:bg-slate-50/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-slate-900">{visit.reason_for_visit}</h4>
                        <p className="text-xs text-slate-500 mt-1">{new Date(visit.check_in_time).toLocaleString()}</p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {visit.status}
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-slate-50 rounded text-sm text-slate-700">
                      <p><strong>Diagnosis:</strong> {visit.diagnosis || 'Pending'}</p>
                      {visit.treatment_notes && <p className="mt-1"><strong>Notes:</strong> {visit.treatment_notes}</p>}
                    </div>
                  </div>
                </div>
             ))
          ) : (
             <div className="p-8 text-center text-slate-500">
                <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p>No clinic visits recorded for this academic year.</p>
             </div>
          )}
        </div>
      </Card>
    </div>
  );
}
