import { Bell, CalendarDays } from "lucide-react";
import { TeacherView, TeacherAction } from "./types";
import { Panel } from "./shared-components";

export function OverviewWorkspace({
  onViewChange,
  onStartAction,
}: {
  onViewChange: (view: TeacherView) => void;
  onStartAction: (action: TeacherAction, view: TeacherView, message: string) => void;
}) {
  const summaryCards: Array<[string, string, string]> = [
    ["Today's Lessons", "0", "0 scheduled for today"],
    ["Pending Attendance", "0", "0 classes not marked"],
    ["Pending Lesson Logs", "0", "0 lessons not logged"],
    ["Open Mark Entry", "0", "0 exams awaiting marks"],
    ["Assignments Due", "0", "0 assignments due this week"],
    ["Learners Needing Attention", "0", "0 flagged learners"],
    ["Unread Messages", "0", "0 parent/admin messages"],
    ["Store Requests", "0", "0 pending requests"],
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
            <p className="mt-2 text-3xl font-black text-[#071D49]">{value}</p>
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
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-[#D8E0EC] bg-[#F8FAFC]">
            <p className="text-sm font-semibold text-[#64748B]">No lessons scheduled for today.</p>
            <button type="button" onClick={() => onViewChange("timetable")} className="mt-2 text-sm font-bold text-[#1D4ED8] hover:underline">
              View Weekly Timetable
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}
