"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Calendar, Settings, Printer, AlertTriangle, CheckCircle, Send, Loader2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";

interface TimetableSlotRow {
  id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  exam_series_id?: string | null;
  assessment_id?: string | null;
  room_name?: string | null;
  invigilator?: string | null;
  status?: string | null;
}

interface ExamManagerOption {
  id: string;
  label: string;
  user_id?: string | null;
  status?: string | null;
}

interface ExamManagerOptions {
  staff?: ExamManagerOption[];
}

interface ApiResponse<T> {
  data?: T;
}

function slotKey(row: TimetableSlotRow, index: number) {
  return row.id ?? `${row.exam_series_id ?? "series"}-${row.assessment_id ?? "paper"}-${row.date ?? "date"}-${index}`;
}

function persistedSlotId(row: TimetableSlotRow) {
  return row.id && row.id.trim().length > 0 ? row.id : null;
}

function MoveSlotDialog({
  slot,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  slot: TimetableSlotRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (slot: TimetableSlotRow, payload: Record<string, string>) => Promise<void>;
  saving: boolean;
}) {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  function resetFromSlot(nextSlot: TimetableSlotRow | null) {
    setDate(nextSlot?.date ? String(nextSlot.date).slice(0, 10) : "");
    setStartTime(nextSlot?.start_time ?? "");
    setEndTime(nextSlot?.end_time ?? "");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) resetFromSlot(slot);
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (slot) void onSave(slot, { date, start_time: startTime, end_time: endTime, status: "moved" });
          }}
        >
          <DialogHeader>
            <DialogTitle>Move Timetable Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <Input type="time" required value={endTime} onChange={(event) => setEndTime(event.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Move
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RoomDialog({
  slot,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  slot: TimetableSlotRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (slot: TimetableSlotRow, payload: Record<string, string>) => Promise<void>;
  saving: boolean;
}) {
  const [roomName, setRoomName] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) setRoomName(slot?.room_name ?? "");
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (slot) void onSave(slot, { room_name: roomName, status: "room_assigned" });
          }}
        >
          <DialogHeader>
            <DialogTitle>Assign Exam Room</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Room Name</Label>
            <Input required value={roomName} onChange={(event) => setRoomName(event.target.value)} placeholder="e.g. Lab 2" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvigilatorDialog({
  slot,
  open,
  onOpenChange,
  onAssign,
  saving,
  staffOptions,
  staffLoading,
}: {
  slot: TimetableSlotRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (slot: TimetableSlotRow, staffUserId: string, role: string) => Promise<void>;
  saving: boolean;
  staffOptions: ExamManagerOption[];
  staffLoading: boolean;
}) {
  const [staffUserId, setStaffUserId] = useState("");
  const [role, setRole] = useState("invigilator");
  const selectableStaff = staffOptions.filter((staff) => staff.user_id);
  const staffUnavailable = !staffLoading && selectableStaff.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          setStaffUserId("");
          setRole("invigilator");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (slot) void onAssign(slot, staffUserId, role);
          }}
        >
          <DialogHeader>
            <DialogTitle>Assign Invigilator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exam-timetable-staff">Staff member</Label>
              <select
                id="exam-timetable-staff"
                name="staff_user_id"
                required
                value={staffUserId}
                onChange={(event) => setStaffUserId(event.target.value)}
                disabled={staffLoading || staffUnavailable}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{staffLoading ? "Loading active staff..." : "Select an active staff account"}</option>
                {selectableStaff.map((staff) => (
                  <option key={staff.id} value={staff.user_id ?? ""}>
                    {staff.label}
                  </option>
                ))}
              </select>
              {staffUnavailable ? (
                <p className="text-sm text-amber-700">
                  No active staff accounts are available for invigilation. Add or activate staff before assigning this slot.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input required value={role} onChange={(event) => setRole(event.target.value)} placeholder="invigilator, assistant, or relief" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || staffUnavailable}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ExamTimetableWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [moveSlot, setMoveSlot] = useState<TimetableSlotRow | null>(null);
  const [roomSlot, setRoomSlot] = useState<TimetableSlotRow | null>(null);
  const [invigilatorSlot, setInvigilatorSlot] = useState<TimetableSlotRow | null>(null);
  const { data: slotsResponse, isLoading, error, refetch } = useSchoolQuery<ApiResponse<TimetableSlotRow[]> | TimetableSlotRow[]>("/exams/timetable-slots");
  const { data: setupOptions, isLoading: optionsLoading } = useSchoolQuery<ExamManagerOptions>("/admin-command/exams-manager/options");
  const slots = Array.isArray(slotsResponse) ? slotsResponse : slotsResponse?.data;
  const visibleSlots = Array.isArray(slots) ? slots : [];
  const conflicts = visibleSlots.filter((slot) => slot.status?.toLowerCase() === "conflict");
  const staffOptions = setupOptions?.staff ?? [];

  function exportTimetable(rows: TimetableSlotRow[]) {
    downloadCsvFile({
      filename: `exam-timetable-${new Date().toISOString().slice(0, 10)}.csv`,
      headers: ["Date", "Start", "End", "Class/series", "Assessment", "Room", "Invigilator", "Status"],
      rows: rows.map((row) => [
        row.date ? new Date(row.date).toLocaleDateString() : "",
        row.start_time ?? "",
        row.end_time ?? "",
        row.exam_series_id ?? "Any Class",
        row.assessment_id ?? "Unspecified Subject",
        row.room_name ?? "Unassigned",
        row.invigilator ?? "Unassigned",
        row.status ?? "Scheduled",
      ]),
    });
    setNotice(`Timetable CSV downloaded with ${rows.length} slot${rows.length === 1 ? "" : "s"}.`);
  }

  function printTimetable(rows: TimetableSlotRow[]) {
    openPrintDocument({
      eyebrow: "Exam timetable",
      title: "Exam Timetable",
      subtitle: `${rows.length} scheduled slot${rows.length === 1 ? "" : "s"} for the current school`,
      rows: rows.slice(0, 12).map((row) => ({
        label: `${row.date ? new Date(row.date).toLocaleDateString() : "Unscheduled"} ${row.start_time ?? ""}`,
        value: `${row.assessment_id ?? "Unspecified assessment"} - ${row.room_name ?? "No room"}`,
        tone: row.status?.toLowerCase() === "conflict" ? "danger" : "default",
      })),
      footer: "Generated from the current tenant-scoped timetable slots.",
    });
    setNotice("Timetable print preview ready.");
  }

  async function updateSlot(row: TimetableSlotRow, payload: Record<string, string>) {
    const slotId = persistedSlotId(row);
    if (!slotId) {
      setNotice("Save this timetable slot before updating logistics.");
      return;
    }

    setSavingAction(`slot:${slotId}`);
    try {
      await requestDashboardApi(`/api/exams/timetable-slots/${encodeURIComponent(slotId)}`, {
        method: "PATCH",
        body: payload,
      });
      await refetch();
      setMoveSlot(null);
      setRoomSlot(null);
      setNotice("Timetable slot updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update the timetable slot.");
    } finally {
      setSavingAction(null);
    }
  }

  async function assignInvigilator(row: TimetableSlotRow, staffUserId: string, role: string) {
    if (!persistedSlotId(row)) {
      setNotice("Save this timetable slot before assigning an invigilator.");
      return;
    }

    setSavingAction(`invigilator:${row.id}`);
    try {
      await requestDashboardApi("/api/exams/invigilators", {
        method: "POST",
        body: {
          timetable_slot_id: row.id,
          staff_user_id: staffUserId,
          role,
        },
      });
      await refetch();
      setInvigilatorSlot(null);
      setNotice("Invigilator assigned to timetable slot.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not assign the invigilator.");
    } finally {
      setSavingAction(null);
    }
  }

  async function autoAssignInvigilators() {
    setSavingAction("auto-assign");
    try {
      await requestDashboardApi("/api/exams/invigilators/auto-assign", { method: "POST" });
      await refetch();
      setNotice("Invigilators auto-assigned where conflict-free tenant staff were available.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not auto-assign invigilators.");
    } finally {
      setSavingAction(null);
    }
  }

  async function notifyClass(row: TimetableSlotRow) {
    setSavingAction(`notify:${row.id ?? row.assessment_id ?? "slot"}`);
    try {
      await requestDashboardApi("/api/admin-command/communication-broadcasts", {
        method: "POST",
        body: {
          audience: row.exam_series_id ? `exam-series:${row.exam_series_id}` : "exam timetable audience",
          channels: ["in_app"],
          message: `Exam timetable update: ${row.assessment_id ?? "assessment"} is scheduled on ${row.date ?? "the published exam date"} from ${row.start_time ?? "start time"} to ${row.end_time ?? "end time"}${row.room_name ? ` in ${row.room_name}` : ""}.`,
        },
      });
      setNotice("Class timetable notification broadcast created.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create the class notification.");
    } finally {
      setSavingAction(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <PageHeader
          eyebrow="Logistics"
          title="Exam Timetable"
          description="Schedule papers, assign rooms, and resolve scheduling conflicts."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={!!savingAction} onClick={() => void autoAssignInvigilators()}>
            {savingAction === "auto-assign" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
            Auto-Assign
          </Button>
          <Button variant="outline" disabled={!!savingAction} onClick={() => setNotice(conflicts.length ? `${conflicts.length} unresolved timetable conflict${conflicts.length === 1 ? "" : "s"} found.` : "No unresolved timetable conflicts found in the loaded slots.")}>
            <CheckCircle className="mr-2 h-4 w-4" /> Check Conflicts
          </Button>
          <Button variant="outline" onClick={() => printTimetable(visibleSlots)}><Printer className="mr-2 h-4 w-4" /> Print</Button>
          <Button onClick={() => exportTimetable(visibleSlots)}><Calendar className="mr-2 h-4 w-4" /> Generate Timetable</Button>
        </div>
      </div>

      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <div className={`${conflicts.length ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-muted border-border text-muted-foreground"} border p-4 rounded-md flex items-start gap-3`}>
        <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="min-w-0">
          <h4 className="font-medium">{conflicts.length ? "Scheduling Conflicts Detected" : "No Scheduling Conflicts"}</h4>
          <p className="text-sm mt-1">
            {conflicts.length
              ? `${conflicts.length} loaded slot${conflicts.length === 1 ? "" : "s"} need room, invigilator, or time adjustment.`
              : "The loaded timetable slots do not currently report conflicts."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-background"
              disabled={!conflicts[0]}
              onClick={() => setMoveSlot(conflicts[0] ?? null)}
            >
              Resolve Conflict
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!conflicts[0]}
              onClick={() => conflicts[0] ? void updateSlot(conflicts[0], { status: "scheduled" }) : undefined}
            >
              Ignore With Reason
            </Button>
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
              {!isLoading && !error && visibleSlots.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No timetable slots scheduled yet.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !error && visibleSlots.map((row, idx) => (
                <TableRow key={slotKey(row, idx)}>
                  <TableCell className="whitespace-nowrap">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{row.start_time} - {row.end_time}</TableCell>
                  <TableCell>{row.exam_series_id || "Any Class"}</TableCell>
                  <TableCell className="font-medium">{row.assessment_id || "Unspecified Subject"}</TableCell>
                  <TableCell>{row.room_name || "Unassigned"}</TableCell>
                  <TableCell className={row.invigilator === "Unassigned" ? "text-muted-foreground italic" : ""}>{row.invigilator || "Unassigned"}</TableCell>
                  <TableCell>
                    <Badge variant={row.status?.toLowerCase() === "conflict" ? "destructive" : "default"}>{row.status || "Scheduled"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => setMoveSlot(row)}>Move Slot</DropdownMenuItem>
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => setRoomSlot(row)}>Assign Room</DropdownMenuItem>
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => setInvigilatorSlot(row)}>Assign Invigilator</DropdownMenuItem>
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => void notifyClass(row)}><Send className="mr-2 h-4 w-4" /> Notify Class</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MoveSlotDialog
        slot={moveSlot}
        open={!!moveSlot}
        onOpenChange={(open) => !open && setMoveSlot(null)}
        onSave={updateSlot}
        saving={!!savingAction}
      />
      <RoomDialog
        slot={roomSlot}
        open={!!roomSlot}
        onOpenChange={(open) => !open && setRoomSlot(null)}
        onSave={updateSlot}
        saving={!!savingAction}
      />
      <InvigilatorDialog
        slot={invigilatorSlot}
        open={!!invigilatorSlot}
        onOpenChange={(open) => !open && setInvigilatorSlot(null)}
        onAssign={assignInvigilator}
        saving={!!savingAction}
        staffOptions={staffOptions}
        staffLoading={optionsLoading}
      />
    </div>
  );
}
