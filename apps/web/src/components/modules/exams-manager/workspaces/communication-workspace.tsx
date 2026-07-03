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
import { Textarea } from "@/components/ui/textarea";
import { MoreHorizontal, Plus, Clock, Eye, Copy, MessageSquare, Loader2, Send } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";

interface BroadcastRow {
  id?: string;
  date?: string;
  recipient?: string;
  channel?: string;
  message_type?: string;
  status?: string;
  sent_by?: string;
  message?: string;
}

interface BroadcastTemplate {
  label: string;
  desc: string;
  audience: string;
  message: string;
  channels: string[];
}

interface BroadcastDraft {
  audience: string;
  message: string;
  channels: string[];
}

const templates: BroadcastTemplate[] = [
  {
    label: "Exam Dates Alert",
    desc: "Notify parents of upcoming exams",
    audience: "parents",
    channels: ["in_app", "sms"],
    message: "Upcoming exam dates have been published. Review the exam calendar and support learners with revision preparation.",
  },
  {
    label: "Marks Entry Reminder",
    desc: "Remind teachers to submit marks",
    audience: "teachers",
    channels: ["in_app"],
    message: "Please complete marks entry for the current exam window before the deadline. Contact the Exams Office for moderation support.",
  },
  {
    label: "Results Published",
    desc: "Alert parents to view report cards",
    audience: "parents",
    channels: ["in_app", "sms"],
    message: "Exam results have been published. Log in to the parent portal to view the learner report card.",
  },
  {
    label: "Fee Balance Notice",
    desc: "Withheld results alert",
    audience: "parents",
    channels: ["in_app", "sms"],
    message: "A fee balance may affect report-card visibility. Please contact the accounts office for a current statement.",
  },
];

function channelsFromText(value?: string): string[] {
  const parsed = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length ? parsed : ["in_app"];
}

function statusVariant(status?: string): "success" | "destructive" | "warning" | "secondary" {
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "sent" || normalized === "success") return "success";
  if (normalized === "failed" || normalized === "cancelled") return "destructive";
  if (normalized === "pending" || normalized === "scheduled" || normalized === "draft") return "warning";
  return "secondary";
}

