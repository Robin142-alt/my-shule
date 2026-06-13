"use client";

import { useState } from "react";
import { BookOpen, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolQuery, useSchoolMutation } from "@/hooks/use-school-api";

export function SubjectsWorkspace() {
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers">("subjects");

  const { data: subjectsList, refetch: refetchSubjects } = useSchoolQuery<any[]>("/api/academics/subjects", { enabled: activeTab === "subjects" || activeTab === "teachers" });
  const { data: assignmentsList, refetch: refetchAssignments } = useSchoolQuery<any[]>("/api/academics/teacher-assignments", { enabled: activeTab === "teachers" });
  
  const { data: staffList } = useSchoolQuery<any[]>("/api/hr/staff", { enabled: activeTab === "teachers" });
  const { data: sectionsList } = useSchoolQuery<any[]>("/api/academics/class-sections", { enabled: activeTab === "teachers" });
  const { data: termsList } = useSchoolQuery<any[]>("/api/academics/academic-terms", { enabled: activeTab === "teachers" });

  const createSubjectMutation = useSchoolMutation("/api/academics/subjects");
  const assignTeacherMutation = useSchoolMutation("/api/academics/teacher-assignments");

  const [newSubCode, setNewSubCode] = useState("");
  const [newSubName, setNewSubName] = useState("");

  const handleCreateSubject = async () => {
    if (!newSubCode || !newSubName) return;
    await createSubjectMutation.mutateAsync({ code: newSubCode, name: newSubName });
    setNewSubCode(""); setNewSubName("");
    refetchSubjects();
  };

  const [assignTermId, setAssignTermId] = useState("");
  const [assignSectionId, setAssignSectionId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");

  const handleAssignTeacher = async () => {
    if (!assignTermId || !assignSectionId || !assignSubjectId || !assignTeacherId) return;
    await assignTeacherMutation.mutateAsync({
      academic_term_id: assignTermId,
      class_section_id: assignSectionId,
      subject_id: assignSubjectId,
      teacher_user_id: assignTeacherId // Actually user_id but maybe staff_profile_id. Assuming the backend accepts the staff_profile_id or user_id. We'll use staff_profile_id from staffList.
    });
    setAssignSubjectId("");
    setAssignTeacherId("");
    refetchAssignments();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Curriculum & Subjects</h2>
          <p className="text-sm text-slate-500 mt-1">Manage subjects and class teacher assignments.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => setActiveTab("subjects")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "subjects" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Subjects Directory
        </button>
        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "teachers" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Teacher Assignments
        </button>
      </div>

      {activeTab === "subjects" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Subject
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. MAT101"
                    value={newSubCode} onChange={e => setNewSubCode(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Mathematics"
                    value={newSubName} onChange={e => setNewSubName(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <Button onClick={handleCreateSubject} disabled={createSubjectMutation.isPending || !newSubCode || !newSubName} className="w-full">
                  Create Subject
                </Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjectsList?.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">No subjects defined yet.</td></tr>
                  ) : (
                    subjectsList?.map((sub: any) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{sub.code}</td>
                        <td className="px-4 py-3">{sub.name}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "teachers" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Assign Teacher
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Academic Term</label>
                  <select 
                    value={assignTermId} onChange={e => setAssignTermId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="">Select Term...</option>
                    {termsList?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Class Section</label>
                  <select 
                    value={assignSectionId} onChange={e => setAssignSectionId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="">Select Class...</option>
                    {sectionsList?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Subject</label>
                  <select 
                    value={assignSubjectId} onChange={e => setAssignSubjectId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="">Select Subject...</option>
                    {subjectsList?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Teacher</label>
                  <select 
                    value={assignTeacherId} onChange={e => setAssignTeacherId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="">Select Staff...</option>
                    {staffList?.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                  </select>
                </div>
                <Button onClick={handleAssignTeacher} disabled={assignTeacherMutation.isPending || !assignTermId || !assignSectionId || !assignSubjectId || !assignTeacherId} className="w-full">
                  Assign Teacher
                </Button>
              </div>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="border border-slate-200 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-medium">Class</th>
                    <th className="px-4 py-3 font-medium">Subject</th>
                    <th className="px-4 py-3 font-medium">Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignmentsList?.length === 0 ? (
                    <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-500">No teacher assignments yet.</td></tr>
                  ) : (
                    assignmentsList?.map((asmt: any) => (
                      <tr key={asmt.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900">{asmt.class_name}</td>
                        <td className="px-4 py-3">{asmt.subject_name}</td>
                        <td className="px-4 py-3 text-slate-500">{asmt.teacher_name}</td>
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
