"use client";

import { useState } from "react";
import { Users, UserPlus, Archive, CheckCircle, Search, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useStudents } from "@/hooks/useStudents";
import { useStudentDataService } from "@/hooks/useStudentDataService";
import type { StudentLifecycleStatus } from "@/types/shared";

const activeDirectoryStatuses = new Set<StudentLifecycleStatus>([
  "ACCEPTED",
  "ENROLLED",
  "ACTIVE",
  "SUSPENDED",
  "ON_LEAVE",
]);

function studentStatusClasses(status: StudentLifecycleStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "ENROLLED":
    case "ACCEPTED":
      return "bg-blue-100 text-blue-700";
    case "SUSPENDED":
    case "ON_LEAVE":
      return "bg-orange-100 text-orange-700";
    case "ARCHIVED":
    case "ALUMNI":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-rose-100 text-rose-700";
  }
}

function formatStudentStatus(status: StudentLifecycleStatus) {
  return status.replace(/_/g, " ").toLowerCase();
}

export function StudentsWorkspace() {
  const [activeTab, setActiveTab] = useState<"directory" | "enrollment" | "archived">("directory");
  const [isEnrolling, setIsEnrolling] = useState(false);
  
  const { data: studentsList, isLoading } = useStudents();
  const studentDataService = useStudentDataService();

  const [enrollFirstName, setEnrollFirstName] = useState("");
  const [enrollLastName, setEnrollLastName] = useState("");
  const [enrollGender, setEnrollGender] = useState<"MALE" | "FEMALE">("MALE");
  const [enrollDob, setEnrollDob] = useState("");

  const handleEnroll = async () => {
    if (!enrollFirstName || !enrollLastName) return;
    setIsEnrolling(true);
    try {
      // Create and admit student using the unified service (emits events)
      const student = await studentDataService.admitStudent({
        first_name: enrollFirstName,
        last_name: enrollLastName,
        gender: enrollGender,
        date_of_birth: enrollDob || undefined,
      });
      
      // Then enroll
      await studentDataService.enrollStudent(student.id);
      
      setEnrollFirstName("");
      setEnrollLastName("");
      setActiveTab("directory");
    } catch (e: any) {
      alert(e.message || "Failed to enroll student");
    } finally {
      setIsEnrolling(false);
    }
  };

  const activeStudents = studentsList?.filter((student) => activeDirectoryStatuses.has(student.status)) || [];
  const archivedStudents = studentsList?.filter((student) => !activeDirectoryStatuses.has(student.status)) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Students</h2>
          <p className="text-sm text-slate-500 mt-1">Manage student lifecycle, enrollment, and directories.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="pl-9 pr-4 py-2 w-64 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-shadow"
            />
          </div>
          <Button onClick={() => setActiveTab("enrollment")} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Enroll Student
          </Button>
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
          Active Directory
        </button>
        <button
          onClick={() => setActiveTab("enrollment")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "enrollment" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Enrollment
        </button>
        <button
          onClick={() => setActiveTab("archived")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "archived" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Archive className="w-4 h-4" />
          Archived
        </button>
      </div>

      {activeTab === "directory" && (
        <Card className="border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Admission No</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading directory...</td></tr>
                ) : activeStudents.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No active students found.</td></tr>
                ) : (
                  activeStudents.map((student: any) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{student.first_name} {student.last_name}</div>
                        <div className="text-xs text-slate-500">{student.email || 'No email'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{student.admission_number || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${studentStatusClasses(student.status)}`}>
                          {formatStudentStatus(student.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{student.gender?.toLowerCase()}</td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs">Manage</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === "enrollment" && (
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-6 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Enroll New Student
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">First Name</label>
                  <input 
                    type="text" 
                    value={enrollFirstName}
                    onChange={e => setEnrollFirstName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Last Name</label>
                  <input 
                    type="text" 
                    value={enrollLastName}
                    onChange={e => setEnrollLastName(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Gender</label>
                  <select 
                    value={enrollGender}
                    onChange={e => setEnrollGender(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700">Date of Birth</label>
                  <input 
                    type="date" 
                    value={enrollDob}
                    onChange={e => setEnrollDob(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleEnroll} 
                  disabled={isEnrolling || !enrollFirstName || !enrollLastName}
                >
                  {isEnrolling ? "Creating..." : "Create & Enroll Student"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "archived" && (
        <Card className="border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50/50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Admission No</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Gender</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Loading archived students...</td></tr>
                ) : archivedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      <Archive className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                      No archived or exited students found.
                    </td>
                  </tr>
                ) : (
                  archivedStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{student.first_name} {student.last_name}</div>
                        <div className="text-xs text-slate-500">{student.email || "No email"}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{student.admission_number || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${studentStatusClasses(student.status)}`}>
                          {formatStudentStatus(student.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize">{student.gender?.toLowerCase()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

