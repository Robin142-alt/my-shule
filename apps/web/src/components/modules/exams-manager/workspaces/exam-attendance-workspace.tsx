"use client";

import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Upload, Printer, Download, Bell, Edit, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

export function ExamAttendanceWorkspace({ model }: { model: any }) {
  const { data: attendanceResponse, isLoading, error } = useSchoolQuery<any>("/exams/attendance");
  const attendance = attendanceResponse?.data || attendanceResponse;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Logistics"
          title="Exam Attendance"
          description="Track student presence, absentees, and late arrivals for each paper."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> Print Sheets</Button>
          <Button variant="outline"><Bell className="mr-2 h-4 w-4" /> Absentee Alerts</Button>
          <Button><Plus className="mr-2 h-4 w-4" /> Mark Attendance</Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Paper</TableHead>
                <TableHead className="text-center">Expected</TableHead>
                <TableHead className="text-center text-success">Present</TableHead>
                <TableHead className="text-center text-destructive">Absent</TableHead>
                <TableHead className="text-center text-warning">Late</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading attendance records...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-destructive">
                    Error loading attendance: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!attendance || !Array.isArray(attendance) || attendance.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                    No attendance records found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(attendance) && attendance.map((row: any, idx: number) => (
                <TableRow key={idx}>
                  <TableCell className="whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>Class {row.student_id}</TableCell>
                  <TableCell className="font-medium">{row.timetable_slot_id}</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center text-success">{row.status === 'present' ? '1' : '0'}</TableCell>
                  <TableCell className="text-center text-destructive">{row.status === 'absent' ? '1' : '0'}</TableCell>
                  <TableCell className="text-center text-warning">{row.status === 'late' ? '1' : '0'}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'absent' ? 'destructive' : 'default'}>{row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem><Edit className="mr-2 h-4 w-4" /> Open Attendance</DropdownMenuItem>
                        <DropdownMenuItem><AlertCircle className="mr-2 h-4 w-4" /> Add Special Case</DropdownMenuItem>
                        <DropdownMenuItem><Bell className="mr-2 h-4 w-4" /> Send Parent Alert</DropdownMenuItem>
                        <DropdownMenuItem><Lock className="mr-2 h-4 w-4" /> Lock Attendance</DropdownMenuItem>
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
