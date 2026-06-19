"use client";
import { useState } from "react";
import { Users, UserCheck, UserX, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { Panel, StatusChip, Tone } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type StudentRecord = {
  id: string;
  admission_no: string;
  full_name: string;
  gender: string;
  stream: string;
  status: string;
  attendance_rate: number;
  mean_score: number | null;
};

type MyClassData = {
  metrics: {
    total_enrolled: number;
    boys: number;
    girls: number;
    active: number;
    suspended: number;
  };
  class_name: string;
  students: StudentRecord[];
};

export function MyClassWorkspace() {
  const { data, isLoading } = useSchoolQuery<MyClassData>('/admin-command/class-teacher/my-class');
  const [search, setSearch] = useState("");

  const students = (data?.students || []).filter(
    (s) => !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.admission_no.toLowerCase().includes(search.toLowerCase())
  );
  const metrics = data?.metrics;

  const getStatusTone = (st: string): Tone => {
    if (st === "Active") return "success";
    if (st === "Suspended") return "danger";
    if (st === "Transferred") return "warning";
    return "neutral";
  };

  const getAttendanceTone = (rate: number): Tone => {
    if (rate >= 90) return "success";
    if (rate >= 75) return "warning";
    return "danger";
  };

  return (
    <Panel
      title={data?.class_name ? `My Class — ${data.class_name}` : "My Class"}
      description="Full class register with student details, attendance rates, and academic standing."
      icon={GraduationCap}
    >
      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-5 mb-6">
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-4">
          <div className="text-sm font-semibold text-[#64748B]">Total Enrolled</div>
          <div className="mt-1 text-2xl font-black text-[#071D49]">{isLoading ? "..." : metrics?.total_enrolled ?? 0}</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-sm font-semibold text-blue-700">Boys</div>
          <div className="mt-1 text-2xl font-black text-blue-700">{isLoading ? "..." : metrics?.boys ?? 0}</div>
        </div>
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-4">
          <div className="text-sm font-semibold text-pink-700">Girls</div>
          <div className="mt-1 text-2xl font-black text-pink-700">{isLoading ? "..." : metrics?.girls ?? 0}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-700">Active</div>
          <div className="mt-1 text-2xl font-black text-emerald-700">{isLoading ? "..." : metrics?.active ?? 0}</div>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Suspended</div>
          <div className="mt-1 text-2xl font-black text-rose-700">{isLoading ? "..." : metrics?.suspended ?? 0}</div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or admission number..."
          className="w-full max-w-md rounded-lg border border-[#D8E0EC] px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Student Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-[#F8FAFC] text-[#071D49]">
            <tr>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Adm No</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Full Name</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Gender</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Stream</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Attendance</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Mean Score</th>
              <th className="px-4 py-3 font-bold border-b border-[#D8E0EC]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">Loading class register...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">{search ? "No students match your search." : "No students assigned to your class yet. Contact the secretary to assign students."}</td></tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3 font-medium text-[#071D49]">{s.admission_no}</td>
                  <td className="px-4 py-3 font-semibold text-[#071D49]">{s.full_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.gender}</td>
                  <td className="px-4 py-3 text-[#64748B]">{s.stream || "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={`${s.attendance_rate}%`} tone={getAttendanceTone(s.attendance_rate)} /></td>
                  <td className="px-4 py-3 text-[#64748B]">{s.mean_score !== null ? s.mean_score : "—"}</td>
                  <td className="px-4 py-3"><StatusChip label={s.status} tone={getStatusTone(s.status)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