function BroadcastDialog({
  children,
  initialTemplate,
  onSubmit,
}: {
  children: React.ReactNode;
  initialTemplate?: BroadcastTemplate;
  onSubmit: (draft: BroadcastDraft) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState(initialTemplate?.label ?? "");
  const selectedTemplate = templates.find((template) => template.label === templateName);
  const effectiveTemplate = selectedTemplate ?? initialTemplate;
  const [audience, setAudience] = useState(effectiveTemplate?.audience ?? "parents");
  const [message, setMessage] = useState(effectiveTemplate?.message ?? "");
  const [smsEnabled, setSmsEnabled] = useState(Boolean(effectiveTemplate?.channels.includes("sms")));
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyTemplate(label: string) {
    setTemplateName(label);
    const template = templates.find((entry) => entry.label === label);
    if (!template) return;
    setAudience(template.audience);
    setMessage(template.message);
    setSmsEnabled(template.channels.includes("sms"));
    setInAppEnabled(template.channels.includes("in_app"));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const channels = [
      ...(inAppEnabled ? ["in_app"] : []),
      ...(smsEnabled ? ["sms"] : []),
    ];
    if (!channels.length) {
      setError("Select at least one delivery channel.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Enter a broadcast message of at least 10 characters.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ audience, message: message.trim(), channels });
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not create the broadcast.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create Exam Broadcast</DialogTitle>
            <DialogDescription>
              Broadcasts are persisted for the current school and routed to in-app notifications or SMS where configured.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="exam-broadcast-template">Template</Label>
              <select
                id="exam-broadcast-template"
                value={templateName}
                onChange={(event) => applyTemplate(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Custom broadcast</option>
                {templates.map((template) => <option key={template.label} value={template.label}>{template.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-broadcast-audience">Audience</Label>
              <select
                id="exam-broadcast-audience"
                required
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="parents">Parents</option>
                <option value="teachers">Teachers</option>
                <option value="staff">Staff</option>
                <option value="guardians">Guardians</option>
                <option value="all">All school users</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Delivery channels</Label>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={inAppEnabled} onChange={(event) => setInAppEnabled(event.target.checked)} /> In-app</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={smsEnabled} onChange={(event) => setSmsEnabled(event.target.checked)} /> SMS</label>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-broadcast-message">Message</Label>
              <Textarea
                id="exam-broadcast-message"
                required
                minLength={10}
                maxLength={1000}
                rows={5}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </div>
            {error ? <div role="alert" className="text-sm text-destructive">{error}</div> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || message.trim().length < 10}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Broadcast
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CommunicationWorkspace({ model }: { model: unknown }) {
  void model;
  const [notice, setNotice] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const { data: broadcasts, isLoading, error, refetch } = useSchoolQuery<BroadcastRow[]>("/communication/messages");
  const rows = Array.isArray(broadcasts) ? broadcasts : [];

  async function createBroadcast(draft: BroadcastDraft) {
    setSavingAction("create-broadcast");
    try {
      const result = await requestDashboardApi<{ broadcast?: { smsRecipientCount?: number } }>("/api/admin-command/communication-broadcasts", {
        method: "POST",
        body: { ...draft },
      });
      await refetch();
      const smsRecipientCount = result.broadcast?.smsRecipientCount ?? 0;
      setNotice(`Broadcast created for ${draft.audience}${draft.channels.includes("sms") ? `; ${smsRecipientCount} SMS recipient${smsRecipientCount === 1 ? "" : "s"} queued` : ""}.`);
    } finally {
      setSavingAction(null);
    }
  }

  async function duplicateBroadcast(row: BroadcastRow) {
    if (!row.message) {
      setNotice("This broadcast has no message body to duplicate.");
      return;
    }
    await createBroadcast({
      audience: row.recipient ?? "parents",
      message: row.message,
      channels: channelsFromText(row.channel),
    });
  }

  async function cancelBroadcast(row: BroadcastRow) {
    if (!row.id) {
      setNotice("This broadcast must have a persisted ID before it can be cancelled.");
      return;
    }
    setSavingAction(`cancel:${row.id}`);
    try {
      await requestDashboardApi(`/api/communication/broadcasts/${encodeURIComponent(row.id)}/cancel`, { method: "PATCH" });
      await refetch();
      setNotice("Scheduled broadcast cancelled.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not cancel the scheduled broadcast.");
    } finally {
      setSavingAction(null);
    }
  }

  function previewFullMessage(row: BroadcastRow) {
    openPrintDocument({
      eyebrow: "Exam communication",
      title: `Broadcast to ${row.recipient ?? "school audience"}`,
      subtitle: row.channel ? `Channels: ${row.channel}` : "Channels: in-app",
      rows: [
        { label: "Date", value: row.date ? new Date(row.date).toLocaleString() : "Not scheduled" },
        { label: "Audience", value: row.recipient ?? "Not specified" },
        { label: "Delivery status", value: row.status || "pending" },
        { label: "Sent by", value: row.sent_by || "System" },
        { label: "Message", value: row.message || "No message body recorded" },
      ],
      footer: "Message preview generated from tenant-scoped communication broadcasts.",
    });
    setNotice(`Message preview ready for ${row.recipient ?? "selected audience"}.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          eyebrow="Communication"
          title="Exam Notices & Alerts"
          description="Send SMS and portal notifications to parents, students, and teachers."
        />
        <div className="flex flex-wrap gap-2">
          <BroadcastDialog onSubmit={createBroadcast}>
            <Button type="button" variant="outline" disabled={!!savingAction}><Copy className="mr-2 h-4 w-4" /> Select Template</Button>
          </BroadcastDialog>
          <BroadcastDialog onSubmit={createBroadcast}>
            <Button type="button" disabled={!!savingAction}>{savingAction === "create-broadcast" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Create Broadcast</Button>
          </BroadcastDialog>
        </div>
      </div>
      {notice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {templates.map((template) => (
          <Card key={template.label} className="flex min-h-[132px] flex-col justify-between p-5">
            <div>
              <p className="flex items-center gap-2 font-medium"><MessageSquare className="h-4 w-4 text-muted-foreground" /> {template.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{template.desc}</p>
            </div>
            <BroadcastDialog initialTemplate={template} onSubmit={createBroadcast}>
              <Button type="button" variant="ghost" size="sm" className="-ml-3 w-fit text-primary" disabled={!!savingAction}>Use Template</Button>
            </BroadcastDialog>
          </Card>
        ))}
      </section>

      <Card className="overflow-hidden p-0">
        <div className="border-b p-5">
          <h3 className="text-lg font-semibold">Broadcast History</h3>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Target Audience</TableHead>
                <TableHead>Message Snippet</TableHead>
                <TableHead>Delivery Status</TableHead>
                <TableHead>Sent By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center">
                    <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Loading active communications...</p>
                  </TableCell>
                </TableRow>
              ) : null}
              {error ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-destructive">
                    Error loading communications: {error.message}
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && !error && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    <p>No exam broadcasts have been sent yet.</p>
                    <div className="mt-4 flex justify-center">
                      <BroadcastDialog onSubmit={createBroadcast}>
                        <Button type="button" size="sm"><Plus className="mr-2 h-4 w-4" /> Create First Broadcast</Button>
                      </BroadcastDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ) : null}
              {!isLoading && !error && rows.map((row, idx) => (
                <TableRow key={row.id ?? `${row.date ?? "broadcast"}-${idx}`}>
                  <TableCell className="whitespace-nowrap text-sm">{row.date ? new Date(row.date).toLocaleDateString() : "Not scheduled"}</TableCell>
                  <TableCell>{row.recipient ?? "Not specified"}</TableCell>
                  <TableCell className="max-w-[320px] truncate text-muted-foreground">{row.message ?? "No message body recorded"}</TableCell>
                  <TableCell><Badge variant={statusVariant(row.status)}>{row.status ?? "pending"}</Badge></TableCell>
                  <TableCell>{row.sent_by ?? "System"}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => previewFullMessage(row)}><Eye className="mr-2 h-4 w-4" /> View Full Message</DropdownMenuItem>
                        <DropdownMenuItem disabled={!!savingAction} onClick={() => void duplicateBroadcast(row)}><Copy className="mr-2 h-4 w-4" /> Duplicate Broadcast</DropdownMenuItem>
                        {["pending", "scheduled", "draft"].includes((row.status ?? "").toLowerCase()) ? (
                          <DropdownMenuItem className="text-destructive" disabled={!!savingAction} onClick={() => void cancelBroadcast(row)}><Clock className="mr-2 h-4 w-4" /> Cancel Scheduled</DropdownMenuItem>
                        ) : null}
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
