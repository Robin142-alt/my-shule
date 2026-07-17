"use client";

import { IntegratedSchoolCommandHeader, SchoolCommandSidebarIdentity } from "@/components/school/integrated-school-command-header";

import { useState, type FormEvent } from "react";
import { Search, Monitor, ShieldAlert, Server, Smartphone, CheckCircle2, LayoutDashboard, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { toast } from "sonner";

type IctView = "overview" | "helpdesk" | "inventory" | "access" | "logs";

function ictActionSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function recordIctWorkflowAction(title: string, description: string, priority: "normal" | "high" = "normal") {
  try {
    await requestDashboardApi("/api/admin-command/ict-manager/actions", {
      method: "POST",
      body: {
        action: ictActionSlug(title),
        title,
        description,
        priority,
        source: "ict-manager-dashboard",
      },
    });
    toast.success(title, { description });
    return true;
  } catch (error) {
    toast.error("ICT action was not saved", {
      description: error instanceof Error ? error.message : "The ICT workflow could not be persisted for audit and follow-up.",
    });
    return false;
  }
}

function Panel({ title, description, icon: Icon, children, actions }: { title: string; description?: string; icon?: any; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#D8E0EC] bg-white p-5 shadow-[0_18px_50px_rgba(7,29,73,0.08)]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          {Icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EEF5FF] text-[#1D4ED8]">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
          )}
          <div>
            <h2 className="text-xl font-black tracking-[-0.01em] text-[#071D49]">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function OverviewWorkspace() {
  const { data: ticketsData } = useSchoolQuery<any>("/api/support/tickets?limit=5");
  const { data: alertsData } = useSchoolQuery<any>("/api/observability/alerts");
  const { data: healthData } = useSchoolQuery<any>("/api/observability/health");
  const { data: assetsData } = useSchoolQuery<any>("/api/assets/dashboard");

  const openTickets = ticketsData?.meta?.total_items ?? 0;
  const systemAlerts = alertsData?.alerts?.length ?? healthData?.active_alert_count ?? 0;
  const assignedDevices = assetsData?.total_records ?? 0;
  const tickets = ticketsData?.data ?? [];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Open IT Tickets</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{openTickets}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Assigned Devices</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{assignedDevices}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">System Alerts</div>
          <div className={`mt-2 text-3xl font-black ${systemAlerts > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {systemAlerts}
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Helpdesk Tickets</h2>
        {tickets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Monitor className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Support tickets and infrastructure logs will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket: any) => (
              <div key={ticket.id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition">
                <div>
                  <p className="font-semibold text-[#071D49]">{ticket.subject}</p>
                  <p className="text-sm text-gray-500 mt-1">{ticket.status} • {new Date(ticket.created_at).toLocaleDateString()}</p>
                </div>
                <StatusPill label={ticket.priority} tone={ticket.priority === 'urgent' ? 'critical' : 'ok'} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function ItHelpdeskWorkspace({
  ticketModalOpen,
  onTicketModalOpenChange,
}: {
  ticketModalOpen: boolean;
  onTicketModalOpenChange: (open: boolean) => void;
}) {
  const { data: ticketsData, isLoading, refetch } = useSchoolQuery<any>("/api/support/tickets");
  const tickets = ticketsData?.data ?? [];

  const openTicket = (ticket: any) => {
    openPrintDocument({
      eyebrow: "ICT helpdesk",
      title: "Support Ticket",
      subtitle: ticket.subject || "Ticket details",
      rows: [
        { label: "Subject", value: String(ticket.subject || "-") },
        { label: "Status", value: String(ticket.status || "-") },
        { label: "Priority", value: String(ticket.priority || "-") },
        { label: "Created", value: ticket.created_at ? new Date(ticket.created_at).toLocaleString() : "-" },
      ],
      footer: "ICT support tickets must be resolved with school-scoped audit context.",
    });
  };

  return (
    <>
      <Panel title="IT Helpdesk" description="Manage support tickets from staff and students." icon={Monitor} actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white" onClick={() => onTicketModalOpenChange(true)}><Plus className="w-4 h-4 mr-2" /> New Ticket</Button>}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading tickets...</p>
        ) : !tickets.length ? (
          <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
            <p className="font-semibold text-[#071D49]">No IT tickets found.</p>
            <p className="mt-1 text-sm">Create a ticket for device faults, account issues, or software support requests.</p>
            <Button className="mt-4 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white" onClick={() => onTicketModalOpenChange(true)}>Create first ticket</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-black">Subject</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Priority</th>
                  <th className="px-4 py-3 font-black">Created</th>
                  <th className="px-4 py-3 text-right font-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {tickets.map((t: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-[#071D49]">{t.subject}</td>
                    <td className="px-4 py-3"><StatusPill label={t.status} tone="ok" /></td>
                    <td className="px-4 py-3"><StatusPill label={t.priority} tone={t.priority === 'urgent' ? 'critical' : 'ok'} /></td>
                    <td className="px-4 py-3 text-[#64748B]">{t.created_at ? new Date(t.created_at).toLocaleDateString() : "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => openTicket(t)} className="text-[#1D4ED8] hover:underline text-xs font-bold">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <NewIctTicketModal open={ticketModalOpen} onClose={() => onTicketModalOpenChange(false)} onCreated={() => void refetch()} />
    </>
  );
}

function DeviceInventoryWorkspace() {
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [selectedAssetForManagement, setSelectedAssetForManagement] = useState<any | null>(null);
  const { data: assetsData, isLoading, refetch } = useSchoolQuery<any>("/api/assets/dashboard");
  const assets = assetsData?.data ?? assetsData?.records ?? assetsData?.items ?? [];

  return (
    <>
      <Panel title="Device Inventory" description="Manage laptops, tablets, projectors, and other IT assets." icon={Smartphone} actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white" onClick={() => setDeviceModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Register Device</Button>}>
        {isLoading ? (
          <p className="text-sm text-slate-500">Loading assets...</p>
        ) : !assets.length ? (
          <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
            <p className="font-semibold text-[#071D49]">No IT assets found.</p>
            <p className="mt-1 text-sm">Register laptops, tablets, printers, projectors, and network equipment before assigning custodians.</p>
            <Button className="mt-4 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white" onClick={() => setDeviceModalOpen(true)}>Register first device</Button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-black">Item Name</th>
                  <th className="px-4 py-3 font-black">Category</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 text-right font-black">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8E0EC]">
                {assets.map((a: any, i: number) => {
                  const assetName = a.item_name ?? a.title ?? a.name ?? "Device";
                  return (
                    <tr key={a.id ?? i} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-[#071D49]">{assetName}</td>
                      <td className="px-4 py-3 text-[#64748B]">{a.category ?? "-"}</td>
                      <td className="px-4 py-3"><StatusPill label={a.status || 'Active'} tone="ok" /></td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" className="text-[#1D4ED8] hover:underline text-xs font-bold" onClick={() => setSelectedAssetForManagement(a)}>Manage</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <RegisterIctDeviceModal open={deviceModalOpen} onClose={() => setDeviceModalOpen(false)} onCreated={() => void refetch()} />
      <ManageIctAssetModal
        asset={selectedAssetForManagement}
        open={Boolean(selectedAssetForManagement)}
        onClose={() => setSelectedAssetForManagement(null)}
        onManaged={() => void refetch()}
      />
    </>
  );
}

function AccessControlWorkspace() {
  return (
    <Panel title="Access Control" description="Manage RFID tags, gate access, and network credentials." icon={ShieldAlert}>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["RFID access audit", "Review active staff/student access cards and expired credentials.", "normal"],
          ["Credential issue request", "Capture user, access zone, expiry date, approver, and reason before issuing.", "high"],
          ["Network account review", "Review locked, stale, or privileged school network accounts.", "high"],
        ].map(([title, detail, priority]) => (
          <button
            key={title}
            type="button"
            onClick={() => recordIctWorkflowAction(title, detail, priority === "high" ? "high" : "normal")}
            className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4 text-left transition hover:border-[#1D4ED8]"
          >
            <p className="font-black text-[#071D49]">{title}</p>
            <p className="mt-2 text-sm font-semibold text-[#64748B]">{detail}</p>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function NewIctTicketModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function submitTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const subject = String(form.get("subject") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const category = String(form.get("category") ?? "Bug Report");
    const priority = String(form.get("priority") ?? "Medium");
    const moduleAffected = String(form.get("module_affected") ?? "ICT");
    const device = String(form.get("device") ?? "").trim();

    if (!subject || !description) {
      toast.error("Subject and description are required.");
      return;
    }

    setSubmitting(true);
    try {
      await requestDashboardApi("/api/support/tickets", {
        method: "POST",
        body: {
          subject,
          category,
          priority,
          module_affected: moduleAffected,
          description,
          device: device || undefined,
          current_page_url: typeof window !== "undefined" ? window.location.href : undefined,
        },
      });
      await recordIctWorkflowAction("ICT support ticket created", `${subject} was submitted to the support ticket queue.`, priority === "High" || priority === "Critical" ? "high" : "normal");
      toast.success("ICT ticket created", { description: subject });
      onCreated?.();
      onClose();
    } catch (error) {
      toast.error("ICT ticket was not created", {
        description: error instanceof Error ? error.message : "The ticket could not be saved.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New ICT ticket" open={open} onClose={onClose} size="lg">
      <form onSubmit={submitTicket} className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Subject
            <input name="subject" required className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="e.g. Lab projector not working" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Affected module
            <input name="module_affected" required defaultValue="ICT" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Category
            <select name="category" defaultValue="Bug Report" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
              <option>Bug Report</option>
              <option>Performance</option>
              <option>Login Issues</option>
              <option>Reports</option>
              <option>Feature Request</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Priority
            <select name="priority" defaultValue="Medium" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Device or location
            <input name="device" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Computer lab 2, printer serial, staff laptop..." />
          </label>
          <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Description
            <textarea name="description" required rows={4} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#D8E0EC] pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Ticket"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function RegisterIctDeviceModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  async function submitDevice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "").trim();
    const ownerName = String(form.get("owner_name") ?? "").trim();
    const assetTag = String(form.get("asset_tag") ?? "").trim();
    const condition = String(form.get("condition") ?? "serviceable");

    if (!title || !category || !assetTag) {
      toast.error("Device name, category, and asset tag are required.");
      return;
    }

    setSubmitting(true);
    try {
      await requestDashboardApi("/api/assets/records", {
        method: "POST",
        body: {
          title,
          category,
          owner_name: ownerName || "ICT Department",
          status: "active",
          priority: condition === "faulty" ? "critical" : "normal",
          notes: String(form.get("notes") ?? "").trim() || undefined,
          metadata: {
            asset_tag: assetTag,
            serial_number: String(form.get("serial_number") ?? "").trim() || null,
            location: String(form.get("location") ?? "").trim() || null,
            condition,
            support_owner: String(form.get("support_owner") ?? "").trim() || null,
          },
        },
      });
      await recordIctWorkflowAction("ICT device registered", `${title} was added to the school asset register.`, condition === "faulty" ? "high" : "normal");
      toast.success("Device registered", { description: title });
      onCreated?.();
      onClose();
    } catch (error) {
      toast.error("ICT device was not registered", {
        description: error instanceof Error ? error.message : "The asset record could not be saved.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Register ICT device" open={open} onClose={onClose} size="lg">
      <form onSubmit={submitDevice} className="space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Device name
            <input name="title" required className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="e.g. HP LaserJet Finance Office" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Asset tag
            <input name="asset_tag" required className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="ICT-2026-001" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Category
            <select name="category" defaultValue="laptop" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
              <option value="laptop">Laptop</option>
              <option value="tablet">Tablet</option>
              <option value="projector">Projector</option>
              <option value="printer">Printer</option>
              <option value="network">Network equipment</option>
              <option value="fault">Fault report</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Condition
            <select name="condition" defaultValue="serviceable" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
              <option value="serviceable">Serviceable</option>
              <option value="needs_maintenance">Needs maintenance</option>
              <option value="faulty">Faulty</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Custodian
            <input name="owner_name" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="ICT Department or staff name" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Location
            <input name="location" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Lab, office, classroom..." />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Serial number
            <input name="serial_number" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Support owner
            <input name="support_owner" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
          </label>
          <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Notes
            <textarea name="notes" rows={3} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#D8E0EC] pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Registering..." : "Register Device"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ManageIctAssetModal({
  asset,
  open,
  onClose,
  onManaged,
}: {
  asset: any | null;
  open: boolean;
  onClose: () => void;
  onManaged?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const assetName = asset?.item_name ?? asset?.title ?? asset?.name ?? "ICT asset";
  const assetId = String(asset?.id ?? asset?.asset_id ?? asset?.asset_tag ?? assetName).trim();

  async function handleManageIctAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const action = String(form.get("action") ?? "").trim();
    const condition = String(form.get("condition") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    if (!assetId || !action) {
      toast.error("Asset and management action are required.");
      return;
    }

    setSubmitting(true);
    try {
      await requestDashboardApi(`/api/admin-command/ict-manager/assets/${assetId}/manage`, {
        method: "POST",
        body: {
          action,
          condition,
          notes,
          asset_name: assetName,
          asset_tag: asset?.asset_tag ?? asset?.metadata?.asset_tag ?? null,
          source: "ict-manager-dashboard",
        },
      });
      toast.success("ICT asset management request saved", {
        description: `${assetName} is queued for ICT follow-up and audit review.`,
      });
      onManaged?.();
      onClose();
    } catch (error) {
      toast.error("ICT asset management was not saved", {
        description: error instanceof Error ? error.message : "The asset workflow could not be persisted.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!asset) {
    return null;
  }

  return (
    <Modal title="Manage ICT asset" open={open} onClose={onClose} size="lg">
      <form onSubmit={handleManageIctAsset} className="space-y-4 p-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#64748B]">Selected asset</p>
          <p className="mt-1 text-lg font-black text-[#071D49]">{assetName}</p>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">{asset?.category ?? "Uncategorised"} • {asset?.status ?? "Active"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Action
            <select name="action" required defaultValue="Review assignment" className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
              <option>Review assignment</option>
              <option>Assign custodian</option>
              <option>Schedule maintenance</option>
              <option>Mark returned</option>
              <option>Escalate replacement</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49]">Condition
            <select name="condition" defaultValue={asset?.metadata?.condition ?? "serviceable"} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm">
              <option value="serviceable">Serviceable</option>
              <option value="needs_maintenance">Needs maintenance</option>
              <option value="faulty">Faulty</option>
              <option value="retired">Retired</option>
            </select>
          </label>
          <label className="text-sm font-bold text-[#071D49] sm:col-span-2">Notes
            <textarea name="notes" rows={4} className="mt-1 w-full rounded-lg border border-[#D8E0EC] px-3 py-2 text-sm" placeholder="Assignment change, maintenance details, handover notes, or replacement reason..." />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#D8E0EC] pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save Management Action"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function SystemLogsWorkspace() {
  const { data: alertsData, isLoading } = useSchoolQuery<any>("/api/observability/alerts");
  const alerts = alertsData?.alerts ?? [];

  return (
    <Panel title="System Logs" description="Review server logs, observability metrics, and infrastructure alerts." icon={Server}>
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading alerts...</p>
      ) : !alerts.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No system alerts at the moment. Everything is running smoothly.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert: any, i: number) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4">
              <div>
                <p className="font-bold text-red-800">{alert.name}</p>
                <p className="text-xs text-red-600 mt-1">{alert.description || alert.type}</p>
              </div>
              <StatusPill label="Active" tone="critical" />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

import { buildSchoolSectionHref } from "./school-pages";

export function IctManagerCommandCenter({ activeSection, routeMode }: { activeSection?: string; routeMode?: "hosted" | "public" }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [activeView, setActiveView] = useState<any>(
    activeSection && activeSection !== "dashboard" ? activeSection : "overview"
  );

  const handleSetView = (view: any) => {
    setActiveView(view);
    const newPath = buildSchoolSectionHref("ict-manager", view, routeMode ?? "hosted");
    window.history.replaceState(null, "", newPath);
  };

  const { data: ticketsData } = useSchoolQuery<any>("/api/support/tickets");
  const { data: alertsData } = useSchoolQuery<any>("/api/observability/alerts");
  const { data: healthData } = useSchoolQuery<any>("/api/health");
  const { data: assetsData } = useSchoolQuery<any>("/api/assets");

  const openTickets = ticketsData?.meta?.total_items ?? 0;
  const systemAlerts = alertsData?.alerts?.length ?? healthData?.active_alert_count ?? 0;
  const assignedDevices = assetsData?.total_records ?? 0;
  const tickets = ticketsData?.data ?? [];

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        
        {/* Sidebar */}
        <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:flex lg:flex-col lg:w-72 shrink-0">
          <SchoolCommandSidebarIdentity eyebrow="ICT command" title="ICT Manager" subtitle="Systems, devices, access, and support" />
          <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar" aria-label="Navigation">
              <button onClick={() => handleSetView("overview")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${activeView === "overview" ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <LayoutDashboard className="h-4 w-4" /> Overview
              </button>
              <button onClick={() => handleSetView("helpdesk")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${activeView === "helpdesk" ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <ShieldAlert className="h-4 w-4" /> Helpdesk
              </button>
              <button onClick={() => handleSetView("inventory")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${activeView === "inventory" ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <Monitor className="h-4 w-4" /> Asset Inventory
              </button>
              <button onClick={() => handleSetView("access")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${activeView === "access" ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <Users className="h-4 w-4" /> Access Control
              </button>
              <button onClick={() => handleSetView("logs")} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold ${activeView === "logs" ? "bg-white/15 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>
                <Server className="h-4 w-4" /> System Logs
              </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <div className="min-h-[calc(100vh-3rem)] rounded-2xl bg-white shadow-[0_2px_40px_rgba(7,29,73,0.04)] overflow-hidden">
            
            <header className="sticky top-0 z-20 border-b border-[#D8E0EC] bg-[#F3F6FA]/90 px-4 py-2 backdrop-blur">
              <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#071D49] text-xs font-black text-white">MS</div>
                  <div>
                    <h1 className="text-lg font-black text-[#071D49]">ICT Manager Dashboard</h1>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <label className="flex min-h-10 items-center gap-3 rounded-xl border border-[#D8E0EC] bg-white px-3 text-[#64748B] shadow-sm focus-within:border-[#1D4ED8] focus-within:ring-1 focus-within:ring-[#1D4ED8]">
                      <Search className="h-4 w-4" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#94A3B8]"
                        placeholder="Search devices or tickets..."
                      />
                    </label>
                  </div>
                  <Button className="bg-[#071D49] hover:bg-[#071D49]/90 text-white rounded-xl" onClick={() => { handleSetView("helpdesk"); setTicketModalOpen(true); }}>New IT Ticket</Button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
              <IntegratedSchoolCommandHeader roleTitle="ICT Manager Dashboard" fallbackUserLabel="ICT Manager" className="mb-6" />
              {activeView === "overview" && <OverviewWorkspace />}
              {activeView === "helpdesk" && <ItHelpdeskWorkspace ticketModalOpen={ticketModalOpen} onTicketModalOpenChange={setTicketModalOpen} />}
              {activeView === "inventory" && <DeviceInventoryWorkspace />}
              {activeView === "access" && <AccessControlWorkspace />}
              {activeView === "logs" && <SystemLogsWorkspace />}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
