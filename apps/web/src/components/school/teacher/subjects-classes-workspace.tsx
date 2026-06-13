"use client";

import { Users, BookOpen, Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function SubjectsClassesWorkspace() {
  const { data: assignments, isLoading } = useSchoolQuery<any[]>("/api/academics/my-assignments");

  // Fallback static data if endpoint isn't fully wired for the logged-in user yet
  const mockAssignments = [
    { id: 1, subject: "Mathematics", classLevel: "Form 1", section: "East", studentsCount: 42, weeklyPeriods: 5 },
    { id: 2, subject: "Mathematics", classLevel: "Form 2", section: "West", studentsCount: 38, weeklyPeriods: 5 },
    { id: 3, subject: "Physics", classLevel: "Form 3", section: "South", studentsCount: 30, weeklyPeriods: 4 },
    { id: 4, subject: "Physics", classLevel: "Form 1", section: "East", studentsCount: 42, weeklyPeriods: 3 },
  ];

  const displayData = assignments?.length ? assignments : mockAssignments;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">My Classes & Subjects</h2>
          <p className="text-sm text-slate-500 mt-1">Directory of all the sections and subjects you are currently assigned to teach.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayData.map((item) => (
          <Card key={item.id} className="p-6 border border-slate-200 flex flex-col hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-md">
                <BookOpen className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-full">
                {item.weeklyPeriods} lessons / wk
              </span>
            </div>
            <h3 className="font-semibold text-slate-900 text-lg">{item.subject}</h3>
            <p className="text-sm font-medium text-slate-600 mb-6">{item.classLevel} {item.section}</p>
            
            <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <Users className="w-4 h-4" />
                <span>{item.studentsCount} Students</span>
              </div>
              <div className="ml-auto">
                <Button variant="ghost" size="sm" className="gap-1 h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                  Open Roster <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {displayData.length === 0 && !isLoading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-slate-500">You currently do not have any class assignments.</p>
          </div>
        )}
      </div>
    </div>
  );
}

