const fs = require('fs');
const path = require('path');

const baseDir = 'apps/web/src/components/school/class-teacher';
const workspacesDir = path.join(baseDir, 'workspaces');

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}
if (!fs.existsSync(workspacesDir)) {
  fs.mkdirSync(workspacesDir, { recursive: true });
}

// 1. Create shared.tsx
const sharedCode = `import { type ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export type Tone = "success" | "info" | "warning" | "danger" | "neutral";
export type TeacherView = 
  | "home" | "register" | "attendance" | "progress" | "comments" 
  | "discipline" | "welfare" | "health" | "fees" | "communication" 
  | "meetings" | "homework" | "timetable" | "documents" | "requests" 
  | "reports" | "notifications" | "settings";

export const toneClasses: Record<Tone, { card: string; chip: string; dot: string; text: string }> = {
  success: { card: "border-emerald-200 bg-emerald-50 text-emerald-900", chip: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500", text: "text-emerald-700" },
  info: { card: "border-blue-200 bg-blue-50 text-blue-950", chip: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500", text: "text-blue-700" },
  warning: { card: "border-amber-200 bg-amber-50 text-amber-950", chip: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500", text: "text-amber-700" },
  danger: { card: "border-rose-200 bg-rose-50 text-rose-950", chip: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500", text: "text-rose-700" },
  neutral: { card: "border-slate-200 bg-white text-[#071D49]", chip: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400", text: "text-slate-600" },
};

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusChip({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold", toneClasses[tone].chip)}>
      <span className={cn("h-2 w-2 rounded-full", toneClasses[tone].dot)} />
      {label}
    </span>
  );
}

export function Panel({ title, description, icon: Icon, children, actions }: { title: string; description?: string; icon?: LucideIcon; children: ReactNode; actions?: ReactNode; }) {
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
        {actions}
      </div>
      {children}
    </section>
  );
}
`;
fs.writeFileSync(path.join(baseDir, 'shared.tsx'), sharedCode);

// 2. Generate Workspace Files
const workspaces = [
  { id: "home", label: "Overview", icon: "Home", component: "OverviewWorkspace", group: "Overview", desc: "This is the Class Teacher’s command center. It shows the class condition today." },
  { id: "register", label: "My Class Register", icon: "Users", component: "ClassRegisterWorkspace", group: "Class Operations", desc: "Shows all learners officially assigned to the class/stream." },
  { id: "attendance", label: "Attendance", icon: "ClipboardCheck", component: "AttendanceWorkspace", group: "Class Operations", desc: "Daily class roll call. This is one of the most important Class Teacher tasks." },
  { id: "progress", label: "Academic Progress", icon: "GraduationCap", component: "AcademicProgressWorkspace", group: "Academics", desc: "Class Teacher monitors overall academic performance of the assigned class." },
  { id: "comments", label: "Report Card Comments", icon: "FileSignature", component: "ReportCommentsWorkspace", group: "Academics", desc: "Class Teacher adds final comments before report cards are approved/published." },
  { id: "discipline", label: "Discipline & Behaviour", icon: "ShieldAlert", component: "DisciplineWorkspace", group: "Student Welfare", desc: "Class Teacher sees class-level behaviour issues and records minor incidents." },
  { id: "welfare", label: "Welfare & Counselling", icon: "HeartPulse", component: "WelfareWorkspace", group: "Student Welfare", desc: "Class Teacher identifies learners who may need extra support and refers them safely." },
  { id: "health", label: "Health Notes", icon: "Stethoscope", component: "HealthNotesWorkspace", group: "Student Welfare", desc: "Shows safe learner health alerts and nurse-related class follow-ups." },
  { id: "fees", label: "Fees Follow-up", icon: "Banknote", component: "FeesWorkspace", group: "Administration", desc: "Class Teacher can see basic fee status for follow-up." },
  { id: "communication", label: "Parent Communication", icon: "MessageCircle", component: "CommunicationWorkspace", group: "Communication", desc: "Send and track parent/guardian communication for the class." },
  { id: "meetings", label: "Meetings & Appointments", icon: "Calendar", component: "MeetingsWorkspace", group: "Communication", desc: "Track parent meetings and learner follow-ups." },
  { id: "homework", label: "Homework & Class Tasks", icon: "BookOpenCheck", component: "HomeworkWorkspace", group: "Planning", desc: "Class Teacher can view class-wide homework/task load and create class notices or tasks." },
  { id: "timetable", label: "Timetable", icon: "CalendarDays", component: "TimetableWorkspace", group: "Planning", desc: "Class Teacher views the class timetable and daily schedule." },
  { id: "documents", label: "Documents & Letters", icon: "FolderOpen", component: "DocumentsWorkspace", group: "Resources", desc: "Generate class-related printable documents." },
  { id: "requests", label: "Requests & Approvals", icon: "CheckSquare", component: "RequestsWorkspace", group: "Resources", desc: "Class Teacher creates requests that need action from other roles." },
  { id: "reports", label: "Reports & Downloads", icon: "FileText", component: "ReportsWorkspace", group: "Resources", desc: "Generate class-level reports for daily, weekly, termly, and end-term use." },
  { id: "notifications", label: "Notifications", icon: "Bell", component: "NotificationsWorkspace", group: "System", desc: "Shows all tasks, alerts, replies, approvals, and system messages relevant to the Class Teacher." },
  { id: "settings", label: "Settings", icon: "Settings", component: "SettingsWorkspace", group: "System", desc: "Small class-level preferences." },
];

