"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Filter, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function AuditLogsWorkspace({ model }: { model: any }) {
  const { data: logs, isLoading, error } = useSchoolQuery<any[]>("/exams/audit-logs");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Security & Tracking"
          title="Audit Logs"
          description="Track mark modifications, configuration changes, and report republications."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Filter className="mr-2 h-4 w-4" /> Filter</Button>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search logs by user, action, or entity..." className="pl-8" />
          </div>
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
              {!isLoading && !error && logs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    No audit logs recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && logs && logs.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{new Date(row.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{row.actor_user_id}</TableCell>
                  <TableCell>
                    <Badge variant="default">{row.action}</Badge>
                  </TableCell>
                  <TableCell>Exam Series: {row.exam_series_id}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.ip_address || "System"}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{JSON.stringify(row.changes_payload)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
