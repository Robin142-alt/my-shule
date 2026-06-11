"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, GraduationCap, Calendar, BookOpen, UsersRound, Settings } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type AcademicSetupData = {
  status: "active" | "degraded" | "setup_required";
  activeTerm: string;
  weeksRemaining: number;
  gradingsConfigured: boolean;
  subjectsRegistered: number;
  teachersAssigned: number;
  pendingConfigurations: number;
  recentChanges: Array<{ title: string; time: string }>;
};

export function PrincipalAcademicSetupWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<AcademicSetupData>('/admin-command/principal/academic-setup');

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Academic Setup</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Active Term</div>
          <div className="mt-2 text-xl font-black text-white">{data.activeTerm}</div>
          <div className="mt-1 text-xs text-white/50">{data.weeksRemaining} weeks remaining</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Grading System</div>
          <div className="mt-2 text-xl font-black text-white">
            {data.gradingsConfigured ? "Configured" : "Pending"}
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Subjects Registered</div>
          <div className="mt-2 text-2xl font-black text-white">{data.subjectsRegistered}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Teachers Assigned</div>
          <div className="mt-2 text-2xl font-black text-white">{data.teachersAssigned}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Configuration Hub</h2>
          </div>
          
          <div className="space-y-3 flex-1 overflow-y-auto pr-2">
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Calendar className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Academic Calendar</p>
                  <p className="text-xs text-white/60">Manage terms, holidays, and events</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                  <GraduationCap className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Grading Systems</p>
                  <p className="text-xs text-white/60">Configure grading scales and rules</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Settings className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Curriculum Settings</p>
                  <p className="text-xs text-white/60">Manage CBC / 8-4-4 configurations</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Pending Configurations</h2>
          </div>
          
          {data.pendingConfigurations === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <AlertCircle className="h-10 w-10 text-emerald-400/50 mb-3" />
              <p className="text-white/60">All academic configurations are complete.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-rose-500/20">
              <Settings className="h-10 w-10 text-rose-400/50 mb-3" />
              <p className="text-white font-bold text-lg">{data.pendingConfigurations} actions required</p>
              <p className="text-white/60 text-sm mt-1">Check the Setup Checklist for details.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
