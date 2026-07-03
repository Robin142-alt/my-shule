"use client";

import { useState } from "react";
import { Settings, Building2, CheckCircle, Percent, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

interface NamedSetting {
  id: string;
  name: string;
  description?: string | null;
}

interface SchoolProfilePayload {
  address: string;
}

export function DataSetupWorkspace() {
  const [activeTab, setActiveTab] = useState<"school" | "grading" | "attendance">("school");
  const [profileAddress, setProfileAddress] = useState("123 Education Lane, Nairobi, Kenya");
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  const { data: gradingList, refetch: refetchGrading } = useSchoolQuery<NamedSetting[]>("/api/academics/grading-systems", { enabled: activeTab === "grading" });
  const { data: attendanceList, refetch: refetchAttendance } = useSchoolQuery<NamedSetting[]>("/api/academics/attendance-settings", { enabled: activeTab === "attendance" });

  const createGradingMutation = useSchoolMutation<unknown, { name: string; description: string }>("/api/academics/grading-systems");
  const createAttendanceMutation = useSchoolMutation<unknown, { name: string; description: string }>("/api/academics/attendance-settings");
  const saveProfileMutation = useSchoolMutation<unknown, SchoolProfilePayload>("/api/school/profile", "PATCH", {
    onSuccess: () => setProfileNotice("School profile saved for the current tenant."),
    onError: (error) => setProfileNotice(error.message || "School profile could not be saved."),
  });

  const [newGradingName, setNewGradingName] = useState("");
  const [newGradingDesc, setNewGradingDesc] = useState("");

  const handleCreateGrading = async () => {
    if (!newGradingName) return;
    await createGradingMutation.mutateAsync({ name: newGradingName, description: newGradingDesc });
    setNewGradingName(""); setNewGradingDesc("");
    refetchGrading();
  };

  const [newAttName, setNewAttName] = useState("");
  const [newAttDesc, setNewAttDesc] = useState("");

  const handleCreateAttendance = async () => {
    if (!newAttName) return;
    await createAttendanceMutation.mutateAsync({ name: newAttName, description: newAttDesc });
    setNewAttName(""); setNewAttDesc("");
    refetchAttendance();
  };

  const handleSaveProfile = () => {
    setProfileNotice(null);
    saveProfileMutation.mutate({ address: profileAddress });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Data Setup & Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Configure your core school defaults, grading profiles, and system behaviors.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab("school")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "school" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Building2 className="w-4 h-4" />
          School Profile
        </button>
        <button
          onClick={() => setActiveTab("grading")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "grading" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Percent className="w-4 h-4" />
          Grading Systems
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "attendance" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="w-4 h-4" />
          Attendance Rules
        </button>
      </div>

      {activeTab === "school" && (
        <Card className="max-w-3xl p-6 border border-slate-200">
          <h3 className="font-medium text-slate-900 mb-6 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-500" />
            Basic Configuration
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">School Name</label>
                <input 
                  type="text" defaultValue="MyShule Default Academy"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm shadow-sm"
                  readOnly
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Registration Number</label>
                <input 
                  type="text" defaultValue="MS-2026-X88"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-1 text-sm shadow-sm"
                  readOnly
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Address / Location</label>
              <textarea 
                value={profileAddress}
                onChange={(event) => setProfileAddress(event.target.value)}
                className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              />
            </div>
            {profileNotice ? <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm font-semibold text-blue-900">{profileNotice}</div> : null}
            <div className="pt-4">
              <Button onClick={handleSaveProfile} disabled={saveProfileMutation.isPending || !profileAddress.trim()}>
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "grading" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                New Grading Profile
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Standard 8-4-4"
                    value={newGradingName} onChange={e => setNewGradingName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <input 
                    type="text" 
                    value={newGradingDesc} onChange={e => setNewGradingDesc(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <Button onClick={handleCreateGrading} disabled={createGradingMutation.isPending || !newGradingName} className="w-full">
                  Create Profile
                </Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Profile Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gradingList?.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No grading profiles defined.</td></tr>
                  ) : (
                    gradingList?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-500">{item.description || '-'}</td>
                        <td className="px-4 py-3">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                New Rule
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Rule Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Late After 8:00 AM"
                    value={newAttName} onChange={e => setNewAttName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <input 
                    type="text" 
                    value={newAttDesc} onChange={e => setNewAttDesc(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <Button onClick={handleCreateAttendance} disabled={createAttendanceMutation.isPending || !newAttName} className="w-full">
                  Create Rule
                </Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Rule Name</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendanceList?.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No attendance rules defined.</td></tr>
                  ) : (
                    attendanceList?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-500">{item.description || '-'}</td>
                        <td className="px-4 py-3">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

