"use client";

import { MonitorSmartphone, Power } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status-pill";

type SessionRow = {
  id: string;
  device: string;
  ip: string;
  lastSeen: string;
  status: "Current" | "Active";
};

import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

export function SessionManagementPanel() {
  const queryClient = useQueryClient();
  const { data: fetchedSessions, isLoading, error, refetch } = useSchoolQuery<SessionRow[]>("/api/auth/sessions");
  const sessions = Array.isArray(fetchedSessions) ? fetchedSessions : [];
  const sessionMutation = useSchoolMutation("/api/auth/sessions/revoke", "POST", { queueNetworkFailures: false });
  const revokeOthersMutation = useSchoolMutation("/api/auth/sessions/revoke-others", "POST", { queueNetworkFailures: false });
  const busy = sessionMutation.isPending || revokeOthersMutation.isPending;

  function revoke(sessionId: string) {
    sessionMutation.mutate({ sessionId }, { onSuccess: () => queryClient.invalidateQueries() });
  }

  function revokeAllOtherSessions() {
    revokeOthersMutation.mutate({}, { onSuccess: () => queryClient.invalidateQueries() });
  }

  return (
    <div className="space-y-3">
    {isLoading && <p role="status">Loading signed-in devices…</p>}
    {error && <p role="alert">{error.message} <Button onClick={() => void refetch()}>Retry</Button></p>}
    {(sessionMutation.error || revokeOthersMutation.error) && <p role="alert">{(sessionMutation.error || revokeOthersMutation.error)?.message}</p>}
    {!busy && !sessionMutation.error && !revokeOthersMutation.error && (sessionMutation.isSuccess || revokeOthersMutation.isSuccess) && <p role="status">Session access revoked.</p>}
    <DataTable
      title="Active sessions"
      subtitle="Review signed-in devices and revoke old access immediately."
      columns={[
        {
          id: "device",
          header: "Device",
          render: (row) => (
            <span className="inline-flex items-center gap-2 font-semibold">
              <MonitorSmartphone className="h-4 w-4 text-muted" />
              {row.device}
            </span>
          ),
        },
        { id: "ip", header: "IP", render: (row) => row.ip },
        { id: "lastSeen", header: "Last seen", render: (row) => row.lastSeen },
        {
          id: "status",
          header: "Status",
          render: (row) => <StatusPill label={row.status} tone="ok" />,
        },
        {
          id: "actions",
          header: "Actions",
          render: (row) =>
            row.status === "Current" ? (
              <Button variant="secondary" size="sm" disabled={busy} onClick={revokeAllOtherSessions}>
                Revoke others
              </Button>
            ) : (
              <Button variant="danger" size="sm" disabled={busy} onClick={() => revoke(row.id)}>
                <Power className="h-4 w-4" />
                Revoke
              </Button>
            ),
          className: "text-right",
          headerClassName: "text-right",
        },
      ]}
      rows={sessions}
      getRowKey={(row) => row.id}
    />
    </div>
  );
}