function generateWorkspaceCode(ws) {
  let innerContent = '';
  
  if (ws.id === 'home') {
    innerContent = `
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Total Learners: 46</div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Present Today: 43</div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 font-bold text-rose-700">Absent Today: 3</div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 font-bold text-[#071D49]">Fee Arrears: 7</div>
      </div>
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-black uppercase text-[#64748B]">Urgent Follow-ups</h3>
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm text-[#071D49]">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="p-3 font-semibold">Learner</th>
                <th className="p-3 font-semibold">Issue</th>
                <th className="p-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              <tr>
                <td className="p-3 font-medium">Brian Otieno</td>
                <td className="p-3 text-rose-600">Absent 3 days straight</td>
                <td className="p-3"><button className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">Contact Parent</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>`;
  } else if (ws.id === 'register') {
    innerContent = `
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Adm No.</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Gender</th>
              <th className="p-3 font-semibold">Parent Phone</th>
              <th className="p-3 font-semibold">Status</th>
              <th className="p-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr>
              <td className="p-3">2041</td>
              <td className="p-3 font-bold">Brian Otieno</td>
              <td className="p-3">Male</td>
              <td className="p-3">+254712345678</td>
              <td className="p-3"><StatusChip label="Active" tone="success"/></td>
              <td className="p-3 text-right">
                 <button onClick={() => onSelectLearner?.("Brian Otieno")} className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">View Profile</button>
              </td>
            </tr>
            <tr>
              <td className="p-3">2042</td>
              <td className="p-3 font-bold">Mary Wanjiku</td>
              <td className="p-3">Female</td>
              <td className="p-3">+254722345678</td>
              <td className="p-3"><StatusChip label="Active" tone="success"/></td>
              <td className="p-3 text-right">
                 <button onClick={() => onSelectLearner?.("Mary Wanjiku")} className="rounded bg-[#EEF5FF] px-2 py-1 text-xs font-bold text-[#1D4ED8]">View Profile</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>`;
  } else if (ws.id === 'attendance') {
     innerContent = `
       <div className="mb-4 flex gap-2">
         <button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark All Present</button>
         <button className="rounded-lg border border-[#D8E0EC] bg-white px-4 py-2 text-sm font-black text-[#071D49]">Save Draft</button>
         <button className="rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-black text-white">Submit Final</button>
       </div>
       <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Adm No.</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Attendance</th>
              <th className="p-3 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            <tr>
              <td className="p-3">2041</td>
              <td className="p-3 font-bold">Brian Otieno</td>
              <td className="p-3">
                 <select className="rounded border border-[#D8E0EC] p-1 text-sm bg-white" defaultValue="absent">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                 </select>
              </td>
              <td className="p-3"><input type="text" className="w-full rounded border border-[#D8E0EC] p-1 text-sm" placeholder="e.g. sick" /></td>
            </tr>
            <tr>
              <td className="p-3">2042</td>
              <td className="p-3 font-bold">Mary Wanjiku</td>
              <td className="p-3">
                 <select className="rounded border border-[#D8E0EC] p-1 text-sm bg-white" defaultValue="present">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                 </select>
              </td>
              <td className="p-3"><input type="text" className="w-full rounded border border-[#D8E0EC] p-1 text-sm" /></td>
            </tr>
          </tbody>
        </table>
      </div>
     `;
  } else if (ws.id === 'progress') {
     innerContent = `
       <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-center">
          <span className="block text-xs uppercase text-[#64748B]">Class Mean Score</span>
          <span className="block text-2xl font-black text-[#071D49]">56.4%</span>
        </div>
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-center">
          <span className="block text-xs uppercase text-[#64748B]">Class Grade</span>
          <span className="block text-2xl font-black text-[#071D49]">C+</span>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
          <span className="block text-xs uppercase text-rose-700">Missing Marks</span>
          <span className="block text-2xl font-black text-rose-700">2 Subjects</span>
        </div>
      </div>
     `;
  } else if (ws.id === 'comments') {
     innerContent = `
       <div className="space-y-4">
         <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <h3 className="font-bold text-[#071D49]">Brian Otieno</h3>
            <p className="text-sm text-[#64748B] mb-2">Mean Score: 45% (Grade D+) | Pos: 34/46</p>
            <textarea className="w-full rounded-lg border border-[#D8E0EC] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#071D49]/20" rows={3} placeholder="Enter final class teacher comment..."></textarea>
            <div className="mt-2 flex gap-2">
               <button className="rounded bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Has Improved</button>
               <button className="rounded bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">Needs Effort</button>
            </div>
         </div>
       </div>
     `;
  } else {
    innerContent = `
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-[#64748B]/30 mb-4" />
        <p className="text-lg font-semibold text-[#071D49]">${ws.label} Workspace Ready</p>
        <p className="mt-2 text-sm text-[#64748B]">This module is fully structured and awaiting live API integration.</p>
        <div className="mt-6 w-full max-w-2xl text-left border border-[#D8E0EC] rounded-xl overflow-hidden">
           <table className="w-full text-sm text-[#071D49]">
              <thead className="bg-[#F8FAFC]"><tr><th className="p-3">Dummy Column 1</th><th className="p-3">Dummy Column 2</th></tr></thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                 <tr><td className="p-3">Sample Data 1</td><td className="p-3">Sample Action</td></tr>
                 <tr><td className="p-3">Sample Data 2</td><td className="p-3">Sample Action</td></tr>
              </tbody>
           </table>
        </div>
      </div>`;
  }

  return `import { AlertTriangle, ${ws.icon} } from "lucide-react";
import { Panel, StatusChip } from "../shared";

export function ${ws.component}(${ws.id === 'register' ? '{ onSelectLearner }: { onSelectLearner?: (id: string) => void }' : ''}) {
  return (
    <Panel title="${ws.label}" description="${ws.desc}" icon={${ws.icon}}>
${innerContent}
    </Panel>
  );
}
`;
}

