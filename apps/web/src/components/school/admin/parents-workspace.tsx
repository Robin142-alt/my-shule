"use client";

import { useState } from "react";
import { Users, UserPlus, Mail, Phone, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery, useSchoolMutation } from "@/hooks/use-school-api";

export function ParentsWorkspace() {
  const [activeTab, setActiveTab] = useState<"directory" | "add">("directory");

  const { data: guardiansList, isLoading, refetch: refetchGuardians } = useSchoolQuery<any[]>("/api/students/guardians/directory", { enabled: activeTab === "directory" });
  const { data: studentsList } = useSchoolQuery<any[]>("/api/students", { enabled: activeTab === "add" });
  
  const createGuardianMutation = useSchoolMutation("/api/students/guardians");

  const [studentId, setStudentId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [relationship, setRelationship] = useState("Father");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleCreateGuardian = async () => {
    if (!studentId || !displayName || !relationship) return;
    await createGuardianMutation.mutateAsync({
      student_profile_id: studentId,
      display_name: displayName,
      relationship,
      email,
      phone
    });
    setStudentId("");
    setDisplayName("");
    setEmail("");
    setPhone("");
    setActiveTab("directory");
    refetchGuardians();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Parents & Guardians</h2>
          <p className="text-sm text-slate-500 mt-1">Manage guardian profiles and their linked students.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "directory" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Guardians Directory
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "add" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Add Guardian
        </button>
      </div>

      {activeTab === "directory" && (
        <Card className="border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Guardian Name</th>
                  <th className="px-4 py-3 font-medium">Relationship</th>
                  <th className="px-4 py-3 font-medium">Linked Student</th>
                  <th className="px-4 py-3 font-medium">Contact Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading directory...</td></tr>
                ) : guardiansList?.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No guardians defined yet.</td></tr>
                ) : (
                  guardiansList?.map((g: any) => (
                    <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-900">{g.display_name}</td>
                      <td className="px-4 py-3 capitalize">{g.relationship}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <LinkIcon className="w-3 h-3 text-slate-400" />
                          {g.student_first_name} {g.student_last_name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {g.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Phone className="w-3 h-3" />
                              {g.phone}
                            </div>
                          )}
                          {g.email && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <Mail className="w-3 h-3" />
                              {g.email}
                            </div>
                          )}
                          {!g.phone && !g.email && <span className="text-xs text-slate-400">No contact info</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "add" && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Guardian Profile
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Link to Student</label>
                <select 
                  value={studentId}
                  onChange={e => setStudentId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="">Select Student...</option>
                  {studentsList?.filter(s => s.status !== 'archived').map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Guardian Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Relationship</label>
                  <select 
                    value={relationship}
                    onChange={e => setRelationship(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Grandparent">Grandparent</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Phone (Optional)</label>
                  <input 
                    type="text" 
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Email (Optional)</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleCreateGuardian} 
                  disabled={createGuardianMutation.isPending || !studentId || !displayName || !relationship}
                >
                  Create Guardian Profile
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
