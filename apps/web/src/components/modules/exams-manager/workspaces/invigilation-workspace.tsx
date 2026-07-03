"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Plus, Settings, Printer, Mail, UserCheck, UserX, AlertCircle, Loader2 } from "lucide-react";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

interface InvigilationRow {
  id?: string;
  created_at?: string;
  timetable_slot_id?: string | null;
  staff_user_id?: string | null;
  role?: string | null;
  status?: string | null;
}

interface ApiResponse<T> {
  data?: T;
}

interface TimetableSlotOption {
  id: string;
  date?: string;
  start_time?: string;
  room_name?: string | null;
}

interface StaffOption {
  id: string;
  user_id?: string | null;
  display_name: string;
  staff_number?: string | null;
  status?: string;
}

interface AssignInvigilatorPayload {
  timetable_slot_id: string;
  staff_user_id: string;
  role: string;
}

function AssignInvigilatorDialog({
  children,
  slots,
  staff,
  onSuccess,
  onNotice,
}: {
  children: React.ReactNode;
  slots: TimetableSlotOption[];
  staff: StaffOption[];
  onSuccess: () => unknown;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<AssignInvigilatorPayload>({
    timetable_slot_id: "",
    staff_user_id: "",
    role: "invigilator",
  });
  const assignInvigilator = useSchoolMutation<InvigilationRow, AssignInvigilatorPayload>("/exams/invigilators", "POST");
  const assignableStaff = staff.filter((member) => member.status === "active" && member.user_id);
  const missingSetup = slots.length === 0 || assignableStaff.length === 0;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await assignInvigilator.mutateAsync(formData);
      const member = assignableStaff.find((item) => item.user_id === formData.staff_user_id);
      onNotice(`${member?.display_name ?? "Staff member"} assigned to the selected exam slot.`);
      onSuccess();
      setFormData({ timetable_slot_id: "", staff_user_id: "", role: "invigilator" });
      setOpen(false);
    } catch {
      // The mutation error remains visible for correction and retry.
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Assign Invigilator</DialogTitle>
            <DialogDescription>Assign an active staff account to a tenant-scoped examination timetable slot.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {missingSetup ? <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Create an exam timetable slot and activate a linked staff account before assigning invigilation.</div> : null}
            <div className="space-y-2">
              <Label htmlFor="invigilation-slot">Timetable slot</Label>
              <select id="invigilation-slot" required value={formData.timetable_slot_id} onChange={(event) => setFormData((current) => ({ ...current, timetable_slot_id: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select a timetable slot</option>
                {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.date ?? "Unscheduled"} {slot.start_time ?? ""} - {slot.room_name ?? "Room not assigned"}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invigilation-staff">Staff member</Label>
              <select id="invigilation-staff" required value={formData.staff_user_id} onChange={(event) => setFormData((current) => ({ ...current, staff_user_id: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select an active staff account</option>
                {assignableStaff.map((member) => <option key={member.id} value={member.user_id ?? ""}>{member.display_name}{member.staff_number ? ` (${member.staff_number})` : ""}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invigilation-role">Assignment role</Label>
              <select id="invigilation-role" required value={formData.role} onChange={(event) => setFormData((current) => ({ ...current, role: event.target.value }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="invigilator">Main invigilator</option>
                <option value="assistant">Assistant invigilator</option>
                <option value="relief">Relief invigilator</option>
              </select>
            </div>
            {assignInvigilator.error ? <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{assignInvigilator.error.message || "The invigilator could not be assigned."}</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={assignInvigilator.isPending || missingSetup}>
              {assignInvigilator.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Save Assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReplaceInvigilatorDialog({ children, assignment, staff, onSuccess, onNotice }: {
  children: React.ReactNode;
  assignment: InvigilationRow;
  staff: StaffOption[];
  onSuccess: () => unknown;
  onNotice: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [replacementUserId, setReplacementUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const candidates = staff.filter((member) => member.status === "active" && member.user_id && member.user_id !== assignment.staff_user_id);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignment.id) return;
    setSaving(true);
    setError(null);
    try {
      await requestDashboardApi(`/api/exams/invigilators/${encodeURIComponent(assignment.id)}/replace`, {
        method: "POST",
        body: { replacement_staff_user_id: replacementUserId, role: "relief" },
      });
      await onSuccess();
      onNotice("Replacement invigilator assigned and the previous assignment marked replaced.");
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not assign the replacement invigilator.");
    } finally {
      setSaving(false);
    }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild>{children}</DialogTrigger><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>Assign Replacement Invigilator</DialogTitle><DialogDescription>Select an active linked staff account for this timetable slot.</DialogDescription></DialogHeader><div className="space-y-3 py-4"><Label htmlFor={`replacement-${assignment.id}`}>Replacement staff</Label><select id={`replacement-${assignment.id}`} required value={replacementUserId} onChange={(event) => setReplacementUserId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">Select replacement staff</option>{candidates.map((member) => <option key={member.id} value={member.user_id ?? ""}>{member.display_name}</option>)}</select>{error ? <div role="alert" className="text-sm text-destructive">{error}</div> : null}</div><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || candidates.length === 0}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Assign Replacement</Button></DialogFooter></form></DialogContent></Dialog>;
}

export function InvigilationWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: invigilatorsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<InvigilationRow[]> | InvigilationRow[]>("/exams/invigilators");
  const { data: slotsResponse } = useSchoolQuery<ApiResponse<TimetableSlotOption[]> | TimetableSlotOption[]>("/exams/timetable-slots");
  const { data: staffResponse } = useSchoolQuery<StaffOption[]>("/hr/staff?status=active&limit=50");
  const invigilators = Array.isArray(invigilatorsResponse) ? invigilatorsResponse : invigilatorsResponse?.data;
  const visibleInvigilators = Array.isArray(invigilators) ? invigilators : [];
  const slots = Array.isArray(slotsResponse) ? slotsResponse : slotsResponse?.data ?? [];
  const staff = Array.isArray(staffResponse) ? staffResponse : [];

  function invigilationKey(row: InvigilationRow, index: number) {
    return row.id ?? `${row.timetable_slot_id ?? "slot"}-${row.staff_user_id ?? "staff"}-${index}`;
  }

  function printRoster() {
    openPrintDocument({
      eyebrow: "Exam logistics",
      title: "Invigilation Roster",
      subtitle: `${visibleInvigilators.length} assignment${visibleInvigilators.length === 1 ? "" : "s"} loaded for the current school`,
      rows: visibleInvigilators.slice(0, 12).map((row, index) => {
        const key = invigilationKey(row, index);
        return {
          label: row.timetable_slot_id ?? "Unassigned slot",
          value: `${row.staff_user_id ?? "No staff assigned"} - ${row.status ?? row.role ?? "assigned"}`,
          tone: row.status === "absent" ? "danger" as const : "default" as const,
        };
      }),
      footer: "Roster generated from tenant-scoped invigilation assignments.",
    });
    setNotice("Invigilation roster print preview ready.");
  }

  async function updateInvigilatorStatus(row: InvigilationRow, status: "present" | "absent") {
    if (!row.id) {
      setNotice("This assignment cannot be updated until it has a persisted ID.");
      return;
    }
    setSavingAction(`status-${row.id}`);
    try {
      await requestDashboardApi(`/api/exams/invigilators/${encodeURIComponent(row.id)}/status`, {
        method: "PATCH",
        body: { status },
      });
      await refetch();
      setNotice(`Invigilator marked ${status}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update invigilator attendance.");
    } finally {
      setSavingAction(null);
    }
  }

  async function sendInvigilatorReminders(rows: InvigilationRow[]) {
    const persistedRows = rows.filter((row): row is InvigilationRow & { id: string } => Boolean(row.id));
    if (persistedRows.length === 0) {
      setNotice("Assign an invigilator before sending reminders.");
      return;
    }
    setSavingAction("send-reminders");
    const results = await Promise.allSettled(persistedRows.map((row) =>
      requestDashboardApi(`/api/exams/invigilators/${encodeURIComponent(row.id)}/remind`, { method: "POST" })
    ));
    const succeeded = results.filter((result) => result.status === "fulfilled").length;
    const failed = results.length - succeeded;
    setNotice(`${succeeded} invigilator reminder${succeeded === 1 ? "" : "s"} sent${failed ? `; ${failed} failed and can be retried` : ""}.`);
    setSavingAction(null);
  }

  async function autoAssignInvigilators() {
    setSavingAction("auto-assign");
    try {
      const result = await requestDashboardApi<{ success: boolean; data: { assigned: number } }>("/exams/invigilators/auto-assign", { method: "POST" });
      await refetch();
      setNotice(`${result.data.assigned} conflict-free invigilation assignment${result.data.assigned === 1 ? "" : "s"} created. Remaining slots can be assigned manually.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not auto-assign invigilators.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Logistics"
          title="Invigilation"
          description="Assign teachers and staff to supervise exams and monitor attendance."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction || slots.length === 0 || staff.length === 0} onClick={() => void autoAssignInvigilators()}><Settings className="mr-2 h-4 w-4" /> Auto-Assign</Button>
          <Button variant="outline" onClick={printRoster}><Printer className="mr-2 h-4 w-4" /> Print Roster</Button>
          <Button variant="outline" disabled={!!savingAction || visibleInvigilators.length === 0} onClick={() => void sendInvigilatorReminders(visibleInvigilators)}><Mail className="mr-2 h-4 w-4" /> Send Notices</Button>
          <AssignInvigilatorDialog slots={slots} staff={staff} onSuccess={refetch} onNotice={setNotice}>
            <Button type="button"><Plus className="mr-2 h-4 w-4" /> Assign Invigilators</Button>
          </AssignInvigilatorDialog>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Assignments", value: String(visibleInvigilators.length), icon: UserCheck, type: "default" },
          { label: "Unassigned Slots", value: String(Math.max(slots.length - new Set(visibleInvigilators.map((row) => row.timetable_slot_id).filter(Boolean)).size, 0)), icon: AlertCircle, type: "warning" },
          { label: "Active Staff Accounts", value: String(staff.filter((member) => member.status === "active" && member.user_id).length), icon: UserCheck, type: "default" },
          { label: "Absent Invigilators", value: String(visibleInvigilators.filter((row) => row.status === "absent").length), icon: UserX, type: "destructive" },
        ].map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="p-5 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
              <div>
                <p className="eyebrow">{card.label}</p>
                <p className={`mt-3 metric-value text-${card.type === 'default' ? 'foreground' : card.type}`}>{card.value}</p>
              </div>
              <div className={`p-3 rounded-full bg-${card.type}/10 text-${card.type === 'default' ? 'primary' : card.type}`}>
                <Icon className="h-6 w-6" />
              </div>
            </Card>
          );
        })}
      </section>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Class & Paper</TableHead>
                <TableHead>Main Invigilator</TableHead>
                <TableHead>Assistant</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading invigilators...</p>
                  </TableCell>
                </TableRow>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-destructive">
                    Error loading invigilators: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && (!invigilators || !Array.isArray(invigilators) || invigilators.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <p>No invigilators have been assigned.</p>
                    <div className="mt-4 flex justify-center">
                      <AssignInvigilatorDialog slots={slots} staff={staff} onSuccess={refetch} onNotice={setNotice}>
                        <Button type="button" size="sm"><Plus className="mr-2 h-4 w-4" /> Assign First Invigilator</Button>
                      </AssignInvigilatorDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && Array.isArray(invigilators) && invigilators.map((row, idx) => {
                const key = invigilationKey(row, idx);
                const isPresent = row.status === "present";
                const isAbsent = row.status === "absent";
                return (
                <TableRow key={key}>
                  <TableCell className="whitespace-nowrap">{row.created_at ? new Date(row.created_at).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>{row.timetable_slot_id || "Unassigned"}</TableCell>
                  <TableCell className="font-medium">Paper Allocation</TableCell>
                  <TableCell>{row.staff_user_id || "Unassigned"}</TableCell>
                  <TableCell className="text-muted-foreground italic">{row.status === "replaced" ? "Replacement assigned" : "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={isAbsent ? "destructive" : isPresent ? "success" : "default"}>{isAbsent ? "absent" : isPresent ? "present" : row.role || "invigilator"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={savingAction === `status-${row.id}`} onClick={() => void updateInvigilatorStatus(row, "present")}>Mark Present</DropdownMenuItem>
                        <DropdownMenuItem disabled={savingAction === `status-${row.id}`} onClick={() => void updateInvigilatorStatus(row, "absent")}>Mark Absent</DropdownMenuItem>
                        <ReplaceInvigilatorDialog assignment={row} staff={staff} onSuccess={refetch} onNotice={setNotice}><DropdownMenuItem asChild><button type="button">Assign Replacement</button></DropdownMenuItem></ReplaceInvigilatorDialog>
                        <DropdownMenuItem disabled={savingAction === "send-reminders"} onClick={() => void sendInvigilatorReminders([row])}>Send Reminder</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
