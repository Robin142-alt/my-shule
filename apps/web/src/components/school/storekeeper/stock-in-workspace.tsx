"use client";

import { useState } from "react";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
function Panel({ title, description, children, actions }: { title: string; description?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm overflow-hidden mb-6">
      <div className="border-b bg-gray-50/50 p-4 flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold text-[#071D49]">{title}</h2>
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { toast } from "sonner";

export function ReceiveStockModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const itemName = formData.get("itemName") as string;
    const quantity = formData.get("quantity") as string;
    const unit = formData.get("unit") as string;
    const supplier = formData.get("supplier") as string;

    setSubmitting(true);
    try {
      await requestDashboardApi("/api/admin-command/inventory/receive", {
        method: "POST",
        body: JSON.stringify({
          itemName,
          quantity: Number(quantity),
          unit,
          supplier,
        }),
      });
      toast.success("Stock received successfully");
      onClose();
    } catch (error) {
      toast.error("Failed to receive stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Receive Stock" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Item Name</label>
          <input name="itemName" required type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. Printer Paper A4" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Quantity</label>
            <input name="quantity" required type="number" min="1" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-bold text-[#071D49] mb-1">Unit</label>
            <select name="unit" required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
              <option value="reams">Reams</option>
              <option value="pieces">Pieces</option>
              <option value="boxes">Boxes</option>
              <option value="kg">Kg</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Supplier / Source</label>
          <input name="supplier" required type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. TextBook Centre" />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Saving..." : "Receive Stock"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function StockInWorkspace() {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl">
      <Panel 
        title="Stock Reception"
        description="Receive incoming shipments and log items into inventory."
        actions={
          hasPermission('inventory:write') ? (
            <Button onClick={() => setIsModalOpen(true)}>Receive Stock</Button>
          ) : (
            <span className="text-xs font-bold text-[#64748B]">Restricted</span>
          )
        }
      >
        <div className="rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-sm text-center">
          <p className="text-[#64748B] text-sm">No recent stock deliveries recorded.</p>
        </div>
      </Panel>

      {isModalOpen && <ReceiveStockModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
