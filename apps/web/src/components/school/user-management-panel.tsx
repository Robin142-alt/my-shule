"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw, Send, ShieldBan, UserCheck, UserPlus } from "lucide-react";

import { getCsrfToken } from "@/lib/auth/csrf-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";

type ManagedUser = {
  id: string;
  kind: "member" | "invitation";
  name: string;
  email: string;
  roleCode: string;
  role: string;
  status: "Active" | "Invited" | "Suspended" | "Expired";
};

type ManagedUserApi = {
  id?: string;
  kind?: "member" | "invitation";
  display_name?: string;
  email?: string;
  role_code?: string;
  role_name?: string;
  status?: "active" | "suspended" | "invited" | "expired";
};

type InvitationResponse = ManagedUserApi & {
  invitation_sent?: boolean;
  message?: string;
};

const roleOptions = [
  { value: "principal", label: "Principal" },
  { value: "deputy_principal", label: "Deputy Principal" },
  { value: "secretary", label: "Secretary" },
  { value: "bursar", label: "Bursar" },
  { value: "accountant", label: "Accountant" },
  { value: "teacher", label: "Teacher" },
  { value: "dean_academics", label: "Dean of Academics" },
  { value: "exams_manager", label: "Exams Manager" },
  { value: "hod", label: "Head of Department" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "grade_master", label: "Grade/Form Master" },
  { value: "nurse", label: "Nurse" },
  { value: "school_counsellor", label: "School Counsellor" },
  { value: "discipline_master", label: "Discipline Master" },
  { value: "librarian", label: "Librarian" },
  { value: "parent", label: "Parent" },
  { value: "student", label: "Student" },
  { value: "storekeeper", label: "Storekeeper" },
  { value: "boarding_master", label: "Boarding Master" },
  { value: "security_officer", label: "Security Officer" },
  { value: "transport_manager", label: "Transport Manager" },
  { value: "lab_technician", label: "Laboratory Technician" },
  { value: "admissions_officer", label: "Admissions Officer" },
  { value: "ict_manager", label: "ICT / Computer Lab Manager" },
];