workspaces.forEach(ws => {
  fs.writeFileSync(path.join(workspacesDir, ws.id + '.tsx'), generateWorkspaceCode(ws));
});

// 3. Update class-teacher-command-center.tsx
let centerCode = `// GENERATED AND SPLIT BY scaffold_class_teacher_split.js
"use client";

import { useState } from "react";
import {
  Bell, BookOpenCheck, Calendar, CalendarDays, CheckSquare,
  ClipboardCheck, FileSignature, FileText, FolderOpen, GraduationCap,
  HeartPulse, Home, MessageCircle, Settings, ShieldAlert,
  Stethoscope, Banknote, Users, X
} from "lucide-react";

import { type TeacherView, StatusChip, cn } from "./class-teacher/shared";
${workspaces.map(w => `import { ${w.component} } from "./class-teacher/workspaces/${w.id}";`).join('\n')}

const navItems = [
${workspaces.map(w => `  { id: "${w.id}", label: "${w.label}", icon: ${w.icon}, group: "${w.group}" },`).join("\n")}
];

function LearnerProfileDrawer({ learnerId, onClose }: { learnerId: string | null; onClose: () => void; }) {
  if (!learnerId) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#071D49]/20 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-[#D8E0EC] overflow-y-auto">
        <header className="sticky top-0 bg-white/95 backdrop-blur z-10 border-b border-[#D8E0EC] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[#071D49] text-white flex items-center justify-center font-black">
              {learnerId.substring(0,2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-black text-[#071D49]">Learner Profile</h2>
              <p className="text-xs font-semibold text-[#64748B]">{learnerId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F3F6FA] rounded-full transition text-[#64748B]">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="p-4 space-y-6">
          <section className="space-y-3">
             <h3 className="text-xs font-black uppercase tracking-widest text-[#64748B]">Quick Actions</h3>
             <div className="flex flex-wrap gap-2">
               <button className="rounded-full bg-[#071D49] px-3 py-1.5 text-xs font-black text-white">Message Parent</button>
               <button className="rounded-full border border-[#D8E0EC] px-3 py-1.5 text-xs font-black text-[#071D49]">Add Class Note</button>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function ClassTeacherCommandCenter() {
  const [activeView, setActiveView] = useState<TeacherView>("home");
  const [selectedLearner, setSelectedLearner] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen bg-[#F3F6FA]">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 min-w-0 flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
${workspaces.map(w => {
  if (w.id === 'register') {
     return `          {activeView === "${w.id}" && <${w.component} onSelectLearner={setSelectedLearner} />}`;
  }
  return `          {activeView === "${w.id}" && <${w.component} />}`;
}).join('\n')}
        </div>
      </main>
      <LearnerProfileDrawer learnerId={selectedLearner} onClose={() => setSelectedLearner(null)} />
    </div>
  );
}

function Sidebar({ activeView, onViewChange }: { activeView: TeacherView; onViewChange: (v: TeacherView) => void; }) {
  return (
    <aside className="hidden h-screen w-[260px] overflow-y-auto bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:block shrink-0">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
        <h2 className="mt-2 text-xl font-black">Class Teacher</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">Form 2 Blue</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item, index) => {
          const showGroup = item.group !== navItems[index - 1]?.group;
          const Icon = item.icon;
          return (
            <div key={item.group + '-' + item.label}>
              {showGroup ? <p className="px-3 pb-2 pt-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{item.group}</p> : null}
              <button
                onClick={() => onViewChange(item.id as TeacherView)}
                className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white", activeView === item.id && "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]")}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

function Topbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">CT</div>
          <h1 className="text-lg font-black text-[#071D49]">Class Teacher Workspace</h1>
        </div>
      </div>
    </header>
  );
}
`;

fs.writeFileSync('apps/web/src/components/school/class-teacher-command-center.tsx', centerCode);
console.log('Successfully generated separate workspaces and updated command center.');
