"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Calendar, Settings, Printer, Download, AlertTriangle, CheckCircle, Send, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ExamTimetableWorkspace({ model }: { model: any }) {
  const { data: slotsResponse, isLoading, error } = useSchoolQuery<any>("/exams/timetable-slots");
  const slots = slotsResponse?.data || slotsResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Logistics"
          title="Exam Timetable"
          description="Schedule papers, assign rooms, and resolve scheduling conflicts."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Settings className="mr-2 h-4 w-4" /> Auto-Assign</Button>
          <Button variant="outline"><CheckCircle className="mr-2 h-4 w-4" /> Check Conflicts</Button>
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button><Calendar className="mr-2 h-4 w-4" /> Generate Timetable</Button>
        </div>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-md flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-medium">Scheduling Conflicts Detected</h4>
          <p className="text-sm mt-1">Form 4 East has Mathematics Paper 1 and Biology Paper 2 scheduled in the same time slot.</p>
          <div className="mt-3 flex gap-2">
            <Button variant="outline" size="sm" className="bg-background text-destructive border-destructive/30 hover:bg-destructive/10">Resolve Conflict</Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">Ignore With Reason</Button>
          </div>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Subject (Paper)</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Invigilator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading timetable slots...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-destructive">
                    Error loading slots: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!slots || !Array.isArray(slots) || slots.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No timetable slots scheduled yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(slots) && slots.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.start_time} - {row.end_time}</TableCell>
                  <TableCell>{row.exam_series_id || "Any Class"}</TableCell>
                  <TableCell className="font-medium">{row.assessment_id || "Unspecified Subject"}</TableCell>
                  <TableCell>{row.room_name || "Unassigned"}</TableCell>
                  <TableCell className={row.invigilator === "Unassigned" ? "text-muted-foreground italic" : ""}>{row.invigilator || "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === "Conflict" ? "destructive" : "default"}>{row.status || "Scheduled"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Move Slot</DropdownMenuItem>
                        <DropdownMenuItem>Assign Room</DropdownMenuItem>
                        <DropdownMenuItem>Assign Invigilator</DropdownMenuItem>
                        <DropdownMenuItem>Notify Class</DropdownMenuItem>
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
