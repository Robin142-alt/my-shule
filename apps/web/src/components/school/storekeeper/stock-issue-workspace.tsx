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

export function IssueItemModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onClose();
    }, 1000);
  };

  return (
    <Modal title="Issue Item" open={true} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Item Name</label>
          <select required className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]">
            <option value="">Select item...</option>
            <option value="chalk">White Chalk (Boxes)</option>
            <option value="paper">A4 Paper (Reams)</option>
            <option value="sugar">Sugar (Kg)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Quantity to Issue</label>
          <input required type="number" min="1" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-bold text-[#071D49] mb-1">Issued To / Department</label>
          <input required type="text" className="w-full rounded-xl border border-[#D8E0EC] p-3 text-sm outline-none focus:border-[#071D49]" placeholder="e.g. Science Department" />
        </div>
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-[#D8E0EC]">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-bold text-[#64748B]">Cancel</button>
          <button disabled={submitting} type="submit" className="rounded-xl bg-[#071D49] px-6 py-2 text-sm font-black text-white">
            {submitting ? "Processing..." : "Issue Item"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function StockIssueWorkspace() {
  const { hasPermission } = usePermissions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6 max-w-5xl">
      <Panel 
        title="Issue Stock"
        description="Fulfill requisitions and track outgoing materials."
        actions={
          hasPermission('inventory:write') ? (
            <Button onClick={() => setIsModalOpen(true)}>Issue Item</Button>
          ) : (
            <span className="text-xs font-bold text-[#64748B]">Restricted</span>
          )
        }
      >
        <div className="rounded-2xl border border-[#D8E0EC] bg-white p-6 shadow-sm text-center">
          <p className="text-[#64748B] text-sm">No recent items issued.</p>
        </div>
      </Panel>

      {isModalOpen && <IssueItemModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
}
