"use client";

import { useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Plus, Upload, Printer, Bell, Edit, Lock, AlertCircle, Loader2, Download } from "lucide-react";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

interface AttendanceRow {
  id?: string;
  created_at: string;
  student_id: string;
  timetable_slot_id: string;
  status: "present" | "absent" | "late" | string;
  locked_at?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

interface AttendanceStudentOption {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
}

interface AttendanceSlotOption {
  id: string;
  date?: string;
  start_time?: string;
  room_name?: string | null;
}

interface MarkExamAttendancePayload {
  timetable_slot_id: string;
  student_id: string;
  status: string;
  remarks: string;
}

interface AttendanceImportResult {
  filename: string;
  found: number;
  committed: number;
  failed: number;
  rows: Array<{ row_number: number; status: string; errors: string[] }>;
}

function MarkExamAttendanceDialog({ children, students, slots, onSuccess, onNotice }: {
  children: React.ReactNode;
  students: AttendanceStudentOption[];
  slots: AttendanceSlotOption[];
  onSuccess: () => unknown;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<MarkExamAttendancePayload>({ timetable_slot_id: "", student_id: "", status: "present", remarks: "" });
  const markAttendance = useSchoolMutation<AttendanceRow, MarkExamAttendancePayload>("/exams/attendance", "POST");
  const missingSetup = students.length === 0 || slots.length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await markAttendance.mutateAsync(formData);
      const student = students.find((item) => item.id === formData.student_id);
      onNotice(`Attendance marked ${formData.status} for ${student ? `${student.first_name} ${student.last_name}` : "the selected student"}.`);
      onSuccess();
      setFormData({ timetable_slot_id: "", student_id: "", status: "present", remarks: "" });
      setOpen(false);
    } catch {
      // Keep the dialog open and expose the server error for retry.
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <form onSubmit={handleSubmit}>
        <DialogHeader><DialogTitle>Mark Exam Attendance</DialogTitle><DialogDescription>Record one learner's attendance for a scheduled paper. Re-submitting updates that learner's record for the same slot.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          {missingSetup ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Add an active student and create an exam timetable slot before marking attendance.</div> : null}
          <div className="space-y-2"><Label htmlFor="exam-attendance-student">Student</Label><select id="exam-attendance-student" required value={formData.student_id} onChange={(event) => setFormData((current) => ({ ...current, student_id: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select a student</option>{students.map((student) => <option key={student.id} value={student.id}>{student.admission_number} - {student.first_name} {student.last_name}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="exam-attendance-slot">Timetable slot</Label><select id="exam-attendance-slot" required value={formData.timetable_slot_id} onChange={(event) => setFormData((current) => ({ ...current, timetable_slot_id: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select a timetable slot</option>{slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.date ?? "Unscheduled"} {slot.start_time ?? ""} - {slot.room_name ?? "Room not assigned"}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="exam-attendance-status">Status</Label><select id="exam-attendance-status" required value={formData.status} onChange={(event) => setFormData((current) => ({ ...current, status: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="present">Present</option><option value="absent">Absent</option><option value="late">Late</option><option value="excused">Excused</option></select></div>
          <div className="space-y-2"><Label htmlFor="exam-attendance-remarks">Remarks</Label><Textarea id="exam-attendance-remarks" value={formData.remarks} onChange={(event) => setFormData((current) => ({ ...current, remarks: event.target.value }))} placeholder="Optional reason, arrival time, or supporting note." rows={3} /></div>
          {markAttendance.error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{markAttendance.error.message || "Attendance could not be saved."}</div> : null}
        </div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={markAttendance.isPending || missingSetup}>{markAttendance.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Save Attendance</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function AttendanceSpecialCaseDialog({ children, attendance, onNotice }: {
  children: React.ReactNode;
  attendance: AttendanceRow;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [caseType, setCaseType] = useState("medical");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attendance.id) return;
    setSaving(true);
    setError(null);
    try {
      await requestDashboardApi(`/api/exams/attendance/${encodeURIComponent(attendance.id)}/special-case`, {
        method: "POST",
        body: { case_type: caseType, description },
      });
      onNotice(`Special exam case created for student ${attendance.student_id}.`);
      setDescription("");
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the special exam case.");
    } finally {
      setSaving(false);
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>Add Exam Attendance Special Case</DialogTitle><DialogDescription>The student and exam series are resolved from this tenant-scoped attendance record.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor={`attendance-case-type-${attendance.id}`}>Case type</Label><select id={`attendance-case-type-${attendance.id}`} value={caseType} onChange={(event) => setCaseType(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="medical">Medical consideration</option><option value="special_support">Special examination support</option><option value="exemption">Exam exemption</option><option value="irregularity">Exam irregularity</option><option value="disciplinary">Disciplinary issue</option></select></div><div className="space-y-2"><Label htmlFor={`attendance-case-description-${attendance.id}`}>Description and evidence</Label><Textarea id={`attendance-case-description-${attendance.id}`} required minLength={10} maxLength={5000} value={description} onChange={(event) => setDescription(event.target.value)} rows={4} /></div>{error ? <div role="alert" className="text-sm text-destructive">{error}</div> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Create Case</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function ExamAttendanceWorkspace({ model }: { model: unknown }) {
  void model;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<AttendanceImportResult | null>(null);
  const { data: attendanceResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<AttendanceRow[]> | AttendanceRow[]>("/exams/attendance");
  const { data: studentsResponse } = useSchoolQuery<AttendanceStudentOption[]>("/students?status=active&limit=200");
  const { data: slotsResponse } = useSchoolQuery<ApiResponse<AttendanceSlotOption[]> | AttendanceSlotOption[]>("/exams/timetable-slots");
  const attendance = Array.isArray(attendanceResponse) ? attendanceResponse : attendanceResponse?.data;
  const students = Array.isArray(studentsResponse) ? studentsResponse : [];
  const slots = Array.isArray(slotsResponse) ? slotsResponse : slotsResponse?.data ?? [];

  function rowKey(row: AttendanceRow, index: number) {
    return row.id ?? `${row.student_id}-${row.timetable_slot_id}-${index}`;
  }

  function printSheets(rows: AttendanceRow[] = []) {
    openPrintDocument({
      eyebrow: "Exam attendance",
      title: "Attendance Sheet",
      subtitle: "Current visible exam attendance records",
      rows: [
        { label: "Records", value: String(rows.length) },
        { label: "Absent", value: String(rows.filter((row) => row.status === "absent").length) },
        { label: "Late", value: String(rows.filter((row) => row.status === "late").length) },
      ],
      footer: "Attendance sheets are scoped to the active school and current exam workspace.",
    });
    setNotice(`Print preview ready for ${rows.length} attendance record${rows.length === 1 ? "" : "s"}.`);
  }

  async function importAttendance(file: File | null | undefined) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file, file.name);
    setSavingAction("attendance-import");
    setImportResult(null);
    try {
      const result = await requestDashboardApi<{ success: boolean; data: AttendanceImportResult }>("/api/exams/attendance/import", {
        method: "POST",
        body: formData,
      });
      setImportResult(result.data);
      await refetch();
      setNotice(`${result.data.committed} of ${result.data.found} attendance row${result.data.found === 1 ? "" : "s"} imported from ${result.data.filename}${result.data.failed ? `; ${result.data.failed} row${result.data.failed === 1 ? "" : "s"} require correction` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not import exam attendance.");
    } finally {
      setSavingAction(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function downloadImportTemplate() {
    downloadCsvFile({
      filename: "exam-attendance-template.csv",
      headers: ["timetable_slot_id", "admission_number", "status", "remarks"],
      rows: [[slots[0]?.id ?? "", students[0]?.admission_number ?? "", "present", ""]],
    });
    setNotice("Exam attendance CSV template downloaded with the current import columns.");
  }

  async function sendAbsenceAlerts(rows: AttendanceRow[]) {
    const attendanceIds = rows.filter((row) => row.status === "absent" && row.id).map((row) => row.id as string);
    if (attendanceIds.length === 0) {
      setNotice("No persisted absent attendance records are available for guardian alerts.");
      return;
    }
    setSavingAction("absence-alerts");
    try {
      const result = await requestDashboardApi<{ success: boolean; data: { sent: number; skipped: number } }>("/exams/attendance/absentee-alerts", {
        method: "POST",
        body: { attendance_ids: attendanceIds },
      });
      setNotice(`${result.data.sent} guardian alert${result.data.sent === 1 ? "" : "s"} sent${result.data.skipped ? `; ${result.data.skipped} record${result.data.skipped === 1 ? "" : "s"} had no active linked guardian account` : ""}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send exam absence alerts.");
    } finally {
      setSavingAction(null);
    }
  }

  async function lockAttendance(row: AttendanceRow) {
    if (!row.id) {
      setNotice("This attendance record cannot be locked until it has a persisted ID.");
      return;
    }
    setSavingAction(`lock-${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/attendance/${encodeURIComponent(row.id)}/lock`, { method: "PATCH" });
      await refetch();
      setNotice(`Attendance record ${row.id} locked.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not lock exam attendance.");
    } finally {
      setSavingAction(null);
    }
  }

  function previewAttendance(row: AttendanceRow) {
    openPrintDocument({
      eyebrow: "Exam attendance",
      title: `Attendance record for ${row.student_id}`,
      subtitle: row.timetable_slot_id,
      rows: [
        { label: "Date", value: row.created_at ? new Date(row.created_at).toLocaleDateString() : "-" },
        { label: "Student", value: row.student_id },
        { label: "Timetable slot", value: row.timetable_slot_id },
        { label: "Status", value: row.status },
      ],
      footer: "Attendance detail preview generated from current school exam attendance records.",
    });
    setNotice(`Attendance detail print preview generated for student ${row.student_id}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Logistics"
          title="Exam Attendance"
          description="Track student presence, absentees, and late arrivals for each paper."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadImportTemplate}><Download className="mr-2 h-4 w-4" /> Template</Button>
          <Button variant="outline" disabled={savingAction === "attendance-import"} onClick={() => fileInputRef.current?.click()}>{savingAction === "attendance-import" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import</Button>
          <input ref={fileInputRef} className="hidden" type="file" accept=".csv,.xlsx" onChange={(event) => void importAttendance(event.target.files?.[0])} />
          <Button variant="outline" onClick={() => printSheets(Array.isArray(attendance) ? attendance : [])}><Printer className="mr-2 h-4 w-4" /> Print Sheets</Button>
          <Button variant="outline" disabled={!!savingAction || !Array.isArray(attendance) || !attendance.some((row) => row.status === "absent" && row.id)} onClick={() => void sendAbsenceAlerts(Array.isArray(attendance) ? attendance : [])}><Bell className="mr-2 h-4 w-4" /> Absentee Alerts</Button>
          <MarkExamAttendanceDialog students={students} slots={slots} onSuccess={refetch} onNotice={setNotice}><Button type="button"><Plus className="mr-2 h-4 w-4" /> Mark Attendance</Button></MarkExamAttendanceDialog>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {importResult?.failed ? <Card className="border-amber-200 p-4"><h3 className="font-semibold text-amber-950">Rows requiring correction</h3><ul className="mt-2 space-y-1 text-sm text-amber-900">{importResult.rows.filter((row) => row.status !== "committed").slice(0, 10).map((row) => <li key={row.row_number}>Row {row.row_number}: {row.errors.join("; ")}</li>)}</ul>{importResult.failed > 10 ? <p className="mt-2 text-sm text-amber-800">Showing 10 of {importResult.failed} failed rows.</p> : null}</Card> : null}

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
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                    <p>No exam attendance records have been saved.</p>
                    <div className="mt-4 flex justify-center"><MarkExamAttendanceDialog students={students} slots={slots} onSuccess={refetch} onNotice={setNotice}><Button type="button" size="sm"><Plus className="mr-2 h-4 w-4" /> Mark First Attendance</Button></MarkExamAttendanceDialog></div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(attendance) && attendance.map((row, idx) => (
                <TableRow key={rowKey(row, idx)}>
                  <TableCell className="whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>Class {row.student_id}</TableCell>
                  <TableCell className="font-medium">{row.timetable_slot_id}</TableCell>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center text-success">{row.status === 'present' ? '1' : '0'}</TableCell>
                  <TableCell className="text-center text-destructive">{row.status === 'absent' ? '1' : '0'}</TableCell>
                  <TableCell className="text-center text-warning">{row.status === 'late' ? '1' : '0'}</TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'absent' ? 'destructive' : row.locked_at ? 'success' : 'default'}>{row.locked_at ? "locked" : row.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => previewAttendance(row)}><Edit className="mr-2 h-4 w-4" /> Open Attendance</DropdownMenuItem>
                        <AttendanceSpecialCaseDialog attendance={row} onNotice={setNotice}><DropdownMenuItem asChild><button type="button"><AlertCircle className="mr-2 h-4 w-4" /> Add Special Case</button></DropdownMenuItem></AttendanceSpecialCaseDialog>
                        <DropdownMenuItem disabled={row.status !== "absent" || savingAction === "absence-alerts"} onClick={() => void sendAbsenceAlerts([row])}><Bell className="mr-2 h-4 w-4" /> Send Parent Alert</DropdownMenuItem>
                        <DropdownMenuItem disabled={Boolean(row.locked_at) || savingAction === `lock-${row.id}`} onClick={() => void lockAttendance(row)}><Lock className="mr-2 h-4 w-4" /> Lock Attendance</DropdownMenuItem>
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