function roleLabel(roleCode: string) {
  return roleOptions.find((option) => option.value === roleCode)?.label ?? roleCode;
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLSelectElement>(null);
  const [busy, setBusy] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      try {
        const response = await fetch("/api/auth/invitations?limit=50&offset=0", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { users?: ManagedUserApi[]; message?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.message ?? "Unable to load school users.");
        }

        if (mounted) {
          setUsers((payload?.users ?? []).map(toManagedUser));
        }
      } catch (error) {
        if (mounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load school users.");
        }
      } finally {
        if (mounted) {
          setLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, []);

  async function inviteUser() {
    const displayName = nameRef.current?.value.trim() ?? "";
    const inviteEmail = emailRef.current?.value.trim().toLowerCase() ?? "";
    const selectedRoleCode = roleRef.current?.value ?? "teacher";
    setMessage(null);

    if (!displayName || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      setMessage("Enter a name and valid email before sending an invitation.");
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/auth/invitations", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        body: JSON.stringify({
          display_name: displayName,
          email: inviteEmail,
          role_code: selectedRoleCode,
        }),
      });
      const payload = (await response.json().catch(() => null)) as InvitationResponse | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to create invitation.");
      }

      const invitedUser = toManagedUser({
        id: payload?.id ?? `invite-${Date.now()}`,
        kind: "invitation",
        display_name: payload?.display_name ?? displayName,
        email: payload?.email ?? inviteEmail,
        role_code: payload?.role_code ?? selectedRoleCode,
        role_name: payload?.role_name ?? roleLabel(selectedRoleCode),
        status: "invited",
      });

      setUsers((current) => [
        invitedUser,
        ...current.filter((user) => user.email !== invitedUser.email),
      ]);
      if (nameRef.current) nameRef.current.value = "";
      if (emailRef.current) emailRef.current.value = "";
      if (roleRef.current) roleRef.current.value = "teacher";
      setMessage("Invitation queued for delivery.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function resendInvitation(user: ManagedUser) {
    setActionId(user.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/auth/invitations/${user.id}/resend`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "x-myshule-csrf": await getCsrfToken(),
        },
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to resend invitation.");
      }

      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id ? { ...currentUser, status: "Invited" } : currentUser,
        ),
      );
      setMessage("Invitation resent.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to resend invitation.");
    } finally {
      setActionId(null);
    }
  }

  async function revokeInvitation(user: ManagedUser) {
    setActionId(user.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/auth/invitations/${user.id}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: {
          "x-myshule-csrf": await getCsrfToken(),
        },
      });
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to revoke invitation.");
      }

      setUsers((current) => current.filter((currentUser) => currentUser.id !== user.id));
      setMessage("Invitation revoked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to revoke invitation.");
    } finally {
      setActionId(null);
    }
  }

  async function updateMembershipStatus(user: ManagedUser, status: "active" | "suspended") {
    setActionId(user.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/auth/tenant-users/${user.id}/status`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json().catch(() => null)) as ManagedUserApi & { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update membership.");
      }

      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id ? toManagedUser(payload ?? {}) : currentUser,
        ),
      );
      setMessage("Membership updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update membership.");
    } finally {
      setActionId(null);
    }
  }

  async function updateMembershipRole(user: ManagedUser, nextRoleCode: string) {
    if (nextRoleCode === user.roleCode) {
      return;
    }

    setActionId(user.id);
    setMessage(null);

    try {
      const response = await fetch(`/api/auth/tenant-users/${user.id}/role`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        body: JSON.stringify({ role_code: nextRoleCode }),
      });
      const payload = (await response.json().catch(() => null)) as ManagedUserApi & { message?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? "Unable to update role.");
      }

      setUsers((current) =>
        current.map((currentUser) =>
          currentUser.id === user.id ? toManagedUser(payload ?? {}) : currentUser,
        ),
      );
      setMessage("Role updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update role.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-foreground">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Invite user</h3>
            <p className="text-sm text-muted">Create access without exposing passwords.</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <input
            ref={nameRef}
            className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
            placeholder="Full name"
          />
          <input
            ref={emailRef}
            className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
            placeholder="name@school.ac.ke"
          />
          <select
            ref={roleRef}
            aria-label="Role"
            className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-foreground outline-none focus:border-accent"
            defaultValue="teacher"
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button block onClick={() => void inviteUser()} disabled={busy}>
            <Send className="h-4 w-4" />
            {busy ? "Sending..." : "Send invitation"}
          </Button>
          {message ? <p className="text-sm text-muted">{message}</p> : null}
        </div>
      </Card>

      <DataTable
        title="School users"
        subtitle={loadingUsers ? "Loading school access..." : "Invite and recover school access from one controlled desk."}
        columns={[
          { id: "name", header: "Name", render: (row) => <span className="font-semibold">{row.name}</span> },
          { id: "email", header: "Email", render: (row) => row.email },
          {
            id: "role",
            header: "Role",
            render: (row) =>
              row.kind === "member" ? (
                <select
                  aria-label={`Role for ${row.name}`}
                  className="min-h-8 rounded-[var(--radius-sm)] border border-border bg-surface px-2 text-[13px] text-foreground outline-none focus:border-accent"
                  value={row.roleCode}
                  disabled={actionId === row.id}
                  onChange={(event) => void updateMembershipRole(row, event.target.value)}
                >
                  {roleOptions.some((option) => option.value === row.roleCode) ? null : (
                    <option value={row.roleCode}>{row.role}</option>
                  )}
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                row.role
              ),
          },
          {
            id: "status",
            header: "Status",
            render: (row) => (
              <StatusPill
                label={row.status}
                tone={row.status === "Suspended" || row.status === "Expired" ? "critical" : row.status === "Invited" ? "warning" : "ok"}
              />
            ),
          },
          {
            id: "actions",
            header: "Actions",
            render: (row) => (
              <div className="flex justify-end gap-2">
                {row.kind === "invitation" ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void resendInvitation(row)}
                      disabled={actionId === row.id}
                      aria-label={`Resend ${row.name}`}
                    >
                      <RotateCw className="h-4 w-4" />
                      Resend
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void revokeInvitation(row)}
                      disabled={actionId === row.id}
                      aria-label={`Revoke ${row.name}`}
                    >
                      <ShieldBan className="h-4 w-4" />
                      Revoke
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void updateMembershipStatus(
                        row,
                        row.status === "Suspended" ? "active" : "suspended",
                      )
                    }
                    disabled={actionId === row.id}
                    aria-label={`${row.status === "Suspended" ? "Activate" : "Suspend"} ${row.name}`}
                  >
                    {row.status === "Suspended" ? <UserCheck className="h-4 w-4" /> : <ShieldBan className="h-4 w-4" />}
                    {row.status === "Suspended" ? "Activate" : "Suspend"}
                  </Button>
                )}
              </div>
            ),
            className: "text-right",
            headerClassName: "text-right",
          },
        ]}
        rows={users}
        getRowKey={(row) => row.id}
        emptyMessage={loadingUsers ? "Loading school users..." : "No school users or pending invitations yet."}
      />
    </div>
  );
}

function toManagedUser(user: ManagedUserApi): ManagedUser {
  const status =
    user.status === "suspended"
      ? "Suspended"
      : user.status === "expired"
        ? "Expired"
        : user.status === "invited"
          ? "Invited"
          : "Active";

  return {
    id: user.id ?? `${user.kind ?? "member"}-${user.email ?? "unknown"}`,
    kind: user.kind ?? (status === "Invited" || status === "Expired" ? "invitation" : "member"),
    name: user.display_name ?? user.email ?? "Unknown user",
    email: user.email ?? "unknown",
    roleCode: user.role_code ?? "member",
    role: user.role_name ?? roleLabel(user.role_code ?? "member"),
    status,
  };
}
