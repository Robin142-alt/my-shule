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

  const { data: overview, isLoading: overviewLoading, error: overviewError, refetch: refreshOverview } = useQuery({
    queryKey: ["teacher-dashboard-overview", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTeacherDashboardOverviewLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const { data: timetable, isLoading: timetableLoading, error: timetableError, refetch: refreshTimetable } = useQuery({
    queryKey: ["teacher-timetable", liveSession.session?.tenantId, liveSession.session?.user.user_id],
    queryFn: () => fetchTimetableLive(liveSession.session!),
    enabled: !!liveSession.session,
  });

  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const todaysLessons = timetable?.filter(t => t.dayName === todayStr) || [];

  const overviewPending = overviewLoading || liveSession.isLoading;
  const unavailableLabel = overviewPending ? "Loading…" : "Currently unavailable";
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
    ["Today's Lessons", "—", unavailableLabel],
    ["Pending Attendance", "—", unavailableLabel],
    ["Pending Lesson Logs", "—", unavailableLabel],
    ["Open Mark Entry", "—", unavailableLabel],
    ["Assignments Due", "—", unavailableLabel],
    ["Learners Needing Attention", "—", unavailableLabel],
    ["Unread Messages", "—", unavailableLabel],
    ["Store Requests", "—", unavailableLabel],
  ];

  const quickActions: Array<[string, TeacherView, TeacherAction, string]> = [
    ["Mark Today's Attendance", "attendance", "attendance", "Attendance register loaded. Select a class and submit real attendance."],
    ["Record Lesson Log", "lesson-log", "lesson-log", "Lesson coverage log loaded for your assigned lesson."],
    ["Create Assignment", "assignments", "assignment", "Assignment editor loaded for class homework publishing."],
    ["Enter CAT Marks", "assessments-cats", "marks", "Marks entry sheet loaded for an active assessment."],
    ["Message Class", "parent-communication", "sms", "Parent communication composer loaded with class recipients."],
  ];

  return (
    <>
      <section className="rounded-2xl bg-[#071D49] p-4 text-white shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-100">Your teaching day</p>
        <h2 className="mt-2 max-w-3xl text-xl font-semibold tracking-tight md:text-3xl">Welcome back, Teacher</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-blue-100/78">
          Here's a summary of your academic tasks for today.
        </p>
      </section>

      {overviewError || liveSession.error || (!overviewPending && !liveSession.session) ? (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>{overviewError instanceof Error ? overviewError.message : liveSession.error || "Your teaching summary is unavailable. Check your school session and reload."}</p>
          {liveSession.session ? <button type="button" className="mt-2 font-semibold underline underline-offset-4" onClick={() => void refreshOverview()}>Retry teaching summary</button> : null}
        </div>
      ) : null}

      <section className="app-metric-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          <div className="flex flex-col rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            {timetableLoading || liveSession.isLoading ? (
               <div className="flex h-32 items-center justify-center">
                 <Loader2 className="h-6 w-6 animate-spin text-[#64748B]" />
               </div>
            ) : timetableError || !liveSession.session ? (
              <div role="status" className="py-5 text-center text-sm text-slate-600">
                <p>Your teaching plan is currently unavailable.</p>
                {liveSession.session ? <button type="button" onClick={() => void refreshTimetable()} className="mt-2 font-semibold text-blue-700 underline">Retry teaching plan</button> : null}
              </div>
            ) : todaysLessons.length > 0 ? (
              <div className="space-y-3">
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
