"use client";

import { WorkspaceRetry } from "@/components/school/workspace-retry";

import { Card } from "@/components/ui/card";
import { AlertCircle, BookOpen, Clock, Users } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { buildSchoolSectionHref } from "../school-pages";

type PrincipalTeachingData = {
  status: "active" | "degraded" | "setup_required";
  totalClasses: number;
  subjects: string[];
  upcomingClasses: Array<{ class: string; subject: string; time: string; room: string }>;
  pendingGrading: number;
};

export function PrincipalTeachingWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalTeachingData>('/admin-command/principal/teaching');

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
          <h2 className="text-xl font-bold text-red-500">Failed to load Teaching Schedule</h2>
        </div>
        <WorkspaceRetry onRetry={() => refetch()} />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Classes Taught</div>
          <div className="mt-2 text-2xl font-black text-white">{data.totalClasses}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Subjects</div>
          <div className="mt-2 text-lg font-black text-white truncate">
            {data.subjects.join(", ") || "None assigned"}
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-5">
          <div className="text-sm font-semibold text-white/70">Pending Grading Tasks</div>
          <div className="mt-2 text-2xl font-black text-white">{data.pendingGrading}</div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Upcoming Classes</h2>
          </div>
          
          {(!data.upcomingClasses || data.upcomingClasses.length === 0) ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center bg-white/5 rounded-lg border border-white/5">
              <BookOpen className="h-10 w-10 text-white/20 mb-3" />
              <p className="text-white/60">No upcoming classes scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {data.upcomingClasses.map((cls, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                      <Users className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{cls.class}</p>
                      <p className="text-xs text-white/60">{cls.subject} • {cls.room}</p>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {cls.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col h-full min-h-[300px]">
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <h2 className="text-xl font-bold text-white">Teacher Portal</h2>
          </div>
          
          <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
            <AlertCircle className="h-10 w-10 text-cyan-400/50 mb-3" />
            <p className="text-white font-bold text-lg">Switch to Teacher Dashboard</p>
            <p className="text-white/60 text-sm mt-1 max-w-sm">
              For entering marks, taking attendance, and managing your specific classes, please switch to the Teacher Dashboard.
            </p>
            <button type="button" onClick={() => window.location.assign(buildSchoolSectionHref("teacher", "overview", "public"))} className="mt-6 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-lg transition">
              Switch to Teacher Role
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
