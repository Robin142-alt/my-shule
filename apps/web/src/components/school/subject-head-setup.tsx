"use client";

import { useState } from "react";
import { AcademicFoundationWorkspace } from "./academic-foundation-workspace";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { useSchoolCommandIdentity } from "./integrated-school-command-header";

export function SubjectHeadSetup() {
  const [open, setOpen] = useState(false);
  const tenantId = useOptionalSchoolTenantId();
  const dashboard = useOptionalSchoolDashboardRole();
  const { schoolName } = useSchoolCommandIdentity();
  const { hasPermission } = usePermissions();
  if (!tenantId || !hasPermission("academics:assign-teachers")) return null;
  return <div className="my-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-slate-900">
    <h3 className="font-semibold">Head of Subject access</h3>
    <p className="mt-1 text-sm">Invite staff as Head of Subject. After they accept, assign their subject and effective dates here. For existing staff, set their account role to Head of Subject and assign their subject. Appointment dates control access to subject results.</p>
    <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 rounded-lg border border-blue-700 bg-white px-4 py-2 text-sm font-semibold text-blue-800">Manage subject appointments</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Manage subject appointments" description="Assign active staff to subjects, transfer responsibility, or end an appointment. Staff must accept their invitation first." size="xl" mobileFullScreen>
      <div className="rounded-xl bg-[#071D49] p-4">
        <AcademicFoundationWorkspace actorRole={dashboard?.activeAuthorizationRoleCode === "deputy_principal" ? "Deputy Principal" : "Principal"} schoolName={schoolName} tenantId={tenantId} initialTab="roles-curriculum" initialRoleType="head_of_subject" />
      </div>
    </Modal>
  </div>;
}
