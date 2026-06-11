"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, AlertTriangle, ShieldAlert } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type PrincipalDisciplineData = {
  status: "active" | "degraded" | "setup_required";
  openCases: number;
  criticalCases: number;
  escalations: number;
  incidentTrend: Array<{ label: string; value: number }>;
  recentIncidents: Array<{ id: string; title: string; severity: string; status: string; date: string }>;
};

export function PrincipalDisciplineWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<PrincipalDisciplineData>('/admin-command/principal/discipline');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-white/5 rounded-xl border border-white/10" />
          <div className="h-64 bg-white/5 rounded-xl border border-white/10" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load Discipline Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Status</div>
          <div className="mt-2 text-2xl font-black text-white capitalize">{data.status}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Open Cases</div>
          <div className="mt-2 text-2xl font-black text-white">{data.openCases}</div>
        </Card>
        <Card className="border border-red-500/20 bg-red-500/5 p-5">
          <div className="text-sm font-semibold text-red-400">Critical Severity</div>
          <div className="mt-2 text-2xl font-black text-red-500">{data.criticalCases}</div>
        </Card>
        <Card className="border border-orange-500/20 bg-orange-500/5 p-5">
          <div className="text-sm font-semibold text-orange-400">Escalated to Principal</div>
          <div className="mt-2 text-2xl font-black text-orange-500">{data.escalations}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Incident Trend</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.incidentTrend?.map((item) => {
              const maxVal = Math.max(...(data.incidentTrend?.map(i => i.value) || [1]), 1);
              return (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                    <div 
                      className="absolute bottom-0 w-full bg-red-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-red-400/60"
                      style={{ height: `${(item.value / maxVal) * 100}%` }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.value}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-white/50">{item.label}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Incidents</h2>
            <button className="text-xs bg-red-500/20 text-red-400 px-3 py-1.5 rounded hover:bg-red-500/30 transition-colors flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Report Incident
            </button>
          </div>
          
          {(!data.recentIncidents || data.recentIncidents.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <AlertTriangle className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No recent incidents reported</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.recentIncidents.map((incident) => (
                <div key={incident.id} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{incident.title}</h4>
                      <p className="text-sm text-white/60">{incident.date} • {incident.id.split('-')[0]}</p>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold capitalize ${incident.severity === 'critical' ? 'text-red-500' : incident.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'}`}>
                        {incident.severity}
                      </div>
                      <div className="text-xs text-white/40 capitalize">{incident.status}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
