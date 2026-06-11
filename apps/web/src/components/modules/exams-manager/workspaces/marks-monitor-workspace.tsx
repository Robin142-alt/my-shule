"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlayCircle, StopCircle, Bell, Download, Lock, Eye, RotateCcw, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function MarksMonitorWorkspace({ model }: { model: any }) {
  const { data: windows, isLoading, error } = useSchoolQuery<any[]>("/exams/mark-entry-windows");
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Monitoring"
          title="Marks Entry Monitor"
          description="Track teacher grading progress across all classes and subjects."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Bell className="mr-2 h-4 w-4" /> Send Reminders</Button>
          <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Missing Marks</Button>
          <Button variant="outline"><Lock className="mr-2 h-4 w-4" /> Lock Submitted</Button>
          <Button><PlayCircle className="mr-2 h-4 w-4" /> Open Marks Window</Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Subjects Complete", value: "24" },
          { label: "Subjects Pending", value: "18" },
          { label: "Missing Marks", value: "142" },
          { label: "Returned Corrections", value: "3" },
        ].map((card, idx) => (
          <Card key={idx} className="p-5 cursor-pointer hover:bg-muted/50 transition-colors">
            <p className="eyebrow">{card.label}</p>
            <p className="mt-3 metric-value">{card.value}</p>
          </Card>
        ))}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead className="text-success">Submitted</TableHead>
                <TableHead className="text-destructive">Missing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading mark windows...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-destructive">
                    Error loading windows: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && windows?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                    No mark entry windows configured.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && windows && windows.map((row, idx) => (
                <TableRow key={idx}>
                  <TableCell>Class: {row.class_section_id}</TableCell>
                  <TableCell className="font-medium">Subject: {row.subject_id}</TableCell>
                  <TableCell>Teacher ID: {row.created_by_user_id}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-success">-</TableCell>
                  <TableCell className="text-destructive">-</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'open' ? 'success' : 'secondary'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell>{new Date(row.closes_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Eye className="mr-2 h-4 w-4" /> View Progress</DropdownMenuItem>
                        <DropdownMenuItem><Bell className="mr-2 h-4 w-4" /> Send Reminder</DropdownMenuItem>
                        <DropdownMenuItem><Lock className="mr-2 h-4 w-4" /> Lock Subject Marks</DropdownMenuItem>
                        <DropdownMenuItem><RotateCcw className="mr-2 h-4 w-4" /> Return to Teacher</DropdownMenuItem>
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
