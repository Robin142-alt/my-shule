"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { Modal } from "@/components/ui/modal";
import { Plus, FileText, Search } from "lucide-react";

type Applicant = {
  id: string;
  name: string;
  dob: string;
  prevSchool: string;
  parentContact: string;
  status: string;
};

export function AdmissionsApplicantProfilesWorkspace({ dataset }: { dataset?: any }) {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newApp: Applicant = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get("name") as string,
      dob: formData.get("dob") as string,
      prevSchool: formData.get("prevSchool") as string,
      parentContact: formData.get("parentContact") as string,
      status: "Profile Created",
    };
    setApplicants([newApp, ...applicants]);
    setIsModalOpen(false);
  };

  const filtered = applicants.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Applicant Profiles</h2>
          <p className="text-white/60 text-sm">Detailed drill-down grid for applicant records</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Applicant
        </Button>
      </div>

      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-2 mb-6 bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 w-full max-w-sm">
          <Search className="h-4 w-4 text-white/50" />
          <input 
            type="text" 
            placeholder="Search applicants..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-white text-sm focus:outline-none w-full placeholder:text-white/30" 
          />
        </div>

        <Table
          columns={["Name", "Date of Birth", "Previous School", "Parent Contact", "Status", "Actions"]}
          data={filtered}
          renderRow={(app) => (
            <tr key={app.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
              <td className="p-3 text-sm text-white font-medium">{app.name}</td>
              <td className="p-3 text-sm text-white/70">{app.dob}</td>
              <td className="p-3 text-sm text-white/70">{app.prevSchool}</td>
              <td className="p-3 text-sm text-white/70">{app.parentContact}</td>
              <td className="p-3 text-sm text-white/70">
                <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full text-xs font-medium border border-blue-500/20">
                  {app.status}
                </span>
              </td>
              <td className="p-3 text-sm">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/50 hover:text-white">
                  <FileText className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          )}
          emptyState={
            <div className="py-12 text-center text-white/50">
              No applicant profiles found. Click "Add Applicant" to create one.
            </div>
          }
        />
      </Card>

      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Applicant">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <input name="name" required className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Birth</label>
            <input type="date" name="dob" required className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Previous School</label>
            <input name="prevSchool" required className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Parent Contact</label>
            <input name="parentContact" required placeholder="Phone number" className="w-full rounded-md border border-slate-200 p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Profile</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
