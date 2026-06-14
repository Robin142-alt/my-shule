"use client";

import { useState } from "react";
import { Edit3, CheckCircle, Clock, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

export function LessonLogsWorkspace() {
  const [activeDate, setActiveDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: lessonLogs = [], isLoading, refetch } = useSchoolQuery<any[]>(`/api/academics/my-lesson-logs?date=${activeDate}`);
  const logMutation = useSchoolMutation("/api/academics/lesson-logs", "POST");
  const dailyLessons = lessonLogs.length > 0 ? lessonLogs : [];

  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Daily Lesson Logs</h2>
          <p className="text-sm text-slate-500 mt-1">Record what you taught in each class to keep the Head of Department updated.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1 shadow-sm">
          <Calendar className="w-4 h-4 ml-2 text-slate-500" />
          <input 
            type="date" 
            value={activeDate} 
            onChange={(e) => setActiveDate(e.target.value)}
            className="text-sm border-none bg-transparent focus:ring-0 text-slate-700 font-medium"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-sm font-medium text-slate-700 uppercase tracking-wider mb-2">Today's Schedule</h3>
          {dailyLessons.map((lesson: any) => (
            <Card 
              key={lesson.id} 
              className={`p-4 border cursor-pointer transition-colors ${selectedLesson?.id === lesson.id ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/20' : 'border-slate-200 hover:border-slate-300'}`}
              onClick={() => setSelectedLesson(lesson)}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {lesson.time}
                </span>
                {lesson.logged ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-amber-500 mt-1"></div>
                )}
              </div>
              <h4 className="font-semibold text-slate-900">{lesson.subject}</h4>
              <p className="text-sm text-slate-600">{lesson.class}</p>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-2">
          {selectedLesson ? (
            <Card className="p-6 border border-slate-200 h-full">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="font-medium text-slate-900 text-lg flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-500" />
                    Log Entry
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">{selectedLesson.subject} • {selectedLesson.class} • {selectedLesson.time}</p>
                </div>
                {selectedLesson.logged && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle className="w-3 h-3" /> Submitted
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Topic Covered</label>
                  <input type="text" defaultValue={selectedLesson.logged ? "Linear Equations" : ""} placeholder="What did you teach today?" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Teacher's Reflection & Notes</label>
                  <textarea 
                    defaultValue={selectedLesson.notes} 
                    placeholder="Note down any challenges, students who need help, or objectives not met..." 
                    className="flex min-h-[150px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button 
                    className="gap-2"
                    onClick={async () => {
                      await logMutation.mutateAsync({
                        lesson_id: selectedLesson.id,
                        notes: selectedLesson.notes,
                        logged: true,
                        date: activeDate
                      });
                      refetch();
                    }}
                  >
                    {selectedLesson.logged ? "Update Log" : "Submit Log"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-12 text-center text-slate-500">
              <Edit3 className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-1">Select a class session</h3>
              <p className="text-sm">Click on a session from the left schedule to view or add a lesson log.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
