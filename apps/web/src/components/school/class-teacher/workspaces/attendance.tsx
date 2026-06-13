import { useState, useEffect } from "react";
import { ClipboardCheck } from "lucide-react";
import { Panel } from "../shared";
import { useClassTeacherAttendance, useSaveAttendance } from "@/lib/data/class-teacher-hooks";

export function AttendanceWorkspace() {
  const streamId = "stream_123";
  const { data, isLoading, error } = useClassTeacherAttendance(streamId);
  const saveMutation = useSaveAttendance();
  const [localData, setLocalData] = useState<any[]>([]);

  useEffect(() => {
    if (data) setLocalData(Array.isArray(data) ? data : (data as any).records || []);
  }, [data]);

  if (isLoading) {
    return (
      <Panel title="Attendance" description="Daily class roll call. This is one of the most important Class Teacher tasks." icon={ClipboardCheck}>
        <div className="flex justify-center p-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4ED8] border-t-transparent"></div></div>
      </Panel>
    );
  }

  if (error || !data) {
    return (
      <Panel title="Attendance" description="Daily class roll call. This is one of the most important Class Teacher tasks." icon={ClipboardCheck}>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 font-bold">Failed to load attendance.</div>
      </Panel>
    );
  }

  const handleStatusChange = (id: string, newStatus: string) => {
    setLocalData(prev => prev.map(item => item.id === id ? { ...item, attendance: newStatus } : item));
  };

  const handleReasonChange = (id: string, newReason: string) => {
    setLocalData(prev => prev.map(item => item.id === id ? { ...item, reason: newReason } : item));
  };

  const handleMarkAllPresent = () => {
    setLocalData(prev => prev.map(item => ({ ...item, attendance: "present", reason: "" })));
  };

  const handleSubmit = () => {
    saveMutation.mutate({ streamId, records: localData });
  };

  return (
    <Panel title="Attendance" description="Daily class roll call. This is one of the most important Class Teacher tasks." icon={ClipboardCheck}>
      <div className="mb-4 flex gap-2">
        <button onClick={handleMarkAllPresent} className="rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white">Mark All Present</button>
        <button onClick={handleSubmit} disabled={saveMutation.isPending} className="rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
          {saveMutation.isPending ? "Submitting..." : "Submit Final"}
        </button>
      </div>
      {saveMutation.isSuccess && (
        <div className={`mb-4 rounded border p-2 text-sm font-bold ${
          (saveMutation.data as any)?._offline 
            ? "border-yellow-200 bg-yellow-50 text-yellow-700" 
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
        }`}>
          {(saveMutation.data as any)?._offline 
            ? "Attendance saved offline! It will sync automatically when connection returns." 
            : "Attendance saved successfully!"}
        </div>
      )}
      <div className="overflow-hidden rounded-xl border border-[#D8E0EC]">
        <table className="w-full text-left text-sm text-[#071D49]">
          <thead className="bg-[#F8FAFC]">
            <tr>
              <th className="p-3 font-semibold">Adm No.</th>
              <th className="p-3 font-semibold">Name</th>
              <th className="p-3 font-semibold">Attendance</th>
              <th className="p-3 font-semibold">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D8E0EC]">
            {localData.map((record) => (
              <tr key={record.id}>
                <td className="p-3">{record.admissionNo}</td>
                <td className="p-3 font-bold">{record.name}</td>
                <td className="p-3">
                  <select 
                    value={record.attendance} 
                    onChange={(e) => handleStatusChange(record.id, e.target.value)}
                    className="rounded border border-[#D8E0EC] p-1 text-sm bg-white"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </td>
                <td className="p-3">
                  <input 
                    type="text" 
                    value={record.reason}
                    onChange={(e) => handleReasonChange(record.id, e.target.value)}
                    className="w-full rounded border border-[#D8E0EC] p-1 text-sm" 
                    placeholder="e.g. sick" 
                    disabled={record.attendance === "present"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
