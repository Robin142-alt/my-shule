"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, Users, UserPlus, Plus } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useDashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-provider";
import { useState } from "react";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { buildSchoolSectionHref } from "@/components/school/school-pages";

import { useStudentEvents } from "@/hooks/useStudentEvents";

type PrincipalStudentsData = {
  status: "active" | "degraded" | "setup_required";
  totalStudents: number;
  boys: number;
  girls: number;
  populationTrend: Array<{ label: string; value: number }>;
  recentAdmissions: Array<{ id: string; name: string; class: string; gender: string; admission_date: string }>;
};

export function PrincipalStudentsWorkspace() {
  useStudentEvents();
  const router = useRouter();
  const { data, isLoading, error } = useSchoolQuery<PrincipalStudentsData>('/admin-command/principal/students');
  const eventBus = useDashboardEventBus();
  const { hasPermission } = usePermissions();
  const openAdmissionsWorkspace = () => router.push(buildSchoolSectionHref("admissions", "admissions", "public"));

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Students Overview</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-cyan-400" />
          Students Directory
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Status</div>
          <div className="mt-2 text-2xl font-black text-white capitalize">{data.status}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Total Population</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalStudents}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Boys</div>
          <div className="mt-2 text-2xl font-black text-white">{data.boys}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Girls</div>
          <div className="mt-2 text-2xl font-black text-white">{data.girls}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <h2 className="text-xl font-bold text-white mb-6">Population Trend</h2>
          <div className="flex-1 flex items-end gap-2 mt-4 min-h-[200px]">
            {data.populationTrend?.map((item) => (
              <div key={item.label} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="w-full relative bg-white/5 rounded-t-sm" style={{ height: "150px" }}>
                  <div 
                    className="absolute bottom-0 w-full bg-blue-500/50 rounded-t-sm transition-all duration-500 group-hover:bg-blue-400/60"
                    style={{ height: `${data.totalStudents > 0 ? (item.value / data.totalStudents) * 100 : 0}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.value}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Recent Admissions</h2>
            {hasPermission('school_admissions:write') && (
              <Button size="sm" variant="outline" className="text-xs bg-cyan-500/20 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/30" onClick={openAdmissionsWorkspace}>
                <Plus className="h-3 w-3 mr-1" />
                Admit New
              </Button>
            )}
          </div>
          
          {(!data.recentAdmissions || data.recentAdmissions.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <Users className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60 mb-4">No recent admissions found</p>
              {hasPermission('school_admissions:write') && (
                <Button size="sm" variant="outline" onClick={openAdmissionsWorkspace}>
                  <Plus className="h-4 w-4 mr-2" /> Admit Student
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.recentAdmissions.map((student) => (
                <div key={student.id} className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{student.name}</h4>
                      <p className="text-sm text-white/60">{student.id} • {student.gender}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-white">{student.class}</div>
                      <div className="text-xs text-white/40">Admitted: {student.admission_date}</div>
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
