"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ShoppingCart, FileText, Truck, DollarSign, LayoutDashboard, Plus, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { buildSchoolSectionHref } from "./school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { openPrintDocument } from "@/lib/dashboard/export";
import { toast } from "sonner";

type ProcurementView = "overview" | "pos" | "suppliers" | "requisitions" | "budget";

function procurementActionSlug(message: string) {
  return message
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "workflow.action";
}

async function recordProcurementAction(setNotice: (message: string | null) => void, message: string, title = "Procurement workflow action") {
  try {
    await requestDashboardApi("/api/admin-command/procurement-officer/actions", {
      method: "POST",
      body: {
        action: procurementActionSlug(message),
        title,
        description: message,
        priority: /approval|delivery|budget|blocked|overdue/i.test(message) ? "high" : "normal",
        source: "procurement-officer-dashboard",
      },
    });
    setNotice(message);
  } catch (error) {
    toast.error("Procurement action was not saved", {
      description: error instanceof Error ? error.message : "The procurement workflow could not be persisted for audit and follow-up.",
    });
  }
}

function openProcurementRecord(title: string, rows: Array<[string, string]>) {
  openPrintDocument({
    eyebrow: "MyShule Procurement",
    title,
    subtitle: `Generated ${new Date().toLocaleString()}`,
    rows: rows.map(([label, value]) => ({ label, value })),
    footer: "Procurement records are tenant-scoped and should match supplier, requisition, delivery, and audit records.",
  });
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
  const { data: posData } = useSchoolQuery<any>("/api/inventory/purchase-orders?limit=5");
  const { data: reqsData } = useSchoolQuery<any>("/api/inventory/requests?status=pending");
  const { data: summaryData } = useSchoolQuery<any>("/api/inventory/summary");

  const pendingReqs = reqsData?.meta?.total_items ?? 0;
  const activePOs = posData?.meta?.total_items ?? 0;
  const awaitingDelivery = summaryData?.awaiting_delivery ?? 0;
  const recentPOs = posData?.data ?? [];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Pending Requisitions</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{pendingReqs}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Active Purchase Orders</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{activePOs}</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm font-semibold text-gray-500">Awaiting Delivery</div>
          <div className="mt-2 text-3xl font-black text-[#071D49]">{awaitingDelivery}</div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Procurement Activity</h2>
        {recentPOs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Purchase orders and requisitions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentPOs.map((po: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition">
                <div>
                  <p className="font-semibold text-[#071D49]">{po.order_number}</p>
                  <p className="text-sm text-gray-500 mt-1">{po.supplier_name} • KES {po.total_amount?.toLocaleString()}</p>
                </div>
                <StatusPill label={po.status} tone={po.status === 'approved' ? 'ok' : 'warning'} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function PurchaseOrdersWorkspace({
  modalOpen,
  onModalOpenChange,
}: {
  modalOpen: boolean;
  onModalOpenChange: (open: boolean) => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const { data: posData, isLoading, refetch } = useSchoolQuery<any>("/api/inventory/purchase-orders");
  const pos = posData?.data ?? [];

  return (
    <>
    <Panel
      title="Purchase Orders"
      description="Create and track purchase orders with suppliers."
      icon={ShoppingCart}
      actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white" onClick={() => onModalOpenChange(true)}><Plus className="w-4 h-4 mr-2" /> New PO</Button>}
    >
      {notice ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading purchase orders...</p>
      ) : !pos.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No purchase orders found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-black">Order #</th>
                <th className="px-4 py-3 font-black">Supplier</th>
                <th className="px-4 py-3 font-black">Total</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              {pos.map((po: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{po.order_number}</td>
                  <td className="px-4 py-3 text-[#64748B]">{po.supplier_name}</td>
                  <td className="px-4 py-3 font-medium">KES {po.total_amount?.toLocaleString()}</td>
                  <td className="px-4 py-3"><StatusPill label={po.status} tone={po.status === 'approved' ? 'ok' : 'warning'} /></td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      className="text-[#1D4ED8] hover:underline text-xs font-bold"
                      onClick={() => openProcurementRecord("Purchase order details", [
                        ["Order #", String(po.order_number ?? po.po_number ?? po.id ?? "-")],
                        ["Supplier", String(po.supplier_name ?? "-")],
                        ["Total", `KES ${po.total_amount?.toLocaleString?.() ?? po.total_amount ?? "-"}`],
                        ["Status", String(po.status ?? "-")],
                      ])}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    <NewPurchaseOrderModal
      open={modalOpen}
      onClose={() => onModalOpenChange(false)}
      onCreated={() => {
        void refetch?.();
        setNotice("Purchase order created and added to procurement tracking.");
      }}
    />
    </>
  );
}

function NewPurchaseOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreatePurchaseOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supplierId = String(form.get("supplier_id") ?? "").trim();
    const supplierName = String(form.get("supplier_name") ?? "").trim();
    const requestId = String(form.get("request_id") ?? "").trim();
    const itemName = String(form.get("item_name") ?? "").trim();
    const quantity = Number(form.get("quantity") ?? 0);
    const unitCost = Number(form.get("unit_cost") ?? 0);
    const expectedDeliveryDate = String(form.get("expected_delivery_date") ?? "").trim();
    const notes = String(form.get("notes") ?? "").trim();

    if (!supplierId && !supplierName) {
      setError("Choose an existing supplier ID or enter a supplier name.");
      return;
    }
    if (!requestId && (!itemName || quantity <= 0)) {
      setError("Add at least one valid item or link an approved purchase request.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestDashboardApi("/api/admin-command/procurement-officer/purchase-orders", {
        method: "POST",
        body: {
          supplier_id: supplierId || undefined,
          supplier_name: supplierName || undefined,
          request_id: requestId || undefined,
          expected_delivery_date: expectedDeliveryDate || undefined,
          notes: notes || undefined,
          items: itemName
            ? [{
                item_name: itemName,
                quantity,
                unit_cost_minor: Math.round(Math.max(0, unitCost) * 100),
              }]
            : [],
        },
      });
      toast.success("Purchase order created", {
        description: supplierName || supplierId,
      });
      onCreated?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Purchase order could not be created.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New purchase order" open={open} onClose={onClose} size="lg">
      <form onSubmit={handleCreatePurchaseOrder} className="space-y-4 p-6">
        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-bold text-[#071D49]">Supplier ID
            <input name="supplier_id" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Existing supplier UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Supplier name
            <input name="supplier_name" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Or create/find by supplier name" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Approved request ID
            <input name="request_id" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Optional procurement request UUID" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Expected delivery date
            <input name="expected_delivery_date" type="date" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm font-bold text-[#071D49] md:col-span-1">Item name
            <input name="item_name" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Exercise books, toner..." />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Quantity
            <input name="quantity" type="number" min="1" step="1" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="1" />
          </label>
          <label className="text-sm font-bold text-[#071D49]">Unit cost (KES)
            <input name="unit_cost" type="number" min="0" step="0.01" className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="0.00" />
          </label>
        </div>
        <label className="block text-sm font-bold text-[#071D49]">Notes
          <textarea name="notes" rows={3} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Delivery instructions, budget code, approver notes..." />
        </label>
        <div className="flex justify-end gap-3 border-t border-[#D8E0EC] pt-4">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]" disabled={submitting}>Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
            {submitting ? "Creating..." : "Create Purchase Order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SupplierDirectoryWorkspace() {
  const [notice, setNotice] = useState<string | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const { data: suppliersData, isLoading, refetch } = useSchoolQuery<any>("/api/inventory/suppliers");
  const suppliers = suppliersData?.data ?? [];

  async function createSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSupplierSubmitting(true);
    setSupplierError(null);

    const formData = new FormData(event.currentTarget);
    const supplierName = String(formData.get("supplier_name") || "").trim();
    const contactPerson = String(formData.get("contact_person") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const county = String(formData.get("county") || "").trim();
    const status = String(formData.get("status") || "active") as "active" | "on_hold";

    if (!supplierName) {
      setSupplierError("Supplier name is required.");
      setSupplierSubmitting(false);
      return;
    }

    try {
      await requestDashboardApi("/api/inventory/suppliers", {
        method: "POST",
        body: {
          supplier_name: supplierName,
          contact_person: contactPerson || undefined,
          email: email || undefined,
          phone: phone || undefined,
          county: county || undefined,
          status,
        },
      });
      await recordProcurementAction(setNotice, `Supplier ${supplierName} created and recorded for procurement use.`, "Supplier created");
      await refetch();
      setIsSupplierModalOpen(false);
    } catch (error) {
      setSupplierError(error instanceof Error ? error.message : "Supplier could not be created.");
    } finally {
      setSupplierSubmitting(false);
    }
  }

  return (
    <Panel
      title="Supplier Directory"
      description="Manage school vendors and suppliers."
      icon={Truck}
      actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white" onClick={() => setIsSupplierModalOpen(true)}><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>}
    >
      {notice ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading suppliers...</p>
      ) : !suppliers.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No suppliers found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-black">Name</th>
                <th className="px-4 py-3 font-black">Category</th>
                <th className="px-4 py-3 font-black">Contact</th>
                <th className="px-4 py-3 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              {suppliers.map((s: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{s.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.category}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.contact_person}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-[#1D4ED8] hover:underline text-xs font-bold" onClick={() => setSelectedSupplier(s)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isSupplierModalOpen ? (
        <Modal title="Add Supplier" open={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} size="md">
          <form onSubmit={createSupplier} className="space-y-4 p-6">
            {supplierError ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
                {supplierError}
              </div>
            ) : null}
            <div>
              <label className="mb-1 block text-sm font-bold text-[#071D49]">Supplier name</label>
              <input name="supplier_name" required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. Crown Office Supplies" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-[#071D49]">Contact person</label>
                <input name="contact_person" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Contact name" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[#071D49]">Phone</label>
                <input name="phone" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="+254..." />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold text-[#071D49]">Email</label>
                <input name="email" type="email" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="supplier@example.com" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-[#071D49]">County</label>
                <input name="county" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="County" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold text-[#071D49]">Status</label>
              <select name="status" defaultValue="active" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
                <option value="active">Active</option>
                <option value="on_hold">On hold</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 border-t border-[#D8E0EC] pt-4">
              <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
              <button type="submit" disabled={supplierSubmitting} className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
                {supplierSubmitting ? "Saving..." : "Save Supplier"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
      <EditProcurementSupplierModal
        selectedSupplier={selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
        onUpdated={() => {
          void refetch?.();
          setNotice("Supplier profile updated and saved to procurement register.");
        }}
      />
    </Panel>
  );
}

function EditProcurementSupplierModal({
  selectedSupplier,
  onClose,
  onUpdated,
}: {
  selectedSupplier: any | null;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdateSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSupplier?.id) {
      setError("A valid supplier record is required.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const category = String(formData.get("category") ?? "").trim();
    const contactName = String(formData.get("contact_name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const kraPin = String(formData.get("kra_pin") ?? "").trim();
    const status = String(formData.get("status") ?? "").trim();

    if (!name) {
      setError("Supplier name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await requestDashboardApi(`/api/admin-command/procurement-officer/suppliers/${selectedSupplier.id}`, {
        method: "PUT",
        body: {
          name,
          category: category || undefined,
          contact_name: contactName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          kra_pin: kraPin || undefined,
          status: status || undefined,
        },
      });
      toast.success("Supplier updated", {
        description: name,
      });
      onUpdated?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Supplier profile could not be updated.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selectedSupplier) {
    return null;
  }

  return (
    <Modal title="Edit Supplier" open={Boolean(selectedSupplier)} onClose={onClose} size="md">
      <form onSubmit={handleUpdateSupplier} className="space-y-4 p-6">
        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}
        <div>
          <label className="mb-1 block text-sm font-bold text-[#071D49]">Supplier name</label>
          <input name="name" required defaultValue={selectedSupplier.name ?? selectedSupplier.supplier_name ?? ""} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[#071D49]">Category</label>
            <input name="category" defaultValue={selectedSupplier.category ?? ""} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[#071D49]">Contact person</label>
            <input name="contact_name" defaultValue={selectedSupplier.contact_name ?? selectedSupplier.contact_person ?? ""} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[#071D49]">Phone</label>
            <input name="phone" defaultValue={selectedSupplier.phone ?? ""} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[#071D49]">Email</label>
            <input name="email" type="email" defaultValue={selectedSupplier.email ?? ""} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[#071D49]">KRA PIN</label>
            <input name="kra_pin" defaultValue={selectedSupplier.kra_pin ?? selectedSupplier.kraPin ?? ""} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[#071D49]">Status</label>
            <select name="status" defaultValue={selectedSupplier.status ?? "active"} className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[#D8E0EC] pt-4">
          <button type="button" onClick={onClose} disabled={submitting} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button type="submit" disabled={submitting} className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function RequisitionsWorkspace() {
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const { data: requestsData, isLoading, refetch } = useSchoolQuery<any>("/api/inventory/requests");
  const requests = requestsData?.data ?? [];

  return (
    <>
    <Panel title="Requisitions" description="Review and approve departmental requests." icon={FileText}>
      {notice ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      {isLoading ? (
        <p className="text-sm text-slate-500">Loading requests...</p>
      ) : !requests.length ? (
        <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
          No requisitions found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-4 py-3 font-black">Request #</th>
                <th className="px-4 py-3 font-black">Department</th>
                <th className="px-4 py-3 font-black">Item</th>
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 text-right font-black">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8E0EC]">
              {requests.map((r: any, i: number) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{r.request_number}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.department}</td>
                  <td className="px-4 py-3 text-[#64748B]">{r.item_name} (x{r.quantity})</td>
                  <td className="px-4 py-3"><StatusPill label={r.status} tone={r.status === 'approved' ? 'ok' : 'warning'} /></td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" className="text-[#1D4ED8] hover:underline text-xs font-bold" onClick={() => setSelectedRequest(r)}>Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
    <ReviewProcurementRequestModal
      selectedRequest={selectedRequest}
      onClose={() => setSelectedRequest(null)}
      onDecided={(decision) => {
        void refetch?.();
        setNotice(`Requisition ${decision === "approve" ? "approved" : "rejected"} and routed through procurement approvals.`);
      }}
    />
    </>
  );
}

function ReviewProcurementRequestModal({
  selectedRequest,
  onClose,
  onDecided,
}: {
  selectedRequest: any | null;
  onClose: () => void;
  onDecided?: (decision: "approve" | "reject") => void;
}) {
  const [submitting, setSubmitting] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  async function handleDecidePurchaseRequest(decision: "approve" | "reject", notes: string, event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!selectedRequest?.id) {
      setError("A valid procurement request ID is required.");
      return;
    }
    const reason = notes.trim();

    setSubmitting(decision);
    setError(null);
    try {
      await requestDashboardApi(`/api/admin-command/procurement-officer/purchase-requests/${selectedRequest.id}/${decision}`, {
        method: "POST",
        body: reason ? { reason, notes: reason } : {},
      });
      toast.success(`Requisition ${decision === "approve" ? "approved" : "rejected"}`, {
        description: String(selectedRequest.request_number ?? selectedRequest.id),
      });
      onDecided?.(decision);
          onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The procurement request decision could not be saved.");
    } finally {
      setSubmitting(null);
    }
  }

  if (!selectedRequest) {
    return null;
  }

  return (
    <Modal title="Review procurement requisition" open={Boolean(selectedRequest)} onClose={onClose} size="lg">
      <form onSubmit={(event) => handleDecidePurchaseRequest("approve", decisionNotes, event)} className="space-y-4 p-6">
        {error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
            {error}
          </div>
        ) : null}
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">Selected requisition</p>
          <p className="mt-1 text-lg font-black text-[#071D49]">{selectedRequest.request_number ?? selectedRequest.id}</p>
          <p className="mt-1 text-sm font-semibold text-[#64748B]">
            {selectedRequest.department ?? "Department"} · {selectedRequest.item_name ?? selectedRequest.title ?? "Requested item"}
          </p>
        </div>
        <label className="block text-sm font-bold text-[#071D49]">Decision notes
          <textarea value={decisionNotes} onChange={(event) => setDecisionNotes(event.currentTarget.value)} name="reason" rows={3} className="mt-1 w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="Approval, rejection, or return notes for audit trail..." />
        </label>
        <div className="flex flex-wrap justify-end gap-3 border-t border-[#D8E0EC] pt-4">
          <button type="button" onClick={onClose} disabled={Boolean(submitting)} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button type="button" disabled={Boolean(submitting)} onClick={() => void handleDecidePurchaseRequest("reject", decisionNotes)} className="rounded-xl border border-red-200 bg-red-50 px-5 py-2 text-sm font-black text-red-700 disabled:opacity-60">
            {submitting === "reject" ? "Rejecting..." : "Reject"}
          </button>
          <button type="submit" disabled={Boolean(submitting)} className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white disabled:opacity-60">
            {submitting === "approve" ? "Approving..." : "Approve"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function BudgetTrackingWorkspace() {
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingBudgetAction, setPendingBudgetAction] = useState<string | null>(null);
  const { data: overview, isLoading } = useSchoolQuery<any>("/api/admin-command/procurement-officer/overview");
  const metrics = overview?.metrics ?? {};
  const cards = [
    ["Pending Requests", metrics.pending_requests ?? 0, "Requests waiting for procurement review"],
    ["Active Orders", metrics.active_orders ?? 0, "Orders issued or partly received"],
    ["Deliveries Due", metrics.deliveries_due ?? 0, "Orders needing delivery follow-up"],
    ["Active Suppliers", metrics.suppliers ?? 0, "Suppliers available for purchasing"],
  ];
  const budgetActions = [
    {
      action: "review_commitments",
      label: "Review procurement commitments against department budget codes.",
      success: "Budget commitments reviewed against live procurement requests and orders.",
    },
    {
      action: "flag_overdue_deliveries",
      label: "Flag overdue deliveries for principal and storekeeper follow-up.",
      success: "Overdue procurement deliveries flagged for principal and storekeeper follow-up.",
    },
    {
      action: "generate_budget_report",
      label: "Generate procurement budget report for finance reconciliation.",
      success: "Procurement budget reconciliation report compiled.",
    },
  ];

  async function handleProcurementBudgetAction(action: string, successMessage: string) {
    setPendingBudgetAction(action);
    try {
      await requestDashboardApi("/api/admin-command/procurement-officer/budget-actions", {
        method: "POST",
        body: {
          action,
          format: action === "generate_budget_report" ? "xlsx" : undefined,
        },
      });
      setNotice(successMessage);
      toast.success(successMessage);
    } catch (error) {
      toast.error("Procurement budget workflow failed", {
        description: error instanceof Error ? error.message : "The budget action could not be persisted.",
      });
    } finally {
      setPendingBudgetAction(null);
    }
  }

  return (
    <Panel title="Budget Tracking" description="Monitor procurement spend against departmental budgets." icon={DollarSign}>
      {notice ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
      <div className="grid gap-4 md:grid-cols-4">
        {cards.map(([label, value, helper]) => (
          <div key={label} className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748B]">{label}</p>
            <p className="mt-2 text-2xl font-black text-[#071D49]">{isLoading ? "..." : String(value)}</p>
            <p className="mt-1 text-xs font-semibold text-[#64748B]">{helper}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {budgetActions.map((item) => (
          <button
            key={item.action}
            type="button"
            disabled={Boolean(pendingBudgetAction)}
            className="rounded-xl border border-[#D8E0EC] bg-white p-4 text-left text-sm font-bold text-[#071D49] transition hover:border-[#1D4ED8]"
            onClick={() => void handleProcurementBudgetAction(item.action, item.success)}
          >
            {pendingBudgetAction === item.action ? "Processing..." : item.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

export function ProcurementOfficerCommandCenter({ routeMode, activeSection }: { routeMode?: "hosted" | "public"; activeSection?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [purchaseOrderModalOpen, setPurchaseOrderModalOpen] = useState(false);
  const [rawActiveView, setRawActiveView] = useState<ProcurementView>(
    (activeSection && activeSection !== "dashboard" ? activeSection : "overview") as ProcurementView
  );

  const setActiveView = (view: ProcurementView) => {
    setRawActiveView(view);
    window.history.replaceState(null, "", buildSchoolSectionHref("procurement-officer", view, routeMode ?? "hosted"));
  };
  
  const activeView = rawActiveView;

  return (
    <div className="min-h-screen bg-[#F3F6FA]">
      <div className="mx-auto flex max-w-[1920px] flex-col gap-6 p-4 lg:flex-row lg:p-6">
        
        {/* Sidebar */}
        <aside className="hidden h-[calc(100vh-1.5rem)] overflow-hidden rounded-2xl bg-[#071D49] p-4 text-white shadow-[0_24px_70px_rgba(7,29,73,0.28)] lg:flex lg:flex-col lg:w-72 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-white/8 p-4 shrink-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-100/70">MyShule</p>
            <h2 className="mt-2 text-xl font-black">Procurement Desk</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Orders & Suppliers.</p>
          </div>
          <nav className="mt-4 flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar" aria-label="Navigation">
            <button 
              onClick={() => setActiveView("overview")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "overview" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              Overview
            </button>
            <button 
              onClick={() => setActiveView("pos")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "pos" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <ShoppingCart className="h-4 w-4 shrink-0" />
              Purchase Orders
            </button>
            <button 
              onClick={() => setActiveView("suppliers")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "suppliers" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <Truck className="h-4 w-4 shrink-0" />
              Supplier Directory
            </button>
            <button 
              onClick={() => setActiveView("requisitions")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "requisitions" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <FileText className="h-4 w-4 shrink-0" />
              Requisitions
            </button>
            <button 
              onClick={() => setActiveView("budget")}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold transition ${activeView === "budget" ? "bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]" : "text-white/72 hover:bg-white/10 hover:text-white"}`}>
              <DollarSign className="h-4 w-4 shrink-0" />
              Budget Tracking
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
                    <h1 className="text-lg font-black text-[#071D49]">Procurement Dashboard</h1>
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
                        placeholder="Search POs or suppliers..."
                      />
                    </label>
                  </div>
                  <Button className="bg-[#071D49] hover:bg-[#071D49]/90 text-white rounded-xl" onClick={() => { setActiveView("pos"); setPurchaseOrderModalOpen(true); }}>New Purchase Order</Button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
              {notice ? <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{notice}</div> : null}
              {activeView === "overview" && <OverviewWorkspace />}
              {activeView === "pos" && <PurchaseOrdersWorkspace modalOpen={purchaseOrderModalOpen} onModalOpenChange={setPurchaseOrderModalOpen} />}
              {activeView === "suppliers" && <SupplierDirectoryWorkspace />}
              {activeView === "requisitions" && <RequisitionsWorkspace />}
              {activeView === "budget" && <BudgetTrackingWorkspace />}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
