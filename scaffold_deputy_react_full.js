const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'apps/web/src/components/school/deputy-principal');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// Shared Components
const sharedTsx = `
import { type ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";

export const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: {
    card: "border-emerald-200 bg-emerald-50 text-emerald-900",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
  },
  info: {
    card: "border-blue-200 bg-blue-50 text-blue-950",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    text: "text-blue-700",
  },
  warning: {
    card: "border-amber-200 bg-amber-50 text-amber-950",
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-700",
  },
  danger: {
    card: "border-rose-200 bg-rose-50 text-rose-950",
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-700",
  },
  neutral: {
    card: "border-slate-200 bg-white text-[#071D49]",
    chip: "border-slate-200 bg-slate-50 text-slate-700",
    dot: "bg-slate-400",
    text: "text-slate-600",
  },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold whitespace-nowrap", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

export function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon ? (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          ) : null}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p> : null}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
`;

fs.writeFileSync(path.join(dir, 'shared.tsx'), sharedTsx);

// 1. Overview
const overviewTsx = `"use client";
import { LayoutDashboard, Users, UserX, UserCheck, AlertTriangle, ShieldAlert } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyOverviewWorkspace() {
  return (
    <Panel title="Overview" description="Today's Priority Queue and school state." icon={LayoutDashboard} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Start Morning Review</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><UserCheck className="w-4 h-4"/> Present Today</div>
          <div className="mt-1 text-2xl font-black text-emerald-600">842</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-rose-700"><UserX className="w-4 h-4"/> Absent Today</div>
          <div className="mt-1 text-2xl font-black text-rose-700">14</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-700"><ShieldAlert className="w-4 h-4"/> Discipline Alerts</div>
          <div className="mt-1 text-2xl font-black text-orange-700">3</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#64748B]"><Users className="w-4 h-4"/> Missing Duty</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">1</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Priority</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student/Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class/Dept</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3"><StatusChip label="Critical" tone="danger" /></td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Discipline</td>
              <td className="px-4 py-3 text-[#64748B]">Brian Otieno</td>
              <td className="px-4 py-3 text-[#64748B]">Form 2 East</td>
              <td className="px-4 py-3 text-[#64748B]">New</td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Assign</button>
                <button className="text-blue-600 hover:underline font-semibold text-xs">Open</button>
              </td>
            </tr>
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3"><StatusChip label="High" tone="warning" /></td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Attendance</td>
              <td className="px-4 py-3 text-[#64748B]">Form 3 West</td>
              <td className="px-4 py-3 text-[#64748B]">Mr. Kiptoo</td>
              <td className="px-4 py-3 text-[#64748B]">Not Marked</td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Remind</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'overview-workspace.tsx'), overviewTsx);

// 2. Daily Operations
const dailyOpsTsx = `"use client";
import { Activity, Clock } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyDailyOperationsWorkspace() {
  return (
    <Panel title="Daily Operations" description="Manage the school day from morning to evening." icon={Activity} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Operation Note</button>
    }>
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Morning Parade</div>
          <div className="mt-1 text-lg font-black text-emerald-600">Completed</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Staff on Duty</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">6 / 6 Present</div>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Gate Security</div>
          <div className="mt-1 text-lg font-black text-[#071D49]">Report Received</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Classes Not Started</div>
          <div className="mt-1 text-lg font-black text-rose-700">2</div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Area</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Issue</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">08:15 AM</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Main Gate</td>
              <td className="px-4 py-3 text-[#64748B]">Parent visitor log high</td>
              <td className="px-4 py-3"><StatusChip label="Resolved" tone="success" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">View Note</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'daily-operations-workspace.tsx'), dailyOpsTsx);

// 3. Attendance
const attendanceTsx = `"use client";
import { UserRoundCheck, Search } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyAttendanceWorkspace() {
  return (
    <Panel title="Attendance & Punctuality" description="Follow up missing records, repeated absenteeism, and lateness." icon={UserRoundCheck} actions={
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm font-bold text-[#071D49]">Remind Unmarked</button>
        <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Follow-Up</button>
      </div>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search student or admission no..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Reason</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Parent Notified</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">John Mutua</td>
              <td className="px-4 py-3 text-[#64748B]">Form 1 West</td>
              <td className="px-4 py-3"><StatusChip label="Absent" tone="danger" /></td>
              <td className="px-4 py-3 text-[#64748B]">Unexplained</td>
              <td className="px-4 py-3"><StatusChip label="Pending" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Contact Parent</button>
                <button className="text-blue-600 hover:underline font-semibold text-xs">Follow Up</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'attendance-workspace.tsx'), attendanceTsx);

// 4. Discipline
const disciplineTsx = `"use client";
import { ShieldAlert, Search } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyDisciplineWorkspace() {
  return (
    <Panel title="Discipline & Behaviour" description="Student behaviour incidents, investigations, and escalations." icon={ShieldAlert} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Incident</button>
    }>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
          <input type="text" placeholder="Search case no, student..." className="w-full rounded-xl border border-[#D8E0EC] py-2 pl-9 pr-3 text-sm focus:border-[#071D49] focus:outline-none" />
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Case No.</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Incident</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Severity</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">CAS-089</td>
              <td className="px-4 py-3 text-[#64748B]">Brian Otieno</td>
              <td className="px-4 py-3 text-[#64748B]">Fighting in dorm</td>
              <td className="px-4 py-3"><StatusChip label="Critical" tone="danger" /></td>
              <td className="px-4 py-3"><StatusChip label="In Review" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Escalate</button>
                <button className="text-blue-600 hover:underline font-semibold text-xs">Open Case</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'discipline-workspace.tsx'), disciplineTsx);

