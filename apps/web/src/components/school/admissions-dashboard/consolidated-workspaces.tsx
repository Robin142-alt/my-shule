"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { StudentAdmissionWizard } from "./student-admission-wizard";
import { StudentBulkAdmission } from "./student-bulk-admission";
import { ApplicationsWorkspace } from "./applications-workspace";
import { CommunicationWorkspace } from "./communication-workspace";

const loading = () => <p role="status" className="p-4 text-sm text-muted">Loading workspace…</p>;
const Documents = dynamic(() => import("../admissions/documents-workspace").then(m => m.DocumentsWorkspace), { loading });
const Placement = dynamic(() => import("../admissions/class-placement-workspace").then(m => m.ClassPlacementWorkspace), { loading });
const Fees = dynamic(() => import("./fee-clearance-workspace").then(m => m.FeeClearanceWorkspace), { loading });
const Enquiries = dynamic(() => import("./enquiries-workspace").then(m => m.EnquiriesWorkspace), { loading });
const Tasks = dynamic(() => import("./tasks-workspace").then(m => m.TasksWorkspace), { loading });
const Templates = dynamic(() => import("./templates-workspace").then(m => m.TemplatesWorkspace), { loading });
const Appointments = dynamic(() => import("./appointments-workspace").then(m => m.AppointmentsWorkspace), { loading });

export function AdmitStudentWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return <StudentAdmissionWizard
    onCancel={() => router.push("/school/admissions/enrolment")}
    onAdmitted={() => queryClient.invalidateQueries({ queryKey: ["school"] })}
  />;
}

export function BulkAdmissionsWorkspace() {
  const queryClient = useQueryClient();
  return <StudentBulkAdmission initiallyExpanded onCompleted={() => queryClient.invalidateQueries({ queryKey: ["school"] })} />;
}

export function AdmissionRecordsWorkspace({ initialSection }: { initialSection?: string }) {
  const [view, setView] = useState(initialSection === "documents" ? "documents" : ["placement", "class-placement"].includes(initialSection ?? "") ? "placement" : initialSection === "fee-clearance" ? "fees" : "records");
  return <div className="space-y-3">
    <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">Admission Records
      <select aria-label="Record tools" className="min-h-11 rounded-xl border border-border bg-white px-3" value={view} onChange={e => setView(e.target.value)}>
        <option value="records">Students & applications</option><option value="documents">Supporting documents</option><option value="placement">Class placement changes</option><option value="fees">Fee clearance</option>
      </select>
    </label>
    {view === "records" ? <ApplicationsWorkspace /> : view === "documents" ? <Documents /> : view === "placement" ? <Placement /> : <Fees />}
  </div>;
}

export function AdmissionsCommunicationWorkspace({ initialSection }: { initialSection?: string }) {
  const [view, setView] = useState(["enquiries", "tasks", "templates", "appointments"].includes(initialSection ?? "") ? initialSection! : "messages");
  return <div className="space-y-3">
    <label className="flex flex-wrap items-center gap-3 text-sm font-semibold">Communication
      <select aria-label="Communication tools" className="min-h-11 rounded-xl border border-border bg-white px-3" value={view} onChange={e => setView(e.target.value)}>
        <option value="messages">Messages</option><option value="enquiries">Enquiries</option><option value="tasks">Follow-up tasks</option><option value="appointments">Appointments</option><option value="templates">Message templates</option>
      </select>
    </label>
    {view === "messages" ? <CommunicationWorkspace /> : view === "enquiries" ? <Enquiries /> : view === "tasks" ? <Tasks /> : view === "appointments" ? <Appointments /> : <Templates />}
  </div>;
}
