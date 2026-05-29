"use client";

import { Copy, Eye, Mail, RotateCcw, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import {
  addSchoolRecord,
  mergeSchoolRecordsById,
  publishSchoolOperationalEvent,
  readSchoolData,
  subscribeToSchoolDataUpdates,
  updateSchoolRecord,
  writeSchoolData,
} from "@/lib/school/school-operational-store";

type SchoolUserStatus = "Active" | "Pending" | "Suspended" | "Deactivated";
type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked";
type UserManagementTab = "users" | "invitations" | "invite" | "roles" | "inactive" | "audit";
type InviteDeliveryMethod = "SMS" | "Email" | "Copy link";

export type SchoolUserRecord = {
  id: string;
  schoolId: string;
  name: string;
  role: string;
  department: string;
  assignment: string;
  phone: string;
  email: string;
  status: SchoolUserStatus;
  lastActive: string;
  joinedAt: string;
  createdAt: string;
  statusReason?: string;
  statusChangedBy?: string;
  statusChangedAt?: string;
};

export type UserInvitationRecord = {
  id: string;
  schoolId: string;
  invitedName: string;
  phone: string;
  email: string;
  role: string;
  department: string;
  assignment: string;
  identifier: string;
  deliveryMethod: InviteDeliveryMethod;
  note: string;
  invitedByUserId: string;
  invitedByRole: string;
  invitationStatus: InvitationStatus;
  inviteCode: string;
  inviteToken: string;
  expiryDate: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
};

type UserManagementAuditRecord = {
  id: string;
  schoolId: string;
  action: string;
  actorUser: string;
  actorRole: string;
  target: string;
  timestamp: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  device?: string;
};

type InviteFormState = {
  fullName: string;
  phone: string;
  email: string;
  role: string;
  department: string;
  assignment: string;
  identifier: string;
  deliveryMethod: InviteDeliveryMethod;
  note: string;
};

const userModule = "school-users";
const invitationModule = "user-invitations";
const userAuditModule = "user-management-audit";

const schoolRoles = [
  "Principal",
  "Deputy Principal",
  "Secretary",
  "Accountant",
  "Teacher",
  "Dean of Academics",
  "Exams Manager",
  "Head of Department",
  "Class Teacher",
  "Grade/Form Master",
  "Nurse",
  "School Counsellor",
  "Discipline Master",
  "Librarian",
  "Parent",
  "Student",
  "Storekeeper",
  "Boarding Master",
  "Security Officer",
  "Transport Manager",
  "Laboratory Technician",
  "Admissions Officer",
  "ICT / Computer Lab user",
] as const;

const tabs: Array<{ id: UserManagementTab; label: string }> = [
  { id: "users", label: "All Users" },
  { id: "invitations", label: "Pending Invitations" },
  { id: "invite", label: "Invite New User" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "inactive", label: "Suspended / Deactivated" },
  { id: "audit", label: "Audit Log / Activity" },
];

function nowIso() {
  return new Date().toISOString();
}

function displayDate(value: string) {
  if (!value) return "Not recorded";

  try {
    return new Intl.DateTimeFormat("en-KE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function randomToken() {
  const bytes = new Uint8Array(12);

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 18).toUpperCase();
  }

  return Math.random().toString(36).slice(2, 14).toUpperCase();
}

function inviteExpiryDate(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function initialInviteForm(): InviteFormState {
  return {
    fullName: "",
    phone: "",
    email: "",
    role: "Teacher",
    department: "",
    assignment: "",
    identifier: "",
    deliveryMethod: "SMS",
    note: "",
  };
}

function seedSchoolUsers(schoolId: string): SchoolUserRecord[] {
  const createdAt = "2026-01-08T06:00:00.000Z";

  return [
    {
      id: `${schoolId}-principal-wanjiku`,
      schoolId,
      name: "Principal Wanjiku",
      role: "Principal",
      department: "School Administration",
      assignment: "School Principal",
      phone: "0700111222",
      email: "principal.wanjiku@kisumuboys.ac.ke",
      status: "Active",
      lastActive: "Today 8:15 AM",
      joinedAt: "2026-01-08",
      createdAt,
    },
    {
      id: `${schoolId}-deputy-otieno`,
      schoolId,
      name: "Mr. Otieno",
      role: "Deputy Principal",
      department: "Discipline and Operations",
      assignment: "Daily operations",
      phone: "0700222333",
      email: "deputy.otieno@kisumuboys.ac.ke",
      status: "Active",
      lastActive: "Today 8:27 AM",
      joinedAt: "2026-01-08",
      createdAt,
    },
    {
      id: `${schoolId}-secretary-achieng`,
      schoolId,
      name: "Mrs. Achieng",
      role: "Secretary",
      department: "Front Office",
      assignment: "Parent desk",
      phone: "0700333444",
      email: "secretary@kisumuboys.ac.ke",
      status: "Active",
      lastActive: "Today 9:05 AM",
      joinedAt: "2026-01-09",
      createdAt,
    },
    {
      id: `${schoolId}-accountant-mwangi`,
      schoolId,
      name: "Mr. Mwangi",
      role: "Accountant",
      department: "Finance",
      assignment: "Fees and M-Pesa",
      phone: "0700444555",
      email: "accounts@kisumuboys.ac.ke",
      status: "Active",
      lastActive: "Today 8:55 AM",
      joinedAt: "2026-01-09",
      createdAt,
    },
    {
      id: `${schoolId}-librarian-njeri`,
      schoolId,
      name: "Grace Njeri",
      role: "Librarian",
      department: "Library",
      assignment: "Library desk",
      phone: "0700555666",
      email: "library@kisumuboys.ac.ke",
      status: "Suspended",
      lastActive: "Yesterday 4:12 PM",
      joinedAt: "2026-01-11",
      createdAt,
      statusReason: "Temporary access review",
      statusChangedBy: "Principal Wanjiku",
      statusChangedAt: "2026-05-25T11:00:00.000Z",
    },
  ];
}

function seedInvitations(schoolId: string, actorRole: string): UserInvitationRecord[] {
  return [
    {
      id: `${schoolId}-invite-nurse-faith`,
      schoolId,
      invitedName: "Faith Akinyi",
      phone: "0710888999",
      email: "faith.akinyi@kisumuboys.ac.ke",
      role: "Nurse",
      department: "Sick Bay",
      assignment: "School clinic",
      identifier: "STAFF-NURSE-01",
      deliveryMethod: "SMS",
      note: "Join before Monday morning sick bay shift.",
      invitedByUserId: `${schoolId}-${slug(actorRole)}`,
      invitedByRole: actorRole,
      invitationStatus: "Pending",
      inviteCode: "INV-KBH-NURSE",
      inviteToken: `${schoolId}.seed.nurse`,
      expiryDate: inviteExpiryDate(5),
      createdAt: "2026-05-24T08:30:00.000Z",
      updatedAt: "2026-05-24T08:30:00.000Z",
    },
    {
      id: `${schoolId}-invite-security-david`,
      schoolId,
      invitedName: "David Kiptoo",
      phone: "0710999000",
      email: "",
      role: "Security Officer",
      department: "Security",
      assignment: "Main gate",
      identifier: "SEC-02",
      deliveryMethod: "Copy link",
      note: "Night shift access pending.",
      invitedByUserId: `${schoolId}-${slug(actorRole)}`,
      invitedByRole: actorRole,
      invitationStatus: "Expired",
      inviteCode: "INV-KBH-EXPIRED",
      inviteToken: `${schoolId}.seed.expired`,
      expiryDate: "2026-05-20T08:30:00.000Z",
      createdAt: "2026-05-12T08:30:00.000Z",
      updatedAt: "2026-05-20T08:30:00.000Z",
    },
  ];
}

function seedAudit(schoolId: string, actorRole: string, actorName: string): UserManagementAuditRecord[] {
  return [
    {
      id: `${schoolId}-audit-seed-invite`,
      schoolId,
      action: "User invited",
      actorUser: actorName,
      actorRole,
      target: "Faith Akinyi",
      timestamp: "2026-05-24T08:30:00.000Z",
      newValue: "Nurse invitation sent by SMS",
      reason: "Sick bay staffing",
      device: "School office browser",
    },
  ];
}

function statusTone(status: SchoolUserStatus | InvitationStatus) {
  if (status === "Active" || status === "Accepted") return "ok";
  if (status === "Pending") return "warning";
  return "critical";
}

function roleCanInvite(role: string) {
  return role === "Principal" || role === "Deputy Principal";
}

function rolePermissionSummary(role: string) {
  if (role === "Principal") return "Invite and manage all school users except Super Admins";
  if (role === "Deputy Principal") return "Invite school users and manage users when permission is enabled";
  if (role === "Accountant") return "Manage fee records, receipts, M-Pesa, and finance reports";
  if (role === "Teacher") return "Manage assigned classes, attendance, assignments, marks, and concerns";
  if (role === "Parent") return "View own child records, fees, reports, notices, and messages";
  if (role === "Student") return "View own timetable, assignments, results, library, and notices";
  return "Access only the role workspace and allowed school records";
}

export function UserManagementWorkspace({
  schoolId,
  schoolName = "Kisumu Boys High School",
  actorRole,
  actorName,
  canInviteUsers = true,
  canManageUsers = true,
}: {
  schoolId: string;
  schoolName?: string;
  actorRole: "Principal" | "Deputy Principal";
  actorName: string;
  canInviteUsers?: boolean;
  canManageUsers?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<UserManagementTab>("users");
  const [users, setUsers] = useState<SchoolUserRecord[]>([]);
  const [invitations, setInvitations] = useState<UserInvitationRecord[]>([]);
  const [auditRecords, setAuditRecords] = useState<UserManagementAuditRecord[]>([]);
  const [inviteForm, setInviteForm] = useState<InviteFormState>(() => initialInviteForm());
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [departmentFilter, setDepartmentFilter] = useState("All departments");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SchoolUserRecord | UserInvitationRecord | null>(null);
  const [editingUser, setEditingUser] = useState<SchoolUserRecord | null>(null);

  useEffect(() => {
    function hydrate() {
      setUsers(mergeSchoolRecordsById(seedSchoolUsers(schoolId), readSchoolData<SchoolUserRecord>(userModule, schoolId)));
      setInvitations(mergeSchoolRecordsById(seedInvitations(schoolId, actorRole), readSchoolData<UserInvitationRecord>(invitationModule, schoolId)));
      setAuditRecords(mergeSchoolRecordsById(seedAudit(schoolId, actorRole, actorName), readSchoolData<UserManagementAuditRecord>(userAuditModule, schoolId)));
    }

    hydrate();

    return subscribeToSchoolDataUpdates((detail) => {
      if (detail.schoolId === schoolId && [userModule, invitationModule, userAuditModule].includes(detail.moduleName)) {
        hydrate();
      }
    });
  }, [actorName, actorRole, schoolId]);

  const pendingInvitations = invitations.filter((invite) => invite.invitationStatus === "Pending");
  const inactiveUsers = users.filter((user) => user.status === "Suspended" || user.status === "Deactivated");
  const departmentOptions = useMemo(
    () => ["All departments", ...Array.from(new Set(users.map((user) => user.department).filter(Boolean)))],
    [users],
  );
  const filteredUsers = useMemo(() => {
    const query = normalize(userSearch);

    return users.filter((user) => {
      const haystack = [user.name, user.phone, user.email, user.role, user.department, user.assignment].join(" ").toLowerCase();
      const matchesQuery = !query || haystack.includes(query);
      const matchesRole = roleFilter === "All roles" || user.role === roleFilter;
      const matchesStatus = statusFilter === "All statuses" || user.status === statusFilter;
      const matchesDepartment = departmentFilter === "All departments" || user.department === departmentFilter;

      return matchesQuery && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [departmentFilter, roleFilter, statusFilter, userSearch, users]);

  function addUserAudit(action: string, target: string, oldValue?: string, newValue?: string, reason?: string) {
    const record = addSchoolRecord<UserManagementAuditRecord>(
      userAuditModule,
      {
        id: `user-audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        schoolId,
        action,
        actorUser: actorName,
        actorRole,
        target,
        timestamp: nowIso(),
        oldValue,
        newValue,
        reason,
        device: "Current browser",
      },
      schoolId,
    );

    setAuditRecords((current) => [record, ...current.filter((item) => item.id !== record.id)]);
    return record;
  }

  function publishUserEvent(type: string, title: string, body: string, entityId?: string) {
    publishSchoolOperationalEvent({
      schoolId,
      type,
      module: "user-management",
      actorRole,
      title,
      body,
      entityId,
      severity: "success",
      notifications: [{ audienceRoles: ["principal", "deputy-principal"], title, body }],
    });
  }

  function updateUserStatus(user: SchoolUserRecord, status: SchoolUserStatus, reason: string) {
    if (!canManageUsers) {
      setError("Your account can view users, but user management changes are not enabled.");
      return;
    }

    const updatedAt = nowIso();

    updateSchoolRecord<SchoolUserRecord>(
      userModule,
      user.id,
      {
        status,
        statusReason: reason,
        statusChangedBy: actorName,
        statusChangedAt: updatedAt,
      },
      schoolId,
    );
    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? { ...item, status, statusReason: reason, statusChangedBy: actorName, statusChangedAt: updatedAt }
          : item,
      ),
    );
    addUserAudit(`User ${status.toLowerCase()}`, user.name, user.status, status, reason);
    publishUserEvent("USER_STATUS_CHANGED", `User ${status.toLowerCase()}`, `${user.name} is now ${status.toLowerCase()} in ${schoolName}.`, user.id);
    setNotice(`${user.name} is now ${status}.`);
    setError(null);
  }

  function removeUser(user: SchoolUserRecord) {
    if (!canManageUsers) {
      setError("Your account can view users, but permanent removal is not enabled.");
      return;
    }

    const remaining = users.filter((item) => item.id !== user.id);
    writeSchoolData(userModule, remaining, schoolId);
    setUsers(remaining);
    addUserAudit("User removed", user.name, user.status, "Removed", "Removed from school user list");
    publishUserEvent("USER_REMOVED", "User removed", `${user.name} was removed from ${schoolName}.`, user.id);
    setNotice(`${user.name} removed from this school.`);
    setSelectedDetail(null);
  }

  function resendInvitation(invite: UserInvitationRecord) {
    if (invite.invitationStatus !== "Pending") {
      setError("Only pending invitations can be resent.");
      return;
    }

    const expiryDate = inviteExpiryDate(7);
    updateSchoolRecord<UserInvitationRecord>(invitationModule, invite.id, { expiryDate, updatedAt: nowIso() }, schoolId);
    setInvitations((current) =>
      current.map((item) => (item.id === invite.id ? { ...item, expiryDate, updatedAt: nowIso() } : item)),
    );
    addUserAudit("Invitation resent", invite.invitedName, invite.expiryDate, expiryDate, "Invitation resent");
    publishUserEvent("USER_INVITATION_RESENT", "Invitation resent", `${invite.invitedName} invitation was resent.`, invite.id);
    setNotice(`Invitation resent to ${invite.invitedName}.`);
    setError(null);
  }

  function revokeInvitation(invite: UserInvitationRecord) {
    if (invite.invitationStatus !== "Pending") {
      setError("Only pending invitations can be revoked.");
      return;
    }

    updateSchoolRecord<UserInvitationRecord>(invitationModule, invite.id, { invitationStatus: "Revoked", updatedAt: nowIso() }, schoolId);
    setInvitations((current) =>
      current.map((item) => (item.id === invite.id ? { ...item, invitationStatus: "Revoked", updatedAt: nowIso() } : item)),
    );
    addUserAudit("Invitation revoked", invite.invitedName, "Pending", "Revoked", "Invitation revoked before acceptance");
    publishUserEvent("USER_INVITATION_REVOKED", "Invitation revoked", `${invite.invitedName} invitation was revoked.`, invite.id);
    setNotice(`Invitation revoked for ${invite.invitedName}.`);
    setError(null);
  }

  function clearExpiredInvitation(invite: UserInvitationRecord) {
    if (invite.invitationStatus !== "Expired" && invite.invitationStatus !== "Revoked") {
      setError("Only expired or revoked invitations can be cleared.");
      return;
    }

    const remaining = invitations.filter((item) => item.id !== invite.id);
    writeSchoolData(invitationModule, remaining, schoolId);
    setInvitations(remaining);
    addUserAudit("Invitation cleared", invite.invitedName, invite.invitationStatus, "Cleared", "Expired or revoked invite cleared");
    setNotice(`${invite.invitedName} invitation cleared.`);
  }

  function copyInvitation(invite: UserInvitationRecord) {
    const link = `https://myshule.online/invite/${encodeURIComponent(invite.inviteToken)}`;
    void navigator.clipboard?.writeText(link).catch(() => undefined);
    setNotice(`${invite.invitedName} invite link/code is ready: ${invite.inviteCode}`);
    addUserAudit("Invitation copied", invite.invitedName, undefined, invite.inviteCode, "Invite link copied");
  }

  function resetPassword(user: SchoolUserRecord) {
    addUserAudit("Password reset link sent", user.name, undefined, "Reset link sent", "School admin requested reset");
    publishUserEvent("USER_PASSWORD_RESET_SENT", "Password reset link sent", `${user.name} password reset link was sent.`, user.id);
    setNotice(`Password reset link sent to ${user.name}.`);
  }

  function saveEditedUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingUser) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const updates = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      role: String(form.get("role") ?? editingUser.role),
      department: String(form.get("department") ?? "").trim(),
      assignment: String(form.get("assignment") ?? "").trim(),
    };

    if (!updates.name || !updates.phone || !updates.role) {
      setError("Name, phone, and role are required before saving.");
      return;
    }

    updateSchoolRecord<SchoolUserRecord>(userModule, editingUser.id, updates, schoolId);
    setUsers((current) => current.map((user) => (user.id === editingUser.id ? { ...user, ...updates } : user)));
    addUserAudit("User edited", editingUser.name, JSON.stringify({
      name: editingUser.name,
      role: editingUser.role,
      department: editingUser.department,
    }), JSON.stringify(updates), "User details updated");
    publishUserEvent("USER_UPDATED", "User updated", `${updates.name} user record was updated.`, editingUser.id);
    setNotice(`${updates.name} updated.`);
    setEditingUser(null);
    setError(null);
  }

  function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!canInviteUsers) {
      setError("Your account is not allowed to invite users.");
      return;
    }

    if (inviteForm.role === "Super Admin") {
      setError("School administrators cannot create Super Admin users.");
      return;
    }

    if (!inviteForm.fullName.trim() || !inviteForm.phone.trim() || !inviteForm.role.trim()) {
      setError("Full name, phone number, and role are required.");
      return;
    }

    const duplicateActiveUser = users.find((user) => {
      const samePhone = inviteForm.phone.trim() && normalize(user.phone) === normalize(inviteForm.phone);
      const sameEmail = inviteForm.email.trim() && normalize(user.email) === normalize(inviteForm.email);

      return user.status === "Active" && (samePhone || sameEmail);
    });

    if (duplicateActiveUser) {
      setError(`${duplicateActiveUser.name} already has an active user in this school.`);
      return;
    }

    const token = `${schoolId}.${randomToken()}.${Date.now()}`;
    const code = `INV-${randomToken().slice(0, 8)}`;
    const invite: UserInvitationRecord = {
      id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      schoolId,
      invitedName: inviteForm.fullName.trim(),
      phone: inviteForm.phone.trim(),
      email: inviteForm.email.trim(),
      role: inviteForm.role,
      department: inviteForm.department.trim(),
      assignment: inviteForm.assignment.trim(),
      identifier: inviteForm.identifier.trim(),
      deliveryMethod: inviteForm.deliveryMethod,
      note: inviteForm.note.trim(),
      invitedByUserId: `${schoolId}-${slug(actorName)}`,
      invitedByRole: actorRole,
      invitationStatus: "Pending",
      inviteCode: code,
      inviteToken: token,
      expiryDate: inviteExpiryDate(7),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    const saved = addSchoolRecord<UserInvitationRecord>(invitationModule, invite, schoolId);
    setInvitations((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    addUserAudit("User invited", invite.invitedName, undefined, `${invite.role} invitation via ${invite.deliveryMethod}`, invite.note);
    publishUserEvent("USER_INVITED", "User invited", `${invite.invitedName} was invited as ${invite.role} in ${schoolName}.`, invite.id);
    setInviteForm(initialInviteForm());
    setActiveTab("invitations");
    setNotice(
      invite.deliveryMethod === "Copy link"
        ? `Invitation created for ${invite.invitedName}. Copy link/code: ${invite.inviteCode}`
        : `Invitation created for ${invite.invitedName}. ${invite.deliveryMethod} invitation queued.`,
    );
  }

  return (
    <div className="space-y-4" data-testid="user-management-workspace">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#40608F]">School access control</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071D49]">Users & Invitations</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold leading-6 text-[#52657F]">
              {actorRole} can invite school users in {schoolName}. Records, invitations, and activity shown here are scoped to this school only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill label={`${users.filter((user) => user.status === "Active").length} active users`} tone="ok" />
            <StatusPill label={`${pendingInvitations.length} pending invites`} tone="warning" />
            <StatusPill label={`${inactiveUsers.length} inactive`} tone={inactiveUsers.length ? "critical" : "ok"} />
          </div>
        </div>
      </Card>

      {notice ? (
        <div className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-3 py-2 text-sm font-bold text-[#047857]" role="status">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm font-bold text-[#B91C1C]" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-black transition ${
              activeTab === tab.id
                ? "border-[#9BC5FF] bg-[#EEF6FF] text-[#0B3A7A]"
                : "border-[#D7E0EF] bg-white text-[#40608F] hover:border-[#9BC5FF]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "users" ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">Current school only</p>
              <h3 className="mt-1 text-lg font-black text-[#071D49]">All Users</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("invite")}
              className="inline-flex items-center gap-2 rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] px-3 py-2 text-sm font-black text-[#0B3A7A]"
            >
              <UserPlus className="h-4 w-4" />
              Open Invite Form
            </button>
          </div>
          <UserFilters
            search={userSearch}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            departmentFilter={departmentFilter}
            departmentOptions={departmentOptions}
            onSearch={setUserSearch}
            onRoleFilter={setRoleFilter}
            onStatusFilter={setStatusFilter}
            onDepartmentFilter={setDepartmentFilter}
          />
          {editingUser ? (
            <EditUserForm user={editingUser} onCancel={() => setEditingUser(null)} onSubmit={saveEditedUser} />
          ) : null}
          <UsersTable
            users={filteredUsers}
            canManageUsers={canManageUsers}
            onView={setSelectedDetail}
            onEdit={setEditingUser}
            onSuspend={(user) => updateUserStatus(user, "Suspended", "Suspended from school user management")}
            onDeactivate={(user) => updateUserStatus(user, "Deactivated", "Deactivated from school user management")}
            onReactivate={(user) => updateUserStatus(user, "Active", "Reactivated by school administrator")}
            onRemove={removeUser}
            onResetPassword={resetPassword}
          />
        </Card>
      ) : null}

      {activeTab === "invitations" ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">Expiry protected</p>
              <h3 className="mt-1 text-lg font-black text-[#071D49]">Pending Invitations</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("invite")}
              className="rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] px-3 py-2 text-sm font-black text-[#0B3A7A]"
            >
              Open Invite Form
            </button>
          </div>
          <InvitationsTable
            invitations={invitations}
            onView={setSelectedDetail}
            onResend={resendInvitation}
            onRevoke={revokeInvitation}
            onCopy={copyInvitation}
            onClear={clearExpiredInvitation}
          />
        </Card>
      ) : null}

      {activeTab === "invite" ? (
        <Card className="p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">School-scoped invite</p>
            <h3 className="mt-1 text-lg font-black text-[#071D49]">Invite New User</h3>
            <p className="mt-1 text-sm font-semibold text-[#52657F]">Super Admin accounts are excluded. Every invite receives this school ID and expires automatically.</p>
          </div>
          <form className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={createInvitation}>
            <FormField label="Full name" value={inviteForm.fullName} onChange={(value) => setInviteForm((form) => ({ ...form, fullName: value }))} required />
            <FormField label="Phone number" value={inviteForm.phone} onChange={(value) => setInviteForm((form) => ({ ...form, phone: value }))} required />
            <FormField label="Email address" value={inviteForm.email} onChange={(value) => setInviteForm((form) => ({ ...form, email: value }))} />
            <label className="grid gap-1 text-sm font-bold text-[#40608F]">
              Role
              <select
                value={inviteForm.role}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setInviteForm((form) => ({ ...form, role: value }));
                }}
                className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
              >
                {schoolRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <FormField label="Department" value={inviteForm.department} onChange={(value) => setInviteForm((form) => ({ ...form, department: value }))} />
            <FormField label="Class, grade, stream, or subject assignment" value={inviteForm.assignment} onChange={(value) => setInviteForm((form) => ({ ...form, assignment: value }))} />
            <FormField label="Staff/student/parent identifier" value={inviteForm.identifier} onChange={(value) => setInviteForm((form) => ({ ...form, identifier: value }))} />
            <label className="grid gap-1 text-sm font-bold text-[#40608F]">
              Send invite by
              <select
                value={inviteForm.deliveryMethod}
                onChange={(event) => {
                  const value = event.currentTarget.value as InviteDeliveryMethod;
                  setInviteForm((form) => ({ ...form, deliveryMethod: value }));
                }}
                className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
              >
                <option value="SMS">SMS</option>
                <option value="Email">Email</option>
                <option value="Copy link">Copy link</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#40608F] md:col-span-2 xl:col-span-3">
              Optional note/message
              <textarea
                value={inviteForm.note}
                onChange={(event) => setInviteForm((form) => ({ ...form, note: event.currentTarget.value }))}
                className="min-h-24 rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
              <button type="submit" className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#047857]">
                Send Invitation
              </button>
              <button type="button" onClick={() => setInviteForm(initialInviteForm())} className="rounded-xl border border-[#D7E0EF] bg-white px-4 py-2 text-sm font-black text-[#40608F]">
                Clear Form
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {activeTab === "roles" ? (
        <RolesPermissionsPanel users={users} actorRole={actorRole} />
      ) : null}

      {activeTab === "inactive" ? (
        <Card className="p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">Access blocked</p>
            <h3 className="mt-1 text-lg font-black text-[#071D49]">Suspended / Deactivated Users</h3>
          </div>
          <UsersTable
            users={inactiveUsers}
            canManageUsers={canManageUsers}
            onView={setSelectedDetail}
            onEdit={setEditingUser}
            onSuspend={(user) => updateUserStatus(user, "Suspended", "Suspended from school user management")}
            onDeactivate={(user) => updateUserStatus(user, "Deactivated", "Deactivated from school user management")}
            onReactivate={(user) => updateUserStatus(user, "Active", "Reactivated by school administrator")}
            onRemove={removeUser}
            onResetPassword={resetPassword}
          />
        </Card>
      ) : null}

      {activeTab === "audit" ? (
        <AuditPanel records={auditRecords} />
      ) : null}

      {selectedDetail ? (
        <DetailPanel record={selectedDetail} onClose={() => setSelectedDetail(null)} />
      ) : null}
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm font-bold text-[#40608F]">
      {label}
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
      />
    </label>
  );
}

function UserFilters({
  search,
  roleFilter,
  statusFilter,
  departmentFilter,
  departmentOptions,
  onSearch,
  onRoleFilter,
  onStatusFilter,
  onDepartmentFilter,
}: {
  search: string;
  roleFilter: string;
  statusFilter: string;
  departmentFilter: string;
  departmentOptions: string[];
  onSearch: (value: string) => void;
  onRoleFilter: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onDepartmentFilter: (value: string) => void;
}) {
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-4">
      <label className="relative md:col-span-1">
        <span className="sr-only">Search by name, phone, or email</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#40608F]" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.currentTarget.value)}
          placeholder="Search name, phone, email"
          className="w-full rounded-xl border border-[#D7E0EF] bg-white py-2 pl-9 pr-3 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
        />
      </label>
      <select aria-label="Filter by role" value={roleFilter} onChange={(event) => onRoleFilter(event.currentTarget.value)} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
        <option>All roles</option>
        {schoolRoles.map((role) => <option key={role}>{role}</option>)}
      </select>
      <select aria-label="Filter by status" value={statusFilter} onChange={(event) => onStatusFilter(event.currentTarget.value)} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
        <option>All statuses</option>
        <option>Active</option>
        <option>Pending</option>
        <option>Suspended</option>
        <option>Deactivated</option>
      </select>
      <select aria-label="Filter by department" value={departmentFilter} onChange={(event) => onDepartmentFilter(event.currentTarget.value)} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
        {departmentOptions.map((department) => <option key={department}>{department}</option>)}
      </select>
    </div>
  );
}

function UsersTable({
  users,
  canManageUsers,
  onView,
  onEdit,
  onSuspend,
  onDeactivate,
  onReactivate,
  onRemove,
  onResetPassword,
}: {
  users: SchoolUserRecord[];
  canManageUsers: boolean;
  onView: (user: SchoolUserRecord) => void;
  onEdit: (user: SchoolUserRecord) => void;
  onSuspend: (user: SchoolUserRecord) => void;
  onDeactivate: (user: SchoolUserRecord) => void;
  onReactivate: (user: SchoolUserRecord) => void;
  onRemove: (user: SchoolUserRecord) => void;
  onResetPassword: (user: SchoolUserRecord) => void;
}) {
  if (!users.length) {
    return (
      <p className="mt-4 rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] px-3 py-4 text-sm font-bold text-[#52657F]">
        No users match this view.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[980px] w-full text-left text-sm">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#597091]">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Department / Assignment</th>
            <th className="px-3 py-2">Phone</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Last active</th>
            <th className="px-3 py-2">Joined</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D7E0EF]">
          {users.map((user) => (
            <tr key={user.id} className="align-top">
              <td className="px-3 py-3 font-black text-[#071D49]">{user.name}</td>
              <td className="px-3 py-3 font-semibold text-[#40608F]">{user.role}</td>
              <td className="px-3 py-3 text-[#52657F]">
                <span className="block font-bold">{user.department || "Not assigned"}</span>
                <span>{user.assignment || "No class/department assignment"}</span>
              </td>
              <td className="px-3 py-3 text-[#52657F]">{user.phone}</td>
              <td className="px-3 py-3 text-[#52657F]">{user.email || "No email"}</td>
              <td className="px-3 py-3"><StatusPill label={user.status} tone={statusTone(user.status)} compact /></td>
              <td className="px-3 py-3 text-[#52657F]">{user.lastActive}</td>
              <td className="px-3 py-3 text-[#52657F]">{displayDate(user.joinedAt)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <SmallAction label="View details" icon={Eye} onClick={() => onView(user)} />
                  <SmallAction label="Edit user" onClick={() => onEdit(user)} disabled={!canManageUsers} />
                  <SmallAction label="Change role" onClick={() => onEdit(user)} disabled={!canManageUsers} />
                  {user.status === "Active" ? (
                    <>
                      <SmallAction label="Suspend" onClick={() => onSuspend(user)} disabled={!canManageUsers} tone="warning" />
                      <SmallAction label="Deactivate" onClick={() => onDeactivate(user)} disabled={!canManageUsers} tone="danger" />
                    </>
                  ) : (
                    <SmallAction label="Reactivate" icon={RotateCcw} onClick={() => onReactivate(user)} disabled={!canManageUsers} />
                  )}
                  <SmallAction label="Reset password" onClick={() => onResetPassword(user)} />
                  {user.status === "Deactivated" ? <SmallAction label="Remove" onClick={() => onRemove(user)} disabled={!canManageUsers} tone="danger" /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvitationsTable({
  invitations,
  onView,
  onResend,
  onRevoke,
  onCopy,
  onClear,
}: {
  invitations: UserInvitationRecord[];
  onView: (invite: UserInvitationRecord) => void;
  onResend: (invite: UserInvitationRecord) => void;
  onRevoke: (invite: UserInvitationRecord) => void;
  onCopy: (invite: UserInvitationRecord) => void;
  onClear: (invite: UserInvitationRecord) => void;
}) {
  if (!invitations.length) {
    return (
      <p className="mt-4 rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-3 py-4 text-sm font-bold text-[#047857]">
        No pending school invitations.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[940px] w-full text-left text-sm">
        <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#597091]">
          <tr>
            <th className="px-3 py-2">Invited name</th>
            <th className="px-3 py-2">Phone/email</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Invited by</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Date invited</th>
            <th className="px-3 py-2">Expiry date</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#D7E0EF]">
          {invitations.map((invite) => (
            <tr key={invite.id} className="align-top">
              <td className="px-3 py-3 font-black text-[#071D49]">{invite.invitedName}</td>
              <td className="px-3 py-3 text-[#52657F]">
                <span className="block font-bold">{invite.phone}</span>
                <span>{invite.email || "No email"}</span>
              </td>
              <td className="px-3 py-3 font-semibold text-[#40608F]">{invite.role}</td>
              <td className="px-3 py-3 text-[#52657F]">{invite.invitedByRole}</td>
              <td className="px-3 py-3"><StatusPill label={invite.invitationStatus} tone={statusTone(invite.invitationStatus)} compact /></td>
              <td className="px-3 py-3 text-[#52657F]">{displayDate(invite.createdAt)}</td>
              <td className="px-3 py-3 text-[#52657F]">{displayDate(invite.expiryDate)}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1.5">
                  <SmallAction label="View details" icon={Eye} onClick={() => onView(invite)} />
                  <SmallAction label="Resend invitation" icon={Mail} onClick={() => onResend(invite)} disabled={invite.invitationStatus !== "Pending"} />
                  <SmallAction label="Revoke invitation" onClick={() => onRevoke(invite)} disabled={invite.invitationStatus !== "Pending"} tone="danger" />
                  <SmallAction label="Copy invite link/code" icon={Copy} onClick={() => onCopy(invite)} />
                  {invite.invitationStatus === "Expired" || invite.invitationStatus === "Revoked" ? (
                    <SmallAction label="Clear expired" onClick={() => onClear(invite)} />
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RolesPermissionsPanel({ users, actorRole }: { users: SchoolUserRecord[]; actorRole: string }) {
  const countsByRole = new Map<string, number>();

  users.forEach((user) => countsByRole.set(user.role, (countsByRole.get(user.role) ?? 0) + 1));

  return (
    <Card className="p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">Permission summary</p>
        <h3 className="mt-1 text-lg font-black text-[#071D49]">Roles & Permissions</h3>
        <p className="mt-1 text-sm font-semibold text-[#52657F]">
          {actorRole === "Principal"
            ? "Principal can manage school users and assign school roles, but cannot create Super Admin accounts."
            : "Deputy Principal can invite school users and manage accounts only when the permission is enabled."}
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-[820px] w-full text-left text-sm">
          <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#597091]">
            <tr>
              <th className="px-3 py-2">Role name</th>
              <th className="px-3 py-2">Users</th>
              <th className="px-3 py-2">Permission summary</th>
              <th className="px-3 py-2">Can invite</th>
              <th className="px-3 py-2">Can manage users</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7E0EF]">
            {schoolRoles.map((role) => (
              <tr key={role}>
                <td className="px-3 py-3 font-black text-[#071D49]">{role}</td>
                <td className="px-3 py-3 text-[#52657F]">{countsByRole.get(role) ?? 0}</td>
                <td className="px-3 py-3 text-[#52657F]">{rolePermissionSummary(role)}</td>
                <td className="px-3 py-3"><StatusPill label={roleCanInvite(role) ? "Yes" : "No"} tone={roleCanInvite(role) ? "ok" : "warning"} compact /></td>
                <td className="px-3 py-3"><StatusPill label={role === "Principal" || role === "Deputy Principal" ? "Yes" : "No"} tone={role === "Principal" || role === "Deputy Principal" ? "ok" : "warning"} compact /></td>
                <td className="px-3 py-3"><SmallAction label="View permissions" icon={ShieldCheck} onClick={() => undefined} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AuditPanel({ records }: { records: UserManagementAuditRecord[] }) {
  return (
    <Card className="p-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">School-scoped activity</p>
        <h3 className="mt-1 text-lg font-black text-[#071D49]">Audit Log / Activity</h3>
      </div>
      {records.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase tracking-[0.12em] text-[#597091]">
              <tr>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Target</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Old value</th>
                <th className="px-3 py-2">New value</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7E0EF]">
              {records.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-3 font-black text-[#071D49]">{record.action}</td>
                  <td className="px-3 py-3 text-[#52657F]">{record.actorUser} ({record.actorRole})</td>
                  <td className="px-3 py-3 text-[#52657F]">{record.target}</td>
                  <td className="px-3 py-3 text-[#52657F]">{displayDate(record.timestamp)}</td>
                  <td className="px-3 py-3 text-[#52657F]">{record.oldValue || "-"}</td>
                  <td className="px-3 py-3 text-[#52657F]">{record.newValue || "-"}</td>
                  <td className="px-3 py-3 text-[#52657F]">{record.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-3 py-4 text-sm font-bold text-[#047857]">
          No user management activity yet.
        </p>
      )}
    </Card>
  );
}

function EditUserForm({
  user,
  onCancel,
  onSubmit,
}: {
  user: SchoolUserRecord;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="mt-4 grid gap-3 rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] p-3 md:grid-cols-2 xl:grid-cols-3" onSubmit={onSubmit}>
      <input type="hidden" name="id" defaultValue={user.id} />
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Name
        <input name="name" defaultValue={user.name} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Phone
        <input name="phone" defaultValue={user.phone} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Email
        <input name="email" defaultValue={user.email} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Role
        <select name="role" defaultValue={user.role} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
          {schoolRoles.map((role) => <option key={role}>{role}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Department
        <input name="department" defaultValue={user.department} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Assignment
        <input name="assignment" defaultValue={user.assignment} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
        <button type="submit" className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#047857]">Save User</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-[#D7E0EF] bg-white px-4 py-2 text-sm font-black text-[#40608F]">Cancel</button>
      </div>
    </form>
  );
}

function DetailPanel({
  record,
  onClose,
}: {
  record: SchoolUserRecord | UserInvitationRecord;
  onClose: () => void;
}) {
  const entries = Object.entries(record).filter(([key]) => !["inviteToken"].includes(key));

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#40608F]">Details</p>
          <h3 className="mt-1 text-lg font-black text-[#071D49]">{"name" in record ? record.name : record.invitedName}</h3>
        </div>
        <button type="button" onClick={onClose} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-black text-[#40608F]">
          Close
        </button>
      </div>
      <dl className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] px-3 py-2">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[#597091]">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 break-words text-sm font-bold text-[#071D49]">{String(value || "-")}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function SmallAction({
  label,
  onClick,
  disabled,
  tone,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "warning" | "danger";
  icon?: typeof Eye;
}) {
  const toneClass = tone === "danger"
    ? "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]"
    : tone === "warning"
      ? "border-[#FED7AA] bg-[#FFF7ED] text-[#C2410C]"
      : "border-[#BFD7FF] bg-[#EEF6FF] text-[#0B3A7A]";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-black disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}
