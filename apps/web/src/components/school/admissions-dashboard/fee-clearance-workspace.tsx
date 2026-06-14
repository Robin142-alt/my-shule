"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Banknote, CheckCircle } from "lucide-react";

type FeeRecord = {
  id: string;
  name: string;
  grade: string;
  feeRequired: number;
  feePaid: number;
  status: "Pending" | "Cleared";
};

export function AdmissionsFeeClearanceWorkspace({ dataset }: { dataset?: any }) {
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeeRecord | null>(null);

  const handleClearFee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRecord) return;
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    
    setRecords(records.map(r => {
      if (r.id === selectedRecord.id) {
        const newPaid = r.feePaid + amount;
        return {
          ...r,
          feePaid: newPaid,
          status: newPaid >= r.feeRequired ? "Cleared" : "Pending"
        };
      }
      return r;
    }));
    setIsModalOpen(false);
    setSelectedRecord(null);
  };

  const handleFetchPending = () => {
    setRecords([
      { id: "1", name: "Alex Kiptanui", grade: "Form 1", feeRequired: 15000, feePaid: 0, status: "Pending" },
      { id: "2", name: "Sarah Wanjiku", grade: "Form 2", feeRequired: 15000, feePaid: 5000, status: "Pending" }
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Fee Clearance</h2>
          <p className="text-white/60 text-sm">Financial tracking for initial admission payments</p>
        </div>
        {records.length === 0 && (
          <Button variant="outline" onClick={handleFetchPending}>Load Pending Clearances</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-white/10 bg-white/5 p-4 flex flex-col justify-center">
          <div className="text-sm font-semibold text-white/70">Total Pending</div>
          <div className="mt-2 text-2xl font-black text-white">{records.filter(r => r.status === "Pending").length}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-4 flex flex-col justify-center">
          <div className="text-sm font-semibold text-white/70">Cleared for Admission</div>
          <div className="mt-2 text-2xl font-black text-green-400">{records.filter(r => r.status === "Cleared").length}</div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-4 flex flex-col justify-center">
          <div className="text-sm font-semibold text-white/70">Total Collected</div>
          <div className="mt-2 text-2xl font-black text-white">
            KES {records.reduce((acc, r) => acc + r.feePaid, 0).toLocaleString()}
          </div>
        </Card>
      </div>

      <Card className="border border-white/10 bg-white/5 p-6">
        <Table
          columns={["Applicant Name", "Grade", "Required (KES)", "Paid (KES)", "Balance", "Status", "Action"]}
          data={records}
          renderRow={(r) => (
            <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="p-3 text-sm text-white font-medium">{r.name}</td>
              <td className="p-3 text-sm text-white/70">{r.grade}</td>
              <td className="p-3 text-sm text-white/70">{r.feeRequired.toLocaleString()}</td>
              <td className="p-3 text-sm text-white/70">{r.feePaid.toLocaleString()}</td>
              <td className="p-3 text-sm font-mono text-white">{(r.feeRequired - r.feePaid).toLocaleString()}</td>
              <td className="p-3 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  r.status === "Cleared" 
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                }`}>
                  {r.status}
                </span>
              </td>
              <td className="p-3 text-sm">
                {r.status !== "Cleared" ? (
                  <Button 
                    size="sm" 
                    onClick={() => { setSelectedRecord(r); setIsModalOpen(true); }}
                    className="h-8 gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-white/10"
                  >
                    <Banknote className="h-3 w-3" />
                    Log Payment
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-green-400 text-sm">
                    <CheckCircle className="h-4 w-4" /> Cleared
                  </span>
                )}
              </td>
            </tr>
          )}
          emptyState={
            <div className="py-12 text-center text-white/50">
              No fee records currently tracked.
            </div>
          }
        />
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Log Admission Payment">
        <form onSubmit={handleClearFee} className="space-y-4">
          <div className="p-3 bg-slate-100 rounded-md mb-4 text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Applicant:</span>
              <span className="font-semibold text-slate-900">{selectedRecord?.name}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-500">Total Required:</span>
              <span className="font-semibold text-slate-900">KES {selectedRecord?.feeRequired.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Current Balance:</span>
              <span className="font-bold text-rose-600">KES {((selectedRecord?.feeRequired || 0) - (selectedRecord?.feePaid || 0)).toLocaleString()}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Amount (KES)</label>
            <input type="number" name="amount" min="1" max={(selectedRecord?.feeRequired || 0) - (selectedRecord?.feePaid || 0)} required className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 5000" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <select name="method" required className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="mpesa">M-PESA Paybill</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash Receipt</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Confirm Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
