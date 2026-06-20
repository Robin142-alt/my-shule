"use client";

import { useState } from "react";
import { BookOpen, Layers, Calendar, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";

export function ClassesStreamsWorkspace() {
  const [activeTab, setActiveTab] = useState<"sections" | "years">("sections");

  const { data: yearsList, refetch: refetchYears } = useSchoolQuery<any[]>("/api/academics/academic-years", { enabled: activeTab === "years" });
  const { data: termsList, refetch: refetchTerms } = useSchoolQuery<any[]>("/api/academics/academic-terms", { enabled: activeTab === "years" });
  const { data: classSectionsList, refetch: refetchSections } = useSchoolQuery<any[]>("/api/academics/class-sections", { enabled: activeTab === "sections" });

  const createYearMutation = useSchoolMutation("/api/academics/years");
  const createTermMutation = useSchoolMutation("/api/academics/terms");
  const createSectionMutation = useSchoolMutation("/api/academics/class-sections");

  const [newYearName, setNewYearName] = useState("");
  const [newYearStart, setNewYearStart] = useState("");
  const [newYearEnd, setNewYearEnd] = useState("");

  const handleCreateYear = async () => {
    if (!newYearName || !newYearStart || !newYearEnd) return;
    await createYearMutation.mutateAsync({ name: newYearName, starts_on: newYearStart, ends_on: newYearEnd });
    setNewYearName(""); setNewYearStart(""); setNewYearEnd("");
    refetchYears();
  };

  const [newSecName, setNewSecName] = useState("");
  const [newSecGrade, setNewSecGrade] = useState("");
  const [newSecCapacity, setNewSecCapacity] = useState(30);

  const handleCreateSection = async () => {
    if (!newSecName || !newSecGrade) return;
    // Assuming academic_year_id is required. We'll grab the first year or empty for now if no years exist.
    // In a real app, there'd be a dropdown for the current academic year.
    const yearId = yearsList?.[0]?.id || "";
    await createSectionMutation.mutateAsync({ 
      academic_year_id: yearId, 
      name: newSecName, 
      grade_level: newSecGrade, 
      capacity: newSecCapacity 
    });
    setNewSecName(""); setNewSecGrade(""); setNewSecCapacity(30);
    refetchSections();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Classes & Streams</h2>
          <p className="text-sm text-slate-500 mt-1">Manage academic structure, years, terms, and classes.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab("sections")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "sections" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          Class Sections
        </button>
        <button
          onClick={() => setActiveTab("years")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "years" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Calendar className="w-4 h-4" />
          Academic Calendar
        </button>
      </div>

      {activeTab === "sections" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Class Section
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Form 1 East"
                    value={newSecName} onChange={e => setNewSecName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Grade Level</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Form 1"
                    value={newSecGrade} onChange={e => setNewSecGrade(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Capacity</label>
                  <input 
                    type="number" 
                    value={newSecCapacity} onChange={e => setNewSecCapacity(Number(e.target.value))}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <Button onClick={handleCreateSection} disabled={createSectionMutation.isPending || !newSecName || !newSecGrade} className="w-full">
                  Create Class
                </Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Grade</th>
                    <th className="px-4 py-3 font-medium">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classSectionsList?.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No classes defined yet.</td></tr>
                  ) : (
                    classSectionsList?.map((sec: any) => (
                      <tr key={sec.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{sec.name}</td>
                        <td className="px-4 py-3">{sec.grade_level}</td>
                        <td className="px-4 py-3 text-slate-500">{sec.capacity || 'Not set'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "years" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Academic Year
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Year Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. 2026-2027"
                    value={newYearName} onChange={e => setNewYearName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Starts On</label>
                    <input 
                      type="date" 
                      value={newYearStart} onChange={e => setNewYearStart(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Ends On</label>
                    <input 
                      type="date" 
                      value={newYearEnd} onChange={e => setNewYearEnd(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    />
                  </div>
                </div>
                <Button onClick={handleCreateYear} disabled={createYearMutation.isPending || !newYearName || !newYearStart || !newYearEnd} className="w-full">
                  Create Year
                </Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <Card className="border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Academic Year</th>
                    <th className="px-4 py-3 font-medium">Starts On</th>
                    <th className="px-4 py-3 font-medium">Ends On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {yearsList?.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No academic years defined yet.</td></tr>
                  ) : (
                    yearsList?.map((yr: any) => (
                      <tr key={yr.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{yr.name}</td>
                        <td className="px-4 py-3">{new Date(yr.starts_on).toLocaleDateString()}</td>
                        <td className="px-4 py-3">{new Date(yr.ends_on).toLocaleDateString()}</td>
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

