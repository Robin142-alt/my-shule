import { Bell, CalendarDays, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TeacherView, TeacherAction } from "./types";
import { Panel } from "./shared-components";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { fetchTeacherDashboardOverviewLive, fetchTimetableLive } from "@/lib/modules/teacher-live";

export function OverviewWorkspace({
  onViewChange,
  onStartAction,
}: {
  onViewChange: (view: TeacherView) => void;
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const liveSession = useLiveTenantSession("school");

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["teacher-dashboard-overview", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTeacherDashboardOverviewLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: ["teacher-timetable", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTimetableLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysLessons = timetable?.filter(t => t.dayName === todayStr) || [];

  const summaryCards: Array<[string, string | number, string]> = overview ? [
    ["Today's Lessons", overview.todaysLessons.count, overview.todaysLessons.detail],
    ["Pending Attendance", overview.pendingAttendance.count, overview.pendingAttendance.detail],
    ["Pending Lesson Logs", overview.pendingLessonLogs.count, overview.pendingLessonLogs.detail],
    ["Open Mark Entry", overview.openMarkEntry.count, overview.openMarkEntry.detail],
    ["Assignments Due", overview.assignmentsDue.count, overview.assignmentsDue.detail],
    ["Learners Needing Attention", overview.learnersNeedingAttention.count, overview.learnersNeedingAttention.detail],
    ["Unread Messages", overview.unreadMessages.count, overview.unreadMessages.detail],
    ["Store Requests", overview.storeRequests.count, overview.storeRequests.detail],
  ] : [
    ["Today's Lessons", "-", "Loading..."],
    ["Pending Attendance", "-", "Loading..."],
    ["Pending Lesson Logs", "-", "Loading..."],
    ["Open Mark Entry", "-", "Loading..."],
    ["Assignments Due", "-", "Loading..."],
    ["Learners Needing Attention", "-", "Loading..."],
    ["Unread Messages", "-", "Loading..."],
    ["Store Requests", "-", "Loading..."],
  ];

  const quickActions: Array<[string, TeacherView, TeacherAction, string]> = [
    ["Mark Today's Attendance", "attendance", "attendance", "Attendance register form ready."],
    ["Record Lesson Log", "lesson-log", "lesson-log", "Lesson log form ready."],
    ["Create Assignment", "assignments", "assignment", "Assignment form ready."],
    ["Enter CAT Marks", "assessments-cats", "marks", "Marks entry form ready."],
    ["Message Class", "parent-communication", "sms", "Message form ready."],
  ];

  return (
    <>
      <section className="rounded-2xl bg-[linear-gradient(135deg,#071D49_0%,#123A7A_68%,#0F172A_100%)] p-5 text-white shadow-[0_24px_70px_rgba(7,29,73,0.22)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">Academic Year 2026 • Term 2</p>
        <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.02em] md:text-5xl">Welcome Back, Teacher</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/78">
          Here's a summary of your academic tasks for today.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(([label, value, detail]) => (
          <article key={label} className="rounded-2xl border border-[#D8E0EC] bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
            <div className="mt-2 flex items-center">
              {overviewLoading ? <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" /> : <p className="text-3xl font-black text-[#071D49]">{value}</p>}
            </div>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">{detail}</p>
          </article>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <Panel title="Quick actions" description="High-frequency daily tasks." icon={Bell}>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map(([label, view, action, message]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onViewChange(view);
                  onStartAction(action, view, message);
                }}
                className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left text-sm font-black text-[#071D49] transition hover:bg-[#F1F5F9]"
              >
                {label}
              </button>
            ))}
          </div>
        </Panel>
        
        <Panel title="Today's teaching plan" description="Your assigned lessons for today." icon={CalendarDays}>
          <div className="flex flex-col h-full rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            {timetableLoading ? (
               <div className="flex h-32 items-center justify-center">
                 <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
               </div>
            ) : todaysLessons.length > 0 ? (
              <div className="space-y-3 flex-1 overflow-y-auto">
                {todaysLessons.map(lesson => (
                  <div key={lesson.id} className="flex justify-between items-center rounded-lg bg-white p-3 border border-[#D8E0EC]">
                    <div>
                      <p className="text-sm font-bold text-[#071D49]">{lesson.className}</p>
                      <p className="text-xs font-semibold text-[#64748B]">{lesson.subjectName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#071D49]">{lesson.startTime}</p>
                      <p className="text-xs text-[#64748B]">{lesson.roomName}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center border-dashed border-[#D8E0EC]">
                <p className="text-sm font-semibold text-[#64748B]">No lessons scheduled for today.</p>
                <button type="button" onClick={() => onViewChange("timetable")} className="mt-2 text-sm font-bold text-[#1D4ED8] hover:underline">
                  View Weekly Timetable
                </button>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