// 5. Welfare
const welfareTsx = `"use client";
import { Stethoscope } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyWelfareWorkspace() {
  return (
    <Panel title="Student Welfare" description="Non-punitive student support, counselling, and general welfare." icon={Stethoscope} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Welfare Case</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Student</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Concern</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Assigned To</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Jane Njeri</td>
              <td className="px-4 py-3 text-[#64748B]">Repeated absenteeism</td>
              <td className="px-4 py-3 text-[#64748B]">School Counsellor</td>
              <td className="px-4 py-3"><StatusChip label="Referred" tone="info" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Open Case</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'welfare-workspace.tsx'), welfareTsx);

// 6. Staff Duty
const staffDutyTsx = `"use client";
import { UsersRound } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyStaffDutyWorkspace() {
  return (
    <Panel title="Staff Duty & Supervision" description="Staff duty rosters, supervision zones, and presence." icon={UsersRound} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Assign Duty</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Duty Area</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Report</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Mr. Kiptoo</td>
              <td className="px-4 py-3 text-[#64748B]">Dining Hall</td>
              <td className="px-4 py-3 text-[#64748B]">Lunch Time</td>
              <td className="px-4 py-3"><StatusChip label="Present" tone="success" /></td>
              <td className="px-4 py-3"><StatusChip label="Missing" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Request Report</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'staff-duty-workspace.tsx'), staffDutyTsx);

// 7. Timetable
const timetableTsx = `"use client";
import { CalendarClock } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyTimetableReliefWorkspace() {
  return (
    <Panel title="Timetable & Relief Lessons" description="Lesson disruptions, absences, and relief coverage." icon={CalendarClock} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Assign Relief</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lesson Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Absent Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Relief</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">09:00 - 09:40</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">Form 2 East</td>
              <td className="px-4 py-3 text-[#64748B]">Mathematics</td>
              <td className="px-4 py-3 text-[#64748B]">Mr. Omondi</td>
              <td className="px-4 py-3"><StatusChip label="Needed" tone="danger" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Assign</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'timetable-relief-workspace.tsx'), timetableTsx);

// 8. Academics
const academicsTsx = `"use client";
import { GraduationCap } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyAcademicsMonitoringWorkspace() {
  return (
    <Panel title="Academics Monitoring" description="Syllabus progress, weak classes, and academic interventions." icon={GraduationCap} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Create Intervention</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Coverage %</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Concern</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Form 4 West</td>
              <td className="px-4 py-3 text-[#64748B]">Physics</td>
              <td className="px-4 py-3 text-[#64748B]">Mr. Kipchoge</td>
              <td className="px-4 py-3 font-bold">45%</td>
              <td className="px-4 py-3"><StatusChip label="Behind Schedule" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Message HOD</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'academics-monitoring-workspace.tsx'), academicsTsx);

// 9. Teaching
const teachingTsx = `"use client";
import { BookOpen } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyTeachingWorkspace() {
  return (
    <Panel title="Teaching Workspace" description="Manage your assigned classes, attendance, and lesson logs." icon={BookOpen}>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lesson Time</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Attendance</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Lesson Log</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Form 3 North</td>
              <td className="px-4 py-3 text-[#64748B]">Geography</td>
              <td className="px-4 py-3 text-[#64748B]">11:20 - 12:00</td>
              <td className="px-4 py-3"><StatusChip label="Pending" tone="neutral" /></td>
              <td className="px-4 py-3"><StatusChip label="Pending" tone="neutral" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs mr-3">Mark</button>
                <button className="text-blue-600 hover:underline font-semibold text-xs">Log</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'teaching-workspace.tsx'), teachingTsx);

// 10. Exams & Marks
const examsTsx = `"use client";
import { ClipboardCheck } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyExamsMarksWorkspace() {
  return (
    <Panel title="Exams & Marks" monitor="exams at senior level and enter marks for assigned classes." icon={ClipboardCheck} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Enter My Marks</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Exam</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Subject</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Progress</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Term 2 Midterm</td>
              <td className="px-4 py-3 text-[#64748B]">Form 2</td>
              <td className="px-4 py-3 text-[#64748B]">English</td>
              <td className="px-4 py-3 text-[#64748B]">Mr. Kamau</td>
              <td className="px-4 py-3"><StatusChip label="Missing Marks" tone="danger" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Flag Delay</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'exams-marks-workspace.tsx'), examsTsx);

