"use client";

import { useState } from "react";
earch, ShoppingCart, FileText, Truck, DollarSign, LayoutDashboard, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { buildSchoolSectionHref } from "./school-pages";

type ProcurementView = "overview" | "pos" | "suppliers" | "requisitions" | "budget";

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

function PurchaseOrdersWorkspace() {
  const { data: posData, isLoading } = useSchoolQuery<any>("/api/inventory/purchase-orders");
  const pos = posData?.data ?? [];

  return (
    <Panel title="Purchase Orders" description="Create and track purchase orders with suppliers." icon={ShoppingCart} actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white"><Plus className="w-4 h-4 mr-2" /> New PO</Button>}>
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
                    <button className="text-[#1D4ED8] hover:underline text-xs font-bold">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function SupplierDirectoryWorkspace() {
  const { data: suppliersData, isLoading } = useSchoolQuery<any>("/api/inventory/suppliers");
  const suppliers = suppliersData?.data ?? [];

  return (
    <Panel title="Supplier Directory" description="Manage school vendors and suppliers." icon={Truck} actions={<Button className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-bold text-white"><Plus className="w-4 h-4 mr-2" /> Add Supplier</Button>}>
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
                    <button className="text-[#1D4ED8] hover:underline text-xs font-bold">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function RequisitionsWorkspace() {
  const { data: requestsData, isLoading } = useSchoolQuery<any>("/api/inventory/requests");
  const requests = requestsData?.data ?? [];

  return (
    <Panel title="Requisitions" description="Review and approve departmental requests." icon={FileText}>
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
                    <button className="text-[#1D4ED8] hover:underline text-xs font-bold">Review</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function BudgetTrackingWorkspace() {
  return (
    <Panel title="Budget Tracking" description="Monitor procurement spend against departmental budgets." icon={DollarSign}>
      <div className="rounded-lg border border-dashed border-[#D8E0EC] p-8 text-center text-slate-500">
        Budget tracking and financial integration will be available shortly.
      </div>
    </Panel>
  );
}

export function ProcurementOfficerCommandCenter({ routeMode, activeSection }: { routeMode?: "hosted" | "public"; activeSection?: string }) {
  const [searchTerm, setSearchTerm] = useState("");
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
                  <Button className="bg-[#071D49] hover:bg-[#071D49]/90 text-white rounded-xl">New Purchase Order</Button>
                </div>
              </div>
            </header>

            <div className="p-4 sm:p-6 lg:p-8">
              {activeView === "overview" && <OverviewWorkspace />}
              {activeView === "pos" && <PurchaseOrdersWorkspace />}
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
