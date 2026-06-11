"use client";

import { useState } from "react";
import { Search, ShoppingCart, FileText, Truck, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ProcurementOfficerCommandCenter({ routeMode }: { routeMode?: "hosted" | "public" }) {
  const [searchTerm, setSearchTerm] = useState("");

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
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold bg-white/14 text-white shadow-[inset_4px_0_0_#38BDF8]">
              <ShoppingCart className="h-4 w-4 shrink-0" />
              Purchase Orders
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <Truck className="h-4 w-4 shrink-0" />
              Supplier Directory
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
              <FileText className="h-4 w-4 shrink-0" />
              Requisitions
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-bold text-white/72 transition hover:bg-white/10 hover:text-white">
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
              <div className="grid gap-6 md:grid-cols-3 mb-8">
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Pending Requisitions</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">8</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Active Purchase Orders</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">12</div>
                </Card>
                <Card className="p-6">
                  <div className="text-sm font-semibold text-gray-500">Awaiting Delivery</div>
                  <div className="mt-2 text-3xl font-black text-[#071D49]">5</div>
                </Card>
              </div>

              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#071D49] mb-4">Recent Procurement Activity</h2>
                <div className="text-center py-12 text-gray-500">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Purchase orders and requisitions from storekeeper will appear here.</p>
                </div>
              </Card>
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}
