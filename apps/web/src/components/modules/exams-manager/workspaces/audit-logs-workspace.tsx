"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { downloadCsvFile } from "@/lib/dashboard/export";

interface AuditLogRow {
  id?: string;
  created_at?: string;
  actor_user_id?: string | null;
  action?: string | null;
  exam_series_id?: string | null;
  ip_address?: string | null;
  changes_payload?: unknown;
  metadata?: unknown;
}

interface ApiResponse<T> {
  data?: T;
}

export function AuditLogsWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filterPending, setFilterPending] = useState(false);
  const { data: logsResponse, isLoading, error } = useSchoolQuery<ApiResponse<AuditLogRow[]> | AuditLogRow[]>("/exams/audit-logs");
  const logs = Array.isArray(logsResponse) ? logsResponse : logsResponse?.data;
  const visibleLogs = useMemo(() => {
    const rows = Array.isArray(logs) ? logs : [];
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter((row) => {
      const haystack = [
        row.actor_user_id,
        row.action,
        row.exam_series_id,
        row.ip_address,
        JSON.stringify(row.changes_payload ?? row.metadata ?? {}),
      ].join(" ").toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      const matchesFilter = !filterPending || row.action?.toLowerCase().includes("pending") || row.action?.toLowerCase().includes("correction");
      return matchesQuery && matchesFilter;
    });
  }, [filterPending, logs, query]);

  function exportLogs() {
    downloadCsvFile({
      filename: `exam-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Date", "User", "Action", "Entity", "IP", "Details"],
      rows: visibleLogs.map((row) => [
        row.created_at ? new Date(row.created_at).toLocaleString() : "",
        row.actor_user_id ?? "System",
        row.action ?? "",
        row.exam_series_id ?? "",
        row.ip_address ?? "System",
        JSON.stringify(row.changes_payload ?? row.metadata ?? {}),
      ]),
    });
    setNotice(`Audit CSV exported with ${visibleLogs.length} row${visibleLogs.length === 1 ? "" : "s"}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Security & Tracking"
          title="Audit Logs"
          description="Track mark modifications, configuration changes, and report republications."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setFilterPending((current) => !current); setNotice(filterPending ? "Audit filter cleared." : "Audit filter applied for pending/correction actions."); }}><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          <Button variant="outline" onClick={exportLogs}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search logs by user, action, or entity..." className="pl-8" />
          </div>
          {filterPending ? <Badge variant="outline">Pending/correction filter</Badge> : null}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action Performed</TableHead>
                <TableHead>Entity Affected</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading audit logs...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-destructive">
                    Error loading logs: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && visibleLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No audit logs match the current search or filter.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && visibleLogs.map((row, idx) => (
                <TableRow key={row.id ?? idx}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{row.created_at ? new Date(row.created_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="font-medium">{row.actor_user_id ?? "System"}</TableCell>
                  <TableCell>
                    <Badge variant="default">{row.action ?? "audit.recorded"}</Badge>
                  </TableCell>
                  <TableCell>Exam Series: {row.exam_series_id ?? "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.ip_address || "System"}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{JSON.stringify(row.changes_payload ?? row.metadata ?? {})}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
