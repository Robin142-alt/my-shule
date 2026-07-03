"use client";

import { useSchoolQuery } from "@/lib/data/school-hooks";
import { Card } from "@/components/ui/card";
import { Calendar, CheckCircle, BookOpen, Clock, AlertCircle } from "lucide-react";

type TeacherOverviewMetric = {
  count?: number;
  detail?: string;
};

type TeacherOverviewLesson = {
  id?: string;
  className?: string;
  class_name?: string;
  subjectName?: string;
  subject_name?: string;
  subject?: string;
  startTime?: string;
  start_time?: string;
  endTime?: string;
  end_time?: string;
  time?: string;
  roomName?: string;
  room_name?: string;
  status?: string;
};

type TeacherOverviewData = {
  todaysLessons?: TeacherOverviewMetric;
  pendingAttendance?: TeacherOverviewMetric;
  pendingLessonLogs?: TeacherOverviewMetric;
  openMarkEntry?: TeacherOverviewMetric;
  assignmentsDue?: TeacherOverviewMetric;
  unreadMessages?: TeacherOverviewMetric;
  lessons?: TeacherOverviewLesson[];
  timetable?: TeacherOverviewLesson[];
  todaysSchedule?: TeacherOverviewLesson[];
};

function metricValue(metric: TeacherOverviewMetric | undefined) {
  return metric?.count ?? 0;
}

function metricDetail(metric: TeacherOverviewMetric | undefined, emptyDetail: string) {
  return metric?.detail || emptyDetail;
}

function lessonTime(lesson: TeacherOverviewLesson) {
  if (lesson.time) return lesson.time;
  if (lesson.startTime || lesson.endTime) return [lesson.startTime, lesson.endTime].filter(Boolean).join(" - ");
  if (lesson.start_time || lesson.end_time) return [lesson.start_time, lesson.end_time].filter(Boolean).join(" - ");
  return "Time not set";
}

export function OverviewWorkspace() {
  const { data: overview, isLoading, error } = useSchoolQuery<TeacherOverviewData>("/admin-command/teacher/overview");

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Loading teacher dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-slate-500 gap-4">
        <AlertCircle className="w-8 h-8 text-rose-500" />
        <p>Failed to load dashboard overview.</p>
      </div>
    );
  }

  const schedule = overview?.todaysSchedule ?? overview?.lessons ?? overview?.timetable ?? [];
  const todayClasses = metricValue(overview?.todaysLessons);
  const pendingGrading = metricValue(overview?.openMarkEntry);
  const lessonPlansDetail = metricDetail(
    overview?.pendingLessonLogs,
    "No lesson log gaps returned by the teacher overview service.",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Teacher Overview</h2>
          <p className="text-sm text-slate-500 mt-1">Your daily schedule, pending tasks, and class insights.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Classes Today
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">{todayClasses}</span>
              <span className="text-sm font-medium text-slate-500">sessions</span>
            </div>
            <p className="text-xs text-slate-500">
              {metricDetail(overview?.todaysLessons, "No lessons assigned for today.")}
            </p>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Pending Grading
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-rose-600">{pendingGrading}</span>
              <span className="text-sm font-medium text-slate-500">assignments</span>
            </div>
            <p className="text-xs text-slate-500">
              {metricDetail(overview?.openMarkEntry, "No open mark-entry work returned.")}
            </p>
          </div>
        </Card>

        <Card className="p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              Lesson Plans
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-slate-900">
                {metricValue(overview?.pendingLessonLogs) === 0 ? "Up to date" : metricValue(overview?.pendingLessonLogs)}
              </span>
            </div>
            <p className="text-xs text-slate-500">{lessonPlansDetail}</p>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200 overflow-hidden mt-6">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-medium text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            Today's Schedule
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Time</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Class</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {schedule.length > 0 ? (
                schedule.map((lesson, index) => (
                  <tr key={lesson.id ?? `${lessonTime(lesson)}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-slate-900 whitespace-nowrap">{lessonTime(lesson)}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{lesson.className ?? lesson.class_name ?? "Class not set"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{lesson.subjectName ?? lesson.subject_name ?? lesson.subject ?? "Subject not set"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{lesson.status ?? "Scheduled"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No lessons were returned for today. Open the timetable workspace to assign or review lessons.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

