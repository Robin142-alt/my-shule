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

import { useSchoolQuery, useSchoolMutation } from "@/lib/school/school-api";

export function SessionManagementPanel() {
  const queryClient = useQueryClient();
  const { data: fetchedSessions } = useSchoolQuery<SessionRow[]>("/api/auth/sessions");
  const sessions = Array.isArray(fetchedSessions) ? fetchedSessions : [];
  const sessionMutation = useSchoolMutation("/api/auth/sessions/revoke");

  function revoke(sessionId: string) {
    sessionMutation.mutate({ sessionId }, { onSuccess: () => queryClient.invalidateQueries() });
  }

  function revokeAllOtherSessions() {
    sessionMutation.mutate({ revokeAll: true }, { onSuccess: () => queryClient.invalidateQueries() });
  }

  return (
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
              <Button variant="secondary" size="sm" onClick={revokeAllOtherSessions}>
                Revoke others
              </Button>
            ) : (
              <Button variant="danger" size="sm" onClick={() => revoke(row.id)}>
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
  );
}
