"use client";

import { Copy, Eye, Lock, Mail, RotateCcw, Search, ShieldCheck, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import { requestPasswordRecovery } from "@/lib/auth/recovery-client";
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
type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked" | "Email Failed";
type UserManagementTab = "users" | "invitations" | "invite" | "roles" | "inactive" | "audit";
type InviteDeliveryMethod = "SMS" | "Email" | "Copy link";
type PendingStatusChange = {
  user: SchoolUserRecord;
  status: "Active" | "Suspended" | "Deactivated";
  reason: string;
};

export type SchoolUserRecord = {
  id: string;
  schoolId: string;
  name: string;
  role: string;
  department: string;
  assignment: string;
  phone: string;
  email: string;
  tscNumber?: string;
  employmentType?: "BOM" | "TSC" | "Intern" | "Non-Teaching" | string;
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
  tscNumber?: string;
  employmentType?: string;
  identifier: string;
  deliveryMethod: InviteDeliveryMethod;
  note: string;
};

type ManagedUserApi = {
  id?: string;
  kind?: "member" | "invitation";
  display_name?: string;
  email?: string;
  phone?: string;
  role_code?: string;
  role_name?: string;
  department?: string;
  assignment?: string;
  tsc_number?: string;
  employment_type?: string;
  status?: "active" | "suspended" | "deactivated" | "invited" | "expired" | "revoked" | "accepted" | "email_failed" | "failed";
  created_at?: string;
  joined_at?: string;
  last_active_at?: string;
  invited_by_role?: string;
  expires_at?: string;
  invite_code?: string;
  invitation_sent?: boolean;
  invitation_message?: string;
  invitation_action_required?: string;
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

const roleCodeByLabel: Record<string, string> = {
  Principal: "principal",
  "Deputy Principal": "deputy_principal",
  Secretary: "secretary",
  Accountant: "accountant",
  Teacher: "teacher",
  "Dean of Academics": "dean_academics",
  "Exams Manager": "exams_manager",
  "Head of Department": "hod",
  "Class Teacher": "class_teacher",
  "Grade/Form Master": "grade_master",
  Nurse: "nurse",
  "School Counsellor": "school_counsellor",
  "Discipline Master": "discipline_master",
  Librarian: "librarian",
  Parent: "parent",
  Student: "student",
  Storekeeper: "storekeeper",
  "Boarding Master": "boarding_master",
  "Security Officer": "security_officer",
  "Transport Manager": "transport_manager",
  "Laboratory Technician": "lab_technician",
  "Admissions Officer": "admissions_officer",
  "ICT / Computer Lab user": "ict_manager",
};

const roleLabelByCode = Object.fromEntries(
  Object.entries(roleCodeByLabel).map(([label, code]) => [code, label]),
);

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

function roleCodeForLabel(label: string) {
  return roleCodeByLabel[label] ?? slug(label).replace(/-/g, "_");
}

function roleLabelForCode(code?: string, fallback?: string) {
  if (!code) {
    return fallback ?? "School User";
  }

  return roleLabelByCode[code] ?? fallback ?? code.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
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
    tscNumber: "",
    employmentType: "",
    identifier: "",
    deliveryMethod: "Email",
    note: "",
  };
}

function apiStatusToUserStatus(status: ManagedUserApi["status"]): SchoolUserStatus {
  if (status === "suspended") return "Suspended";
  if (status === "deactivated" || status === "revoked") return "Deactivated";
  return "Active";
}

function apiStatusToInvitationStatus(status: ManagedUserApi["status"]): InvitationStatus {
  if (status === "accepted") return "Accepted";
  if (status === "expired") return "Expired";
  if (status === "revoked") return "Revoked";
  if (status === "email_failed" || status === "failed") return "Email Failed";
  return "Pending";
}

function apiUserToSchoolUser(user: ManagedUserApi, schoolId: string): SchoolUserRecord {
  const role = roleLabelForCode(user.role_code, user.role_name);
  const createdAt = user.created_at ?? nowIso();

  return {
    id: user.id ?? `${schoolId}-${slug(user.email ?? user.display_name ?? role)}`,
    schoolId,
    name: user.display_name ?? user.email ?? "School user",
    role,
    department: user.department ?? "School access",
    assignment: user.assignment ?? role,
    phone: user.phone ?? "",
    email: user.email ?? "",
    tscNumber: user.tsc_number,
    employmentType: user.employment_type,
    status: apiStatusToUserStatus(user.status),
    lastActive: user.last_active_at ? displayDate(user.last_active_at) : "Not yet active today",
    joinedAt: user.joined_at ?? createdAt,
    createdAt,
  };
}

function apiUserToInvitation(user: ManagedUserApi, schoolId: string, actorRole: string): UserInvitationRecord {
  const role = roleLabelForCode(user.role_code, user.role_name);
  const createdAt = user.created_at ?? nowIso();

  return {
    id: user.id ?? `${schoolId}-invite-${slug(user.email ?? user.display_name ?? role)}`,
    schoolId,
    invitedName: user.display_name ?? user.email ?? "Invited user",
    phone: user.phone ?? "",
    email: user.email ?? "",
    role,
    department: user.department ?? "School access",
    assignment: user.assignment ?? role,
    identifier: "",
    deliveryMethod: user.email ? "Email" : "Copy link",
    note: "Loaded from live school access service",
    invitedByUserId: `${schoolId}-${slug(user.invited_by_role ?? actorRole)}`,
    invitedByRole: user.invited_by_role ?? actorRole,
    invitationStatus: apiStatusToInvitationStatus(user.status),
    inviteCode: user.invite_code ?? "Hidden after delivery",
    inviteToken: `${schoolId}.live.${user.id ?? slug(user.email ?? role)}`,
    expiryDate: user.expires_at ?? inviteExpiryDate(7),
    acceptedAt: user.status === "accepted" ? nowIso() : undefined,
    createdAt,
    updatedAt: createdAt,
  };
}

function splitLiveUsers(payloadUsers: ManagedUserApi[], schoolId: string, actorRole: string) {
  const users: SchoolUserRecord[] = [];
  const invitations: UserInvitationRecord[] = [];

  payloadUsers.forEach((apiUser) => {
    const isInvitation =
      apiUser.kind === "invitation"
      || (apiUser.kind !== "member" && (
        apiUser.status === "invited"
        || apiUser.status === "expired"
        || apiUser.status === "revoked"
        || apiUser.status === "accepted"
      ));

    if (isInvitation) {
      invitations.push(apiUserToInvitation(apiUser, schoolId, actorRole));
    } else {
      users.push(apiUserToSchoolUser(apiUser, schoolId));
    }
  });

  return { users, invitations };
}

function isManagedUserApi(payload: unknown): payload is ManagedUserApi {
  return Boolean(
    payload
      && typeof payload === "object"
      && ("id" in payload || "display_name" in payload || "email" in payload || "role_code" in payload || "status" in payload),
  );
}

function unwrapApiEnvelope(payload: unknown) {
  if (
    payload
    && typeof payload === "object"
    && !Array.isArray(payload)
    && Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    return (payload as { data?: unknown }).data;
  }

  return payload;
}

function readManagedUsersPayload(payload: unknown) {
  const candidate = unwrapApiEnvelope(payload);

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const users = (candidate as { users?: unknown }).users;

  if (!Array.isArray(users) || !users.every(isManagedUserApi)) {
    return null;
  }

  return { users };
}

function readApiMessage(payload: unknown) {
  const candidate = unwrapApiEnvelope(payload);

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  const message = (candidate as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}

function readManagedUserPayload(payload: unknown) {
  const candidate = unwrapApiEnvelope(payload);

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  if ("user" in candidate) {
    const user = (candidate as { user?: unknown }).user;
    return isManagedUserApi(user) ? user : null;
  }

  return isManagedUserApi(candidate) ? candidate : null;
}

function readManagedInvitationPayload(payload: unknown) {
  const candidate = unwrapApiEnvelope(payload);

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    return null;
  }

  if ("invitation" in candidate) {
    const invitation = (candidate as { invitation?: unknown }).invitation;
    return isManagedUserApi(invitation) ? invitation : null;
  }

  return isManagedUserApi(candidate) ? candidate : null;
}

function statusTone(status: SchoolUserStatus | InvitationStatus) {
  if (status === "Active" || status === "Accepted") return "ok";
  if (status === "Pending") return "warning";
  if (status === "Email Failed") return "warning";
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
  schoolName = "School",
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
  const [roleChangeUser, setRoleChangeUser] = useState<SchoolUserRecord | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<SchoolUserRecord | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteActionBusy, setInviteActionBusy] = useState<string | null>(null);
  const [userActionBusy, setUserActionBusy] = useState<string | null>(null);
  const explainManagePermission = () => {
    setNotice(
      actorRole === "Deputy Principal"
        ? "User management changes require the Deputy Principal manage-users permission for this school."
        : "User management changes require school administrator permission.",
    );
  };

  useEffect(() => {
    let mounted = true;

    function localUsers() {
      return readSchoolData<SchoolUserRecord>(userModule, schoolId);
    }

    function localInvitations() {
      return readSchoolData<UserInvitationRecord>(invitationModule, schoolId);
    }

    function localAuditRecords() {
      return readSchoolData<UserManagementAuditRecord>(userAuditModule, schoolId);
    }

    function hydrate() {
      setUsers(localUsers());
      setInvitations(localInvitations());
      setAuditRecords(localAuditRecords());
    }

    async function hydrateLiveAccess() {
      if (typeof fetch !== "function") {
        return;
      }

      try {
        const response = await fetch("/api/auth/invitations?limit=50&offset=0", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const rawPayload = await response.json().catch(() => null);

        if (!response.ok) {
          const message = readApiMessage(rawPayload) ?? "Unable to load live school users.";

          if (response.status === 401) {
            throw new Error(`Your school session has expired. Sign in again to load live user records. ${message}`);
          }

          if (response.status === 403) {
            throw new Error(`Permission-based access denied: ${message}`);
          }

          throw new Error(message);
        }

        const payload = readManagedUsersPayload(rawPayload);

        if (!payload) {
          throw new Error("The live school user response was incomplete.");
        }

        const live = splitLiveUsers(payload.users, schoolId, actorRole);

        if (!mounted) {
          return;
        }

        writeSchoolData(userModule, live.users, schoolId);
        writeSchoolData(invitationModule, live.invitations, schoolId);
        setUsers(live.users);
        setInvitations(live.invitations);
      } catch (liveAccessError) {
        if (mounted) {
          const message = liveAccessError instanceof Error
            ? liveAccessError.message
            : "Live user service is unavailable. Showing saved school user records.";
          const isAccessFailure = message.startsWith("Permission-based access denied:")
            || message.startsWith("Your school session has expired.");

          if (isAccessFailure) {
            // A local browser cache is only a degraded-service fallback. It
            // must never survive a definitive access denial for this school.
            writeSchoolData(userModule, [], schoolId);
            writeSchoolData(invitationModule, [], schoolId);
            writeSchoolData(userAuditModule, [], schoolId);
            setUsers([]);
            setInvitations([]);
            setAuditRecords([]);
            setError(message);
            setNotice(null);
          } else {
            setNotice((current) => current ?? "Live user service is unavailable. Showing saved school user records.");
          }
        }
      }
    }

    hydrate();
    void hydrateLiveAccess();

    const unsubscribe = subscribeToSchoolDataUpdates((detail) => {
      if (detail.schoolId === schoolId && [userModule, invitationModule, userAuditModule].includes(detail.moduleName)) {
        hydrate();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [actorName, actorRole, schoolId]);

  const pendingInvitations = invitations.filter((invite) => invite.invitationStatus === "Pending" || invite.invitationStatus === "Email Failed");
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
        id: `user-audit-${crypto.randomUUID()}`,
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

  async function updateUserStatus(user: SchoolUserRecord, status: SchoolUserStatus, reason: string) {
    if (!canManageUsers) {
      setError("Your account can view users, but user management changes are not enabled.");
      return;
    }

    if (typeof fetch !== "function") {
      setError("Live school user management is unavailable in this browser session.");
      return;
    }

    const busyKey = `status:${user.id}`;
    setUserActionBusy(busyKey);
    setError(null);
    setNotice(null);

    try {
      const csrfToken = await getCsrfToken();
      const apiStatus = status === "Active" ? "active" : status === "Suspended" ? "suspended" : "revoked";
      const response = await fetch(`/api/auth/tenant-users/${encodeURIComponent(user.id)}/status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({ status: apiStatus }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiMessage(payload) ?? "Unable to update user status.");
      }

      const apiUser = readManagedUserPayload(payload);
      if (!apiUser?.id) {
        throw new Error("The user service returned an incomplete status update.");
      }

      const updatedAt = nowIso();
      const nextUser = {
        ...apiUserToSchoolUser(apiUser, schoolId),
        status,
        statusReason: reason,
        statusChangedBy: actorName,
        statusChangedAt: updatedAt,
      };
      updateSchoolRecord<SchoolUserRecord>(userModule, user.id, nextUser, schoolId);
      setUsers((current) => current.map((item) => (item.id === user.id ? { ...item, ...nextUser } : item)));
      addUserAudit(`User ${status.toLowerCase()}`, user.name, user.status, status, reason);
      publishUserEvent("USER_STATUS_CHANGED", `User ${status.toLowerCase()}`, `${user.name} is now ${status.toLowerCase()} in ${schoolName}.`, user.id);
      setNotice(`${user.name} is now ${status}.`);
      setPendingStatusChange(null);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Unable to update user status.");
    } finally {
      setUserActionBusy(null);
    }
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

  async function resendInvitation(invite: UserInvitationRecord) {
    if (inviteActionBusy) {
      return;
    }

    if (invite.invitationStatus !== "Pending" && invite.invitationStatus !== "Email Failed") {
      setError("Only pending or failed-email invitations can be resent.");
      return;
    }

    const expiryDate = inviteExpiryDate(7);
    let nextInvite = { ...invite, invitationStatus: "Pending" as InvitationStatus, expiryDate, updatedAt: nowIso() };

    if (typeof fetch !== "function") {
      setError("Invitation email service is not available in this browser session.");
      return;
    }

    setInviteActionBusy(`resend:${invite.id}`);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/auth/invitations/${encodeURIComponent(invite.id)}/resend`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiMessage(payload) ?? "Unable to resend invitation email.");
      }

      const apiInvite = readManagedInvitationPayload(payload);
      const resendSent = apiInvite?.invitation_sent !== false;
      const resendMessage = apiInvite?.invitation_message?.trim() || "Email delivery failed. Resend the pending invitation after email delivery is fixed.";
      const hasFullInvitePayload = Boolean(apiInvite?.email || apiInvite?.display_name || apiInvite?.role_code);
      if (apiInvite?.id && hasFullInvitePayload) {
        nextInvite = {
          ...apiUserToInvitation({ ...apiInvite, kind: "invitation", status: apiInvite.status ?? "invited" }, schoolId, actorRole),
          phone: apiInvite.phone ?? invite.phone,
          department: apiInvite.department ?? invite.department,
          assignment: apiInvite.assignment ?? invite.assignment,
          identifier: invite.identifier,
          deliveryMethod: "Email",
          note: invite.note,
          invitedByUserId: invite.invitedByUserId,
          invitedByRole: invite.invitedByRole,
          expiryDate: apiInvite.expires_at ?? expiryDate,
        };
      } else if (apiInvite?.id) {
        nextInvite = {
          ...nextInvite,
          invitationStatus: apiStatusToInvitationStatus(apiInvite.status),
          expiryDate: apiInvite.expires_at ?? expiryDate,
        };
      }

      updateSchoolRecord<UserInvitationRecord>(invitationModule, invite.id, { invitationStatus: nextInvite.invitationStatus, expiryDate: nextInvite.expiryDate, updatedAt: nowIso() }, schoolId);
      setInvitations((current) =>
        current.map((item) => (item.id === invite.id ? { ...item, ...nextInvite } : item)),
      );
      addUserAudit(
        resendSent ? "Invitation resent" : "Invitation resend failed",
        invite.invitedName,
        invite.expiryDate,
        nextInvite.expiryDate,
        resendSent ? "Invitation email resent" : resendMessage,
      );
      publishUserEvent(
        resendSent ? "USER_INVITATION_RESENT" : "USER_INVITATION_RESEND_FAILED",
        resendSent ? "Invitation email resent" : "Invitation resend failed",
        resendSent
          ? `${invite.invitedName} invitation email was resent.`
          : `${invite.invitedName} invitation remains pending, but email delivery failed: ${resendMessage}`,
        invite.id,
      );
      if (resendSent) {
        setNotice(`Invitation email resent to ${invite.invitedName}.`);
        setError(null);
      } else {
        setNotice(`${invite.invitedName} remains in Pending Invitations. Resend once email delivery is fixed.`);
        setError(`Email delivery failed: ${resendMessage}`);
      }
    } catch (resendError) {
      const message = resendError instanceof Error ? resendError.message : "Unable to resend invitation email.";
      addUserAudit("Invitation resend failed", invite.invitedName, invite.invitationStatus, "Failed", message);
      publishUserEvent("USER_INVITATION_RESEND_FAILED", "Invitation resend failed", `${invite.invitedName} invitation email could not be resent: ${message}`, invite.id);
      setError(message);
      setNotice(null);
    } finally {
      setInviteActionBusy(null);
    }
  }

  async function revokeInvitation(invite: UserInvitationRecord) {
    if (inviteActionBusy) {
      return;
    }

    if (invite.invitationStatus !== "Pending") {
      setError("Only pending invitations can be revoked.");
      return;
    }

    if (typeof fetch !== "function") {
      setError("Invitation service is not available in this browser session.");
      return;
    }

    setInviteActionBusy(`revoke:${invite.id}`);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch(`/api/auth/invitations/${encodeURIComponent(invite.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to revoke invitation.");
      }

      updateSchoolRecord<UserInvitationRecord>(invitationModule, invite.id, { invitationStatus: "Revoked", updatedAt: nowIso() }, schoolId);
      setInvitations((current) =>
        current.map((item) => (item.id === invite.id ? { ...item, invitationStatus: "Revoked", updatedAt: nowIso() } : item)),
      );
      addUserAudit("Invitation revoked", invite.invitedName, "Pending", "Revoked", "Invitation revoked before acceptance");
      publishUserEvent("USER_INVITATION_REVOKED", "Invitation revoked", `${invite.invitedName} invitation was revoked.`, invite.id);
      setNotice(`Invitation revoked for ${invite.invitedName}.`);
      setError(null);
    } catch (revokeError) {
      const message = revokeError instanceof Error ? revokeError.message : "Unable to revoke invitation.";
      addUserAudit("Invitation revoke failed", invite.invitedName, invite.invitationStatus, "Failed", message);
      publishUserEvent("USER_INVITATION_REVOKE_FAILED", "Invitation revoke failed", `${invite.invitedName} invitation could not be revoked: ${message}`, invite.id);
      setError(message);
      setNotice(null);
    } finally {
      setInviteActionBusy(null);
    }
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
    if (invite.inviteCode === "Hidden after delivery" || invite.inviteToken.includes(".live.")) {
      setError("Secure invitation links are hidden after email delivery. Use Resend invitation to send a fresh email.");
      setNotice(null);
      return;
    }

    const link = `https://myshule.online/invite/${encodeURIComponent(invite.inviteToken)}`;
    void navigator.clipboard?.writeText(link).catch(() => undefined);
    setNotice(`${invite.invitedName} invite link/code is ready: ${invite.inviteCode}`);
    addUserAudit("Invitation copied", invite.invitedName, undefined, invite.inviteCode, "Invite link copied");
  }

  async function resetPassword(user: SchoolUserRecord) {
    if (!canManageUsers) {
      setError("Your account is not allowed to request password resets.");
      return;
    }

    if (!user.email || !/\S+@\S+\.\S+/.test(user.email)) {
      setError(`${user.name} does not have a valid email address for password recovery.`);
      return;
    }

    setUserActionBusy(`password:${user.id}`);
    setError(null);
    setNotice(null);

    try {
      await requestPasswordRecovery({
        audience: user.role === "Parent" || user.role === "Student" ? "portal" : "school",
        identifier: user.email,
        tenantSlug: schoolId,
      });
      addUserAudit("Password reset requested", user.name, undefined, "Recovery email requested", "School administrator requested password recovery");
      publishUserEvent("USER_PASSWORD_RESET_REQUESTED", "Password reset requested", `${user.name} password recovery email was requested.`, user.id);
      setNotice(`Password recovery instructions were requested for ${user.name}.`);
      setPasswordResetUser(null);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Unable to request password recovery.");
    } finally {
      setUserActionBusy(null);
    }
  }

  async function saveEditedUser(event: React.FormEvent<HTMLFormElement>) {
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
      tscNumber: String(form.get("tscNumber") ?? "").trim(),
      employmentType: String(form.get("employmentType") ?? "").trim(),
    };

    if (!updates.name || !updates.email || !/\S+@\S+\.\S+/.test(updates.email)) {
      setError("Name and a valid email are required before saving.");
      return;
    }

    if (typeof fetch !== "function") {
      setError("Live school user management is unavailable in this browser session.");
      return;
    }

    setUserActionBusy(`profile:${editingUser.id}`);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/auth/tenant-users/${encodeURIComponent(editingUser.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        body: JSON.stringify({
          display_name: updates.name,
          email: updates.email.toLowerCase(),
          phone: updates.phone,
          department: updates.department,
          assignment: updates.assignment,
          tsc_number: updates.tscNumber,
          employment_type: updates.employmentType,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiMessage(payload) ?? "Unable to update user details.");
      }

      const apiUser = readManagedUserPayload(payload);
      if (!apiUser?.id) {
        throw new Error("The user service returned an incomplete profile update.");
      }

      const nextUser = apiUserToSchoolUser(apiUser, schoolId);
      updateSchoolRecord<SchoolUserRecord>(userModule, editingUser.id, nextUser, schoolId);
      setUsers((current) => current.map((user) => (user.id === editingUser.id ? { ...user, ...nextUser } : user)));
      addUserAudit("User edited", editingUser.name, JSON.stringify({
        name: editingUser.name,
        email: editingUser.email,
        department: editingUser.department,
      }), JSON.stringify({
        name: nextUser.name,
        email: nextUser.email,
        department: nextUser.department,
      }), "User details updated");
      publishUserEvent("USER_UPDATED", "User updated", `${nextUser.name} user record was updated.`, editingUser.id);
      setNotice(`${nextUser.name} updated.`);
      setEditingUser(null);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Unable to update user details.");
    } finally {
      setUserActionBusy(null);
    }
  }

  async function saveUserRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roleChangeUser) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const role = String(form.get("role") ?? roleChangeUser.role);
    if (role === roleChangeUser.role) {
      setRoleChangeUser(null);
      return;
    }

    setUserActionBusy(`role:${roleChangeUser.id}`);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(`/api/auth/tenant-users/${encodeURIComponent(roleChangeUser.id)}/role`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        body: JSON.stringify({ role_code: roleCodeForLabel(role) }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiMessage(payload) ?? "Unable to update user role.");
      }

      const apiUser = readManagedUserPayload(payload);
      if (!apiUser?.id) {
        throw new Error("The user service returned an incomplete role update.");
      }

      const nextUser = apiUserToSchoolUser(apiUser, schoolId);
      updateSchoolRecord<SchoolUserRecord>(userModule, roleChangeUser.id, nextUser, schoolId);
      setUsers((current) => current.map((user) => (user.id === roleChangeUser.id ? { ...user, ...nextUser } : user)));
      addUserAudit("User role changed", roleChangeUser.name, roleChangeUser.role, nextUser.role, "Role changed by school administrator");
      publishUserEvent("USER_ROLE_CHANGED", "User role changed", `${nextUser.name} is now assigned the ${nextUser.role} role.`, roleChangeUser.id);
      setNotice(`${nextUser.name} role changed to ${nextUser.role}.`);
      setRoleChangeUser(null);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : "Unable to update user role.");
    } finally {
      setUserActionBusy(null);
    }
  }

  async function createInvitation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inviteBusy) {
      return;
    }

    setError(null);

    if (!canInviteUsers) {
      setError("Your account is not allowed to invite users.");
      return;
    }

    if (inviteForm.role === "Super Admin") {
      setError("School administrators cannot create Super Admin users.");
      return;
    }

    if (!inviteForm.fullName.trim() || !inviteForm.role.trim()) {
      setError("Full name and role are required.");
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

    const email = inviteForm.email.trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("A valid email address is required so MyShule can send the invitation.");
      return;
    }

    if (typeof fetch !== "function") {
      setError("Invitation email service is not available in this browser session.");
      return;
    }

    const invitedName = inviteForm.fullName.trim();
    const role = inviteForm.role;
    const phone = inviteForm.phone.trim();
    const department = inviteForm.department.trim();
    const assignment = inviteForm.assignment.trim();
    const identifier = inviteForm.identifier.trim();
    const note = inviteForm.note.trim();
    const invitedByUserId = `${schoolId}-${slug(actorName)}`;

    setInviteBusy(true);
    try {
      const csrfToken = await getCsrfToken();
      const response = await fetch("/api/auth/invitations", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": csrfToken,
        },
        body: JSON.stringify({
          display_name: invitedName,
          email,
          role_code: roleCodeForLabel(role),
          phone,
          department,
          assignment,
          identifier,
          delivery_method: "Email",
          note,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(readApiMessage(payload) ?? "Unable to send invitation email.");
      }

      const apiInvite = readManagedInvitationPayload(payload);
      if (!apiInvite?.id) {
        throw new Error("Invitation email provider returned no invitation record.");
      }
      const invitationSent = apiInvite.invitation_sent !== false;
      const deliveryMessage = apiInvite.invitation_message?.trim() || "Email delivery failed. Resend the pending invitation after email delivery is fixed.";
      const deliveryAction = apiInvite.invitation_action_required?.trim();

      const saved = {
        ...apiUserToInvitation(
          {
            ...apiInvite,
            kind: "invitation",
            display_name: apiInvite.display_name ?? invitedName,
            email: apiInvite.email ?? email,
            phone: apiInvite.phone ?? phone,
            role_code: apiInvite.role_code ?? roleCodeForLabel(role),
            role_name: apiInvite.role_name ?? role,
            status: apiInvite.status ?? "invited",
          },
          schoolId,
          actorRole,
        ),
        phone: apiInvite.phone ?? phone,
        department: apiInvite.department ?? department,
        assignment: apiInvite.assignment ?? assignment,
        identifier,
        deliveryMethod: "Email" as InviteDeliveryMethod,
        note,
        invitedByUserId,
        invitedByRole: actorRole,
      };

      const savedInvite = addSchoolRecord<UserInvitationRecord>(invitationModule, saved, schoolId);
      setInvitations((current) => [savedInvite, ...current.filter((item) => item.id !== savedInvite.id)]);
      addUserAudit(
        invitationSent ? "User invited" : "Invitation email failed",
        invitedName,
        undefined,
        invitationSent ? `${role} invitation email sent` : `${role} invitation created; email delivery failed`,
        invitationSent ? note : deliveryMessage,
      );
      publishUserEvent(
        invitationSent ? "USER_INVITED" : "USER_INVITE_EMAIL_FAILED",
        invitationSent ? "Invitation email sent" : "Invitation email failed",
        invitationSent
          ? `${invitedName} was invited as ${role} in ${schoolName}.`
          : `${invitedName} has a pending ${role} invitation, but email delivery failed: ${deliveryMessage}`,
        savedInvite.id,
      );
      setInviteForm(initialInviteForm());
      setActiveTab("invitations");
      if (invitationSent) {
        setNotice(`Invitation email sent to ${invitedName}.`);
        setError(null);
      } else {
        setNotice(`${invitedName} was added to Pending Invitations. Resend once email delivery is fixed.`);
        setError(`Email delivery failed: ${deliveryMessage}${deliveryAction ? ` ${deliveryAction}` : ""}`);
      }
    } catch (inviteError) {
      const providerMessage = inviteError instanceof Error ? inviteError.message : "Unable to send invitation email.";
      const message = `Invitation request failed: ${providerMessage}`;
      addUserAudit("Invitation request failed", invitedName, undefined, `${role} invitation request failed`, providerMessage);
      publishUserEvent("USER_INVITE_REQUEST_FAILED", "Invitation request failed", `${invitedName} invitation request failed: ${providerMessage}`, `${schoolId}-${slug(invitedName)}`);
      setError(message);
      setNotice(null);
    } finally {
      setInviteBusy(false);
    }
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
          <UsersTable
            users={filteredUsers}
            canManageUsers={canManageUsers}
            busyAction={userActionBusy}
            onPermissionDenied={explainManagePermission}
            onView={setSelectedDetail}
            onEdit={setEditingUser}
            onChangeRole={setRoleChangeUser}
            onSuspend={(user) => setPendingStatusChange({ user, status: "Suspended", reason: "Suspended from school user management" })}
            onDeactivate={(user) => setPendingStatusChange({ user, status: "Deactivated", reason: "Deactivated from school user management" })}
            onReactivate={(user) => setPendingStatusChange({ user, status: "Active", reason: "Reactivated by school administrator" })}
            onRemove={removeUser}
            onResetPassword={setPasswordResetUser}
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
            busyAction={inviteActionBusy}
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
            <FormField label="Email address" value={inviteForm.email} onChange={(value) => setInviteForm((form) => ({ ...form, email: value }))} required />
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
            {inviteForm.role === "Teacher" && (
              <>
                <FormField label="TSC Number" value={inviteForm.tscNumber ?? ""} onChange={(value) => setInviteForm((form) => ({ ...form, tscNumber: value }))} />
                <label className="grid gap-1 text-sm font-bold text-[#40608F]">
                  Employment Type
                  <select
                    value={inviteForm.employmentType ?? ""}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setInviteForm((form) => ({ ...form, employmentType: value }));
                    }}
                    className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
                  >
                    <option value="">Select type</option>
                    <option value="TSC">TSC (Government)</option>
                    <option value="BOM">BOM (Board of Management)</option>
                    <option value="Intern">Intern / PTA</option>
                    <option value="Non-Teaching">Non-Teaching Staff</option>
                  </select>
                </label>
              </>
            )}
            <label className="grid gap-1 text-sm font-bold text-[#40608F]">
              Send invite by
              <input
                value="Email invitation"
                readOnly
                className="rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#071D49] outline-none"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#40608F] md:col-span-2 xl:col-span-3">
              Optional note/message
              <textarea
                value={inviteForm.note}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setInviteForm((form) => ({ ...form, note: value }));
                }}
                className="min-h-24 rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49] outline-none focus:border-[#9BC5FF]"
              />
            </label>
            <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-3">
              <button type="submit" disabled={inviteBusy} className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#047857] disabled:cursor-wait disabled:opacity-70">
                {inviteBusy ? "Sending Invitation..." : "Send Invitation"}
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
            busyAction={userActionBusy}
            onPermissionDenied={explainManagePermission}
            onView={setSelectedDetail}
            onEdit={setEditingUser}
            onChangeRole={setRoleChangeUser}
            onSuspend={(user) => setPendingStatusChange({ user, status: "Suspended", reason: "Suspended from school user management" })}
            onDeactivate={(user) => setPendingStatusChange({ user, status: "Deactivated", reason: "Deactivated from school user management" })}
            onReactivate={(user) => setPendingStatusChange({ user, status: "Active", reason: "Reactivated by school administrator" })}
            onRemove={removeUser}
            onResetPassword={setPasswordResetUser}
          />
        </Card>
      ) : null}

      {activeTab === "audit" ? (
        <AuditPanel records={auditRecords} />
      ) : null}

      {selectedDetail ? (
        <DetailPanel record={selectedDetail} onClose={() => setSelectedDetail(null)} />
      ) : null}
      {editingUser ? (
        <UserDialog title={`Edit ${editingUser.name}`} description="Update this school membership and login identity." onClose={() => setEditingUser(null)}>
          <EditUserForm
            user={editingUser}
            busy={userActionBusy === `profile:${editingUser.id}`}
            onCancel={() => setEditingUser(null)}
            onSubmit={saveEditedUser}
          />
        </UserDialog>
      ) : null}
      {roleChangeUser ? (
        <UserDialog title={`Change role for ${roleChangeUser.name}`} description="The new role takes effect only inside this school." onClose={() => setRoleChangeUser(null)}>
          <RoleChangeForm
            user={roleChangeUser}
            busy={userActionBusy === `role:${roleChangeUser.id}`}
            onCancel={() => setRoleChangeUser(null)}
            onSubmit={saveUserRole}
          />
        </UserDialog>
      ) : null}
      {pendingStatusChange ? (
        <UserDialog
          title={`${pendingStatusChange.status === "Active" ? "Reactivate" : pendingStatusChange.status === "Suspended" ? "Suspend" : "Deactivate"} ${pendingStatusChange.user.name}`}
          description={pendingStatusChange.status === "Deactivated"
            ? "Deactivation revokes this user’s access to the current school until an administrator reactivates it."
            : pendingStatusChange.status === "Suspended"
              ? "Suspension blocks school access but preserves the membership and audit history."
              : "Reactivation restores this user’s school access."}
          onClose={() => setPendingStatusChange(null)}
        >
          <label className="grid gap-1 text-sm font-bold text-[#40608F]">
            Reason
            <textarea
              value={pendingStatusChange.reason}
              onChange={(event) => setPendingStatusChange((current) => current ? { ...current, reason: event.currentTarget.value } : null)}
              className="min-h-20 rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!pendingStatusChange.reason.trim() || userActionBusy !== null}
              onClick={() => void updateUserStatus(pendingStatusChange.user, pendingStatusChange.status, pendingStatusChange.reason.trim())}
              className="rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] px-4 py-2 text-sm font-black text-[#0B3A7A] disabled:cursor-wait disabled:opacity-60"
            >
              {userActionBusy === `status:${pendingStatusChange.user.id}` ? "Saving..." : `Confirm ${pendingStatusChange.status.toLowerCase()}`}
            </button>
            <button type="button" onClick={() => setPendingStatusChange(null)} className="rounded-xl border border-[#D7E0EF] bg-white px-4 py-2 text-sm font-black text-[#40608F]">Cancel</button>
          </div>
        </UserDialog>
      ) : null}
      {passwordResetUser ? (
        <UserDialog title={`Reset password for ${passwordResetUser.name}`} description={`Send password recovery instructions to ${passwordResetUser.email || "the user’s verified email"}.`} onClose={() => setPasswordResetUser(null)}>
          <p className="text-sm font-semibold leading-6 text-[#52657F]">MyShule will issue a short-lived recovery link. The current password is never exposed to the school administrator.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={userActionBusy !== null}
              onClick={() => void resetPassword(passwordResetUser)}
              className="rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] px-4 py-2 text-sm font-black text-[#0B3A7A] disabled:cursor-wait disabled:opacity-60"
            >
              {userActionBusy === `password:${passwordResetUser.id}` ? "Requesting..." : "Send recovery email"}
            </button>
            <button type="button" onClick={() => setPasswordResetUser(null)} className="rounded-xl border border-[#D7E0EF] bg-white px-4 py-2 text-sm font-black text-[#40608F]">Cancel</button>
          </div>
        </UserDialog>
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
  busyAction,
  onView,
  onEdit,
  onChangeRole,
  onSuspend,
  onDeactivate,
  onReactivate,
  onRemove,
  onResetPassword,
  onPermissionDenied,
}: {
  users: SchoolUserRecord[];
  canManageUsers: boolean;
  busyAction: string | null;
  onView: (user: SchoolUserRecord) => void;
  onEdit: (user: SchoolUserRecord) => void;
  onChangeRole: (user: SchoolUserRecord) => void;
  onSuspend: (user: SchoolUserRecord) => void;
  onDeactivate: (user: SchoolUserRecord) => void;
  onReactivate: (user: SchoolUserRecord) => void;
  onRemove: (user: SchoolUserRecord) => void;
  onResetPassword: (user: SchoolUserRecord) => void;
  onPermissionDenied: () => void;
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
                <td className="px-3 py-3 text-[#52657F]">
                  <span className="block font-semibold text-[#40608F]">{user.role}</span>
                  {user.employmentType && <span className="block text-xs mt-0.5">Emp: {user.employmentType}</span>}
                  {user.tscNumber && <span className="block text-xs">TSC: {user.tscNumber}</span>}
                </td>
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
                  <SmallAction label="View details" icon={Eye} onClick={() => onView(user)} disabled={busyAction !== null} />
                  <SmallAction label="Edit user" onClick={canManageUsers ? () => onEdit(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} />
                  <SmallAction label="Change role" onClick={canManageUsers ? () => onChangeRole(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} />
                  {user.status === "Active" ? (
                    <>
                      <SmallAction label="Suspend" onClick={canManageUsers ? () => onSuspend(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} tone="warning" />
                      <SmallAction label="Deactivate" onClick={canManageUsers ? () => onDeactivate(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} tone="danger" />
                    </>
                  ) : (
                    <SmallAction label="Reactivate" icon={RotateCcw} onClick={canManageUsers ? () => onReactivate(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} />
                  )}
                  <SmallAction label="Reset password" onClick={canManageUsers ? () => onResetPassword(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} />
                  {user.status === "Deactivated" ? <SmallAction label="Remove" onClick={canManageUsers ? () => onRemove(user) : onPermissionDenied} locked={!canManageUsers} disabled={busyAction !== null} tone="danger" /> : null}
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
  busyAction,
  onView,
  onResend,
  onRevoke,
  onCopy,
  onClear,
}: {
  invitations: UserInvitationRecord[];
  busyAction: string | null;
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
                  {invite.invitationStatus === "Pending" || invite.invitationStatus === "Email Failed" ? (
                    <SmallAction
                      label={busyAction === `resend:${invite.id}` ? "Resending..." : "Resend invitation"}
                      icon={Mail}
                      onClick={() => onResend(invite)}
                      disabled={busyAction !== null}
                    />
                  ) : null}
                  {invite.invitationStatus === "Pending" ? (
                    <SmallAction
                      label={busyAction === `revoke:${invite.id}` ? "Revoking..." : "Revoke invitation"}
                      onClick={() => onRevoke(invite)}
                      disabled={busyAction !== null}
                      tone="danger"
                    />
                  ) : null}
                  {invite.inviteCode !== "Hidden after delivery" && !invite.inviteToken.includes(".live.") ? (
                    <SmallAction label="Copy invite link/code" icon={Copy} onClick={() => onCopy(invite)} />
                  ) : null}
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
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

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
                <td className="px-3 py-3"><SmallAction label="View permissions" icon={ShieldCheck} onClick={() => setSelectedRole(role)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedRole ? (
        <div className="mt-4 rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#40608F]">Role permission details</p>
              <h4 className="mt-1 text-base font-black text-[#071D49]">{selectedRole}</h4>
              <p className="mt-1 text-sm font-semibold text-[#40608F]">{rolePermissionSummary(selectedRole)}</p>
            </div>
            <button type="button" onClick={() => setSelectedRole(null)} className="rounded-lg border border-[#BFD7FF] bg-white px-3 py-1.5 text-xs font-black text-[#0B3A7A]">
              Close
            </button>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <StatusPill label={roleCanInvite(selectedRole) ? "Can invite users" : "No invite permission"} tone={roleCanInvite(selectedRole) ? "ok" : "warning"} />
            <StatusPill label={selectedRole === "Principal" || selectedRole === "Deputy Principal" ? "Can manage users" : "Workspace access only"} tone={selectedRole === "Principal" || selectedRole === "Deputy Principal" ? "ok" : "warning"} />
            <StatusPill label="School-scoped access" tone="ok" />
          </div>
        </div>
      ) : null}
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
  busy,
  onCancel,
  onSubmit,
}: {
  user: SchoolUserRecord;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
      <input type="hidden" name="id" defaultValue={user.id} />
      <input type="hidden" name="role" defaultValue={user.role} />
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
      <div className="grid gap-1 text-sm font-bold text-[#40608F]">
        Role
        <div className="rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] px-3 py-2 text-sm font-semibold text-[#071D49]">{user.role}</div>
      </div>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Department
        <input name="department" defaultValue={user.department} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Assignment
        <input name="assignment" defaultValue={user.assignment} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        TSC Number
        <input name="tscNumber" defaultValue={user.tscNumber ?? ""} placeholder="Teaching staff only" className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]" />
      </label>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        Employment Type
        <select name="employmentType" defaultValue={user.employmentType ?? ""} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
          <option value="">Select type</option>
          <option value="TSC">TSC (Government)</option>
          <option value="BOM">BOM (Board of Management)</option>
          <option value="Intern">Intern / PTA</option>
          <option value="Non-Teaching">Non-Teaching Staff</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button type="submit" disabled={busy} className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#047857] disabled:cursor-wait disabled:opacity-60">{busy ? "Saving..." : "Save User"}</button>
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-[#D7E0EF] bg-white px-4 py-2 text-sm font-black text-[#40608F] disabled:opacity-60">Cancel</button>
      </div>
    </form>
  );
}

function RoleChangeForm({
  user,
  busy,
  onCancel,
  onSubmit,
}: {
  user: SchoolUserRecord;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-4" onSubmit={onSubmit}>
      <label className="grid gap-1 text-sm font-bold text-[#40608F]">
        School role
        <select name="role" defaultValue={user.role} className="rounded-xl border border-[#D7E0EF] bg-white px-3 py-2 text-sm font-semibold text-[#071D49]">
          {schoolRoles.map((role) => <option key={role}>{role}</option>)}
        </select>
      </label>
      <p className="rounded-xl border border-[#BFD7FF] bg-[#EEF6FF] px-3 py-2 text-sm font-semibold text-[#40608F]">Role changes are tenant-scoped, permission-checked, and recorded in the audit log.</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="rounded-xl border border-[#BFE8D7] bg-[#ECFDF5] px-4 py-2 text-sm font-black text-[#047857] disabled:cursor-wait disabled:opacity-60">{busy ? "Saving..." : "Save role"}</button>
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-[#D7E0EF] bg-white px-4 py-2 text-sm font-black text-[#40608F] disabled:opacity-60">Cancel</button>
      </div>
    </form>
  );
}

function UserDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#071D49]/45 p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section role="dialog" aria-modal="true" aria-label={title} className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#D7E0EF] bg-white p-4 shadow-2xl md:p-5">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#071D49]">{title}</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-[#52657F]">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="shrink-0 rounded-lg border border-[#D7E0EF] bg-white px-3 py-1.5 text-xs font-black text-[#40608F]">Close</button>
        </div>
        {children}
      </section>
    </div>
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
    <UserDialog
      title={`${"name" in record ? record.name : record.invitedName} details`}
      description="Current school-scoped identity, assignment, and access information."
      onClose={onClose}
    >
      <dl className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-xl border border-[#D7E0EF] bg-[#F8FAFC] px-3 py-2">
            <dt className="text-[10px] font-black uppercase tracking-[0.12em] text-[#597091]">{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd className="mt-1 break-words text-sm font-bold text-[#071D49]">{String(value || "-")}</dd>
          </div>
        ))}
      </dl>
    </UserDialog>
  );
}

function SmallAction({
  label,
  onClick,
  disabled,
  locked,
  tone,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  locked?: boolean;
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
      aria-disabled={locked ? "true" : undefined}
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-black disabled:cursor-wait disabled:opacity-70 ${locked ? "border-[#D7E0EF] bg-[#F8FAFC] text-[#597091]" : toneClass}`}
    >
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {locked ? <Lock className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}
