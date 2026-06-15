"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlayCircle, ShieldAlert, CheckCircle, Mail, Download, UserCheck, Eye, Edit, AlertCircle, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ModerationWorkspace({ model }: { model: any }) {
  const { data: versionsResponse, isLoading, error } = useSchoolQuery<any>("/exams/mark-versions");
  const versions = versionsResponse?.data || versionsResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Validation"
          title="Moderation & Validation"
          description="Detect incorrect, suspicious, incomplete, or inconsistent results before publishing."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Mail className="mr-2 h-4 w-4" /> Send Correction Requests</Button>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Issues</Button>
          <Button><PlayCircle className="mr-2 h-4 w-4" /> Run Full Moderation</Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Missing Marks", value: "14", type: "warning" },
          { label: "Above Maximum", value: "2", type: "destructive" },
          { label: "Absent w/ Marks", value: "1", type: "destructive" },
          { label: "Extreme Outliers", value: "5", type: "warning" },
          { label: "Average Drops", value: "3", type: "warning" },
          { label: "Unapproved Edits", value: "0", type: "default" },
        ].map((card, idx) => (
          <Card key={idx} className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
            <p className={`mt-2 text-2xl font-bold text-${card.type === 'default' ? 'foreground' : card.type}`}>{card.value}</p>
          </Card>
        ))}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Issue Type</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Detected Problem</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading mark moderation requests...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading requests: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!versions || !Array.isArray(versions) || versions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No pending moderation requests.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(versions) && versions.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${row.approval_state === 'pending' ? 'bg-warning' : 'bg-success'}`} />
                      <span className="font-medium">Medium</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">Mark Correction</TableCell>
                  <TableCell>Mark ID: {row.mark_id}</TableCell>
                  <TableCell>Score: {row.original_score} ➔ {row.correction_score}</TableCell>
                  <TableCell className="text-muted-foreground">{row.reason}</TableCell>
                  <TableCell>{row.corrected_by_user_id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{row.approval_state}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Issue</DropdownMenuItem>
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Open Mark</DropdownMenuItem>
                        <DropdownMenuItem><UserCheck className="mr-2 h-4 w-4" /> Assign to Teacher</DropdownMenuItem>
                        <DropdownMenuItem><Mail className="mr-2 h-4 w-4" /> Return for Correction</DropdownMenuItem>
                        <DropdownMenuItem><CheckCircle className="mr-2 h-4 w-4" /> Approve Exception</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
