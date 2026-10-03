"use client";

import { useState } from "react";
import { permissionAllows } from "@/components/providers/permission-context";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { DeputyTimetableManagementWorkspace } from "../deputy-principal/timetable-management-workspace";
import { TimetableWorkspace } from "./timetable-workspace";

export function useCanManageSchoolTimetable() {
  const role = useOptionalSchoolDashboardRole();
  return permissionAllows(role?.authenticatedUser?.permissions ?? [], "timetable:write");
}

export function AppointedTimetableWorkspace() {
  const canManage = useCanManageSchoolTimetable();
  const [personal, setPersonal] = useState(false);
  if (!canManage) return <TimetableWorkspace />;
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2" aria-label="Timetable workspace">
      <button type="button" aria-pressed={!personal} onClick={() => setPersonal(false)} className="min-h-11 rounded-lg border border-border bg-surface px-4 font-bold">Timetable &amp; Relief</button>
      <button type="button" aria-pressed={personal} onClick={() => setPersonal(true)} className="min-h-11 rounded-lg border border-border bg-surface px-4 font-bold">My teaching timetable</button>
    </div>
    {personal ? <TimetableWorkspace /> : <DeputyTimetableManagementWorkspace />}
  </div>;
}