// 11. Classes
const classesTsx = `"use client";
import { Layers } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyClassesStreamsWorkspace() {
  return (
    <Panel title="Classes & Streams" description="Monitor class health, discipline, and attendance trends." icon={Layers}>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Class Teacher</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Learners</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Attendance</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Discipline</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Form 1 West</td>
              <td className="px-4 py-3 text-[#64748B]">Ms. Naliaka</td>
              <td className="px-4 py-3 text-[#64748B]">42</td>
              <td className="px-4 py-3"><StatusChip label="88%" tone="warning" /></td>
              <td className="px-4 py-3 text-[#64748B]">2 Cases</td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">Open Class</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'classes-streams-workspace.tsx'), classesTsx);

// 12. Approvals
const approvalsTsx = `"use client";
import { CheckCircle2 } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyApprovalsWorkspace() {
  return (
    <Panel title="Approvals & Escalations" description="Handle operational approvals and escalations." icon={CheckCircle2}>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Raised By</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Affected Person</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Suspension Recommend</td>
              <td className="px-4 py-3 text-[#64748B]">Discipline Master</td>
              <td className="px-4 py-3 text-[#64748B]">Brian Otieno</td>
              <td className="px-4 py-3"><StatusChip label="Pending Approval" tone="warning" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-emerald-600 hover:underline font-semibold text-xs mr-3">Approve</button>
                <button className="text-rose-600 hover:underline font-semibold text-xs mr-3">Reject</button>
                <button className="text-blue-600 hover:underline font-semibold text-xs">Escalate</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'approvals-workspace.tsx'), approvalsTsx);

// 13. Communication
const communicationTsx = `"use client";
import { MessageSquareText } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyCommunicationWorkspace() {
  return (
    <Panel title="Communication" description="Send staff notices, parent messages, and announcements." icon={MessageSquareText} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Compose Message</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Date</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Recipient</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Type</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 text-[#64748B]">Today 10:00</td>
              <td className="px-4 py-3 font-semibold text-[#071D49]">All Staff</td>
              <td className="px-4 py-3 text-[#64748B]">Staff Notice</td>
              <td className="px-4 py-3"><StatusChip label="Sent" tone="success" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'communication-workspace.tsx'), communicationTsx);

// 14. Reports
const reportsTsx = `"use client";
import { FileBarChart2 } from "lucide-react";
import { Panel } from "./shared";

export function DeputyReportsDownloadsWorkspace() {
  return (
    <Panel title="Reports & Downloads" description="Operational reports for meetings and review." icon={FileBarChart2}>
      <div className="grid gap-4 md:grid-cols-3">
        {["Daily Attendance Summary", "Daily Discipline Register", "Duty Roster Report", "Relief Lesson Report"].map(r => (
          <button key={r} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left font-bold text-[#071D49] hover:border-[#071D49] transition">{r}</button>
        ))}
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'reports-workspace.tsx'), reportsTsx);

// 15. Staff Roles
const staffRolesTsx = `"use client";
import { ShieldCheck } from "lucide-react";
import { Panel, StatusChip } from "./shared";

export function DeputyStaffRolesWorkspace() {
  return (
    <Panel title="Staff & Roles" description="Support staff management and teacher supervision." icon={ShieldCheck} actions={
      <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Assign Duty</button>
    }>
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Staff</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Role</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Department</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Duty Today</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr className="hover:bg-[#F8FAFC]">
              <td className="px-4 py-3 font-semibold text-[#071D49]">Ms. Naliaka</td>
              <td className="px-4 py-3 text-[#64748B]">Class Teacher</td>
              <td className="px-4 py-3 text-[#64748B]">Languages</td>
              <td className="px-4 py-3"><StatusChip label="Parade" tone="info" /></td>
              <td className="px-4 py-3 text-right">
                <button className="text-blue-600 hover:underline font-semibold text-xs">View</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'staff-roles-workspace.tsx'), staffRolesTsx);

// 16. Settings
const settingsTsx = `"use client";
import { Settings } from "lucide-react";
import { Panel } from "./shared";

export function DeputySettingsWorkspace() {
  const toggleTeaching = (e: any) => {
    window.dispatchEvent(new CustomEvent("deputy-teaching-toggle", { detail: e.target.checked }));
  };

  return (
    <Panel title="Settings" description="Personal settings and dashboard preferences." icon={Settings}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#D8E0EC] p-4">
          <h3 className="font-bold text-[#071D49] mb-4">Dashboard Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input type="checkbox" defaultChecked onChange={toggleTeaching} /> 
              Enable Teaching Workspace
            </label>
            <label className="flex items-center gap-2 text-sm text-[#334155]">
              <input type="checkbox" defaultChecked /> 
              Compact Mode
            </label>
          </div>
        </div>
      </div>
    </Panel>
  );
}`;
fs.writeFileSync(path.join(dir, 'settings-workspace.tsx'), settingsTsx);

console.log("Generated all 16 workspaces for Deputy Principal.");
