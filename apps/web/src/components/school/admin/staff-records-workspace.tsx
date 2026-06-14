"use client";

import { useState } from "react";
import { UserPlus, CheckCircle, RotateCcw, CalendarDays, Users, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { useSchoolQuery, useSchoolMutation } from "@/lib/data/school-hooks";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

export function StaffRecordsWorkspace() {
  const [activeTab, setActiveTab] = useState<"directory" | "attendance" | "leave" | "structure" | "payroll" | "performance">("directory");
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payslipMonth, setPayslipMonth] = useState(new Date().getMonth() + 1);
  const [payslipYear, setPayslipYear] = useState(new Date().getFullYear());

  const { data: staffList, isLoading, refetch } = useSchoolQuery<any[]>("/api/hr/staff", { enabled: activeTab === "directory" || activeTab === "leave" || activeTab === "payroll" || activeTab === "performance" });
  const { data: departmentList, refetch: refetchDepts } = useSchoolQuery<any[]>("/api/hr/departments");
  const { data: jobTitleList, refetch: refetchJobs } = useSchoolQuery<any[]>("/api/hr/job-titles");
  const { data: attendanceList, isLoading: attLoading, refetch: refetchAtt } = useSchoolQuery<any[]>(`/api/hr/attendance?date=${attendanceDate}`, { enabled: activeTab === "attendance" });
  const { data: leaveList, isLoading: leaveLoading, refetch: refetchLeave } = useSchoolQuery<any[]>("/api/hr/leave", { enabled: activeTab === "leave" });
  const { data: bandList, refetch: refetchBands } = useSchoolQuery<any[]>("/api/hr/payroll/bands", { enabled: activeTab === "payroll" || activeTab === "directory" });
  const { data: payslipList, refetch: refetchPayslips } = useSchoolQuery<any[]>(`/api/hr/payroll/payslips?month=${payslipMonth}&year=${payslipYear}`, { enabled: activeTab === "payroll" });
  const { data: reviewsList, refetch: refetchReviews } = useSchoolQuery<any[]>("/api/hr/performance/reviews", { enabled: activeTab === "performance" });
  const { data: disciplinaryList, refetch: refetchDisciplinary } = useSchoolQuery<any[]>("/api/hr/performance/disciplinary", { enabled: activeTab === "performance" });
  
  const inviteMutation = useSchoolMutation("/api/hr/staff/invite");
  const approveMutation = useSchoolMutation("/api/hr/staff/approve");
  const reactivateMutation = useSchoolMutation("/api/hr/staff/reactivate");
  const acceptInviteMutation = useSchoolMutation("/api/hr/staff/accept-invite");
  const completeProfileMutation = useSchoolMutation("/api/hr/staff/complete-profile");
  const markAttendanceMutation = useSchoolMutation("/api/hr/attendance");
  const requestLeaveMutation = useSchoolMutation("/api/hr/leave/request");
  const updateLeaveStatusMutation = useSchoolMutation((vars: { id: string; status: string; reason?: string }) => `/api/hr/leave/${vars.id}/status`);
  const createDeptMutation = useSchoolMutation("/api/hr/departments");
  const createJobTitleMutation = useSchoolMutation("/api/hr/job-titles");
  const assignRoleMutation = useSchoolMutation("/api/hr/staff/role", "PATCH");
  const createBandMutation = useSchoolMutation("/api/hr/payroll/bands");
  const setSalaryMutation = useSchoolMutation("/api/hr/staff/salary", "PATCH");
  const generatePayslipMutation = useSchoolMutation("/api/hr/payroll/payslips");
  const createReviewMutation = useSchoolMutation("/api/hr/performance/reviews");
  const createDisciplinaryMutation = useSchoolMutation("/api/hr/performance/disciplinary");

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  
  const handleInvite = async () => {
    if (!inviteEmail || !inviteName) return;
    await inviteMutation.mutateAsync({ email: inviteEmail, display_name: inviteName });
    setInviteEmail("");
    setInviteName("");
    refetch();
  };

  const handleApprove = async (id: string) => {
    const num = prompt("Enter new Staff Number", `STF-${Date.now().toString().slice(-4)}`);
    if (!num) return;
    await approveMutation.mutateAsync({
      staff_profile_id: id,
      staff_number: num,
      contract: { role_title: "Teacher", starts_on: new Date().toISOString() }
    });
    refetch();
  };

  const handleReactivate = async (id: string) => {
    await reactivateMutation.mutateAsync({ staff_profile_id: id, reason: "Returned to duty" });
    refetch();
  };

  const handleMarkAttendance = async (id: string, status: string) => {
    await markAttendanceMutation.mutateAsync({ staff_profile_id: id, date: attendanceDate, status });
    refetchAtt();
  };

  const [leaveStaffId, setLeaveStaffId] = useState("");
  const [leaveType, setLeaveType] = useState("annual");
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState("");

  const handleRequestLeave = async () => {
    if (!leaveStaffId || leaveDays < 1) return;
    await requestLeaveMutation.mutateAsync({
      staff_profile_id: leaveStaffId,
      leave_type: leaveType,
      requested_days: leaveDays,
      reason: leaveReason
    });
    setLeaveStaffId("");
    setLeaveReason("");
    setLeaveDays(1);
    refetchLeave();
  };

  const handleUpdateLeaveStatus = async (id: string, status: "approved" | "rejected", isOverride = false) => {
    let reason = "";
    if (isOverride) {
      const p = prompt("Enter override reason for approval beyond balance (or leave rejection reason):");
      if (!p) return;
      reason = p;
    }
    try {
      await updateLeaveStatusMutation.mutateAsync({ id, status, reason });
    } catch (e: any) {
      if (e.message?.includes("override")) {
        handleUpdateLeaveStatus(id, status, true);
        return;
      }
      alert(e.message || "An error occurred");
    }
    refetchLeave();
  };

  const [newDeptName, setNewDeptName] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDeptId, setNewJobDeptId] = useState("");

  const handleCreateDept = async () => {
    if (!newDeptName) return;
    await createDeptMutation.mutateAsync({ name: newDeptName });
    setNewDeptName("");
    refetchDepts();
  };

  const handleCreateJob = async () => {
    if (!newJobTitle) return;
    await createJobTitleMutation.mutateAsync({ title: newJobTitle, department_id: newJobDeptId || undefined });
    setNewJobTitle("");
    refetchJobs();
  };

  const [assignRoleStaffId, setAssignRoleStaffId] = useState("");
  const [assignDeptId, setAssignDeptId] = useState("");
  const [assignJobId, setAssignJobId] = useState("");

  const handleAssignRole = async () => {
    if (!assignRoleStaffId) return;
    await assignRoleMutation.mutateAsync({ staff_profile_id: assignRoleStaffId, department_id: assignDeptId || undefined, job_title_id: assignJobId || undefined });
    setAssignRoleStaffId("");
    refetch();
  };

  const [newBandName, setNewBandName] = useState("");
  const [newBandSalary, setNewBandSalary] = useState<number | "">("");

  const handleCreateBand = async () => {
    if (!newBandName || !newBandSalary) return;
    await createBandMutation.mutateAsync({ name: newBandName, base_salary: Number(newBandSalary) });
    setNewBandName("");
    setNewBandSalary("");
    refetchBands();
  };

  const [assignSalaryStaffId, setAssignSalaryStaffId] = useState("");
  const [assignBandId, setAssignBandId] = useState("");
  const [assignCustomSalary, setAssignCustomSalary] = useState<number | "">("");

  const handleAssignSalary = async () => {
    if (!assignSalaryStaffId) return;
    await setSalaryMutation.mutateAsync({ staff_profile_id: assignSalaryStaffId, payroll_band_id: assignBandId || undefined, custom_base_salary: assignCustomSalary ? Number(assignCustomSalary) : undefined });
    setAssignSalaryStaffId("");
    refetch();
  };

  const [generatePayslipStaffId, setGeneratePayslipStaffId] = useState("");
  const [generateDeductions, setGenerateDeductions] = useState<number>(0);
  const [generateBonuses, setGenerateBonuses] = useState<number>(0);

  const handleGeneratePayslip = async () => {
    if (!generatePayslipStaffId) return;
    try {
      await generatePayslipMutation.mutateAsync({
        staff_profile_id: generatePayslipStaffId,
        month: payslipMonth,
        year: payslipYear,
        deductions: generateDeductions,
        bonuses: generateBonuses
      });
      setGeneratePayslipStaffId("");
      refetchPayslips();
    } catch (e: any) {
      alert(e.message || "Failed to generate payslip");
    }
  };

  const [reviewStaffId, setReviewStaffId] = useState("");
  const [reviewDate, setReviewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [reviewScore, setReviewScore] = useState<number>(3);
  const [reviewComments, setReviewComments] = useState("");
  const [reviewGoals, setReviewGoals] = useState("");

  const handleCreateReview = async () => {
    if (!reviewStaffId || !reviewComments) return;
    await createReviewMutation.mutateAsync({ staff_profile_id: reviewStaffId, review_date: reviewDate, score: reviewScore, comments: reviewComments, goals_for_next_period: reviewGoals });
    setReviewStaffId("");
    setReviewComments("");
    setReviewGoals("");
    refetchReviews();
  };

  const [discStaffId, setDiscStaffId] = useState("");
  const [discDate, setDiscDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [discSeverity, setDiscSeverity] = useState<"low" | "medium" | "high" | "critical">("low");
  const [discDescription, setDiscDescription] = useState("");
  const [discAction, setDiscAction] = useState("");

  const handleCreateDisciplinary = async () => {
    if (!discStaffId || !discDescription) return;
    await createDisciplinaryMutation.mutateAsync({ staff_profile_id: discStaffId, incident_date: discDate, severity: discSeverity, description: discDescription, action_taken: discAction });
    setDiscStaffId("");
    setDiscDescription("");
    setDiscAction("");
    refetchDisciplinary();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Staff Lifecycle Management</h2>
          <p className="text-sm text-slate-500">Invite, approve, and manage the complete lifecycle of school staff.</p>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("directory")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "directory" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Staff Directory
        </button>
        <button
          onClick={() => setActiveTab("attendance")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "attendance" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          Daily Attendance
        </button>
        <button
          onClick={() => setActiveTab("leave")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "leave" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Leave Management
        </button>
        <button
          onClick={() => setActiveTab("structure")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "structure" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Structure & Roles
        </button>
        <button
          onClick={() => setActiveTab("payroll")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "payroll" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" />
          Payroll & Comp
        </button>
        <button
          onClick={() => setActiveTab("performance")}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "performance" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Performance & HR
        </button>
      </div>

      {activeTab === "directory" && (
        <div className="space-y-6">
          <Card className="p-4 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Invite New Staff
            </h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Display Name</label>
                <input 
                  value={inviteName} 
                  onChange={e => setInviteName(e.target.value)} 
                  placeholder="Jane Doe" 
                  className="flex h-9 w-64 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Email Address</label>
                <input 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)} 
                  placeholder="jane@myshule.app" 
                  className="flex h-9 w-64 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50" 
                />
              </div>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending || !inviteEmail}>
                {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
              </Button>
            </div>
          </Card>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">Staff Name</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Staff Number</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Department / Role</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading staff...</td></tr>
                ) : staffList?.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">No staff found.</td></tr>
                ) : (
                  staffList?.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{staff.display_name}</td>
                      <td className="px-4 py-3 text-slate-500">{staff.staff_number || "—"}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {staff.department_name ? `${staff.department_name} / ${staff.job_title || 'No Role'}` : 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill 
                           tone={staff.status === "active" ? "ok" : staff.status === "invited" ? "warning" : staff.status === "pending_approval" ? "warning" : "critical"} 
                           label={staff.status.replace("_", " ")} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">

                          {staff.status === "pending_approval" && (
                             <Button variant="default" size="sm" onClick={() => handleApprove(staff.id)}>
                               <CheckCircle className="w-4 h-4 mr-1" /> Approve
                             </Button>
                          )}
                          {(staff.status === "suspended" || staff.status === "archived") && (
                             <Button variant="outline" size="sm" onClick={() => handleReactivate(staff.id)}>
                               <RotateCcw className="w-4 h-4 mr-1" /> Reactivate
                             </Button>
                          )}
                          <Button variant="outline" size="sm" onClick={() => setAssignRoleStaffId(staff.id)}>
                            Assign Role
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setAssignSalaryStaffId(staff.id)}>
                            Set Salary
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Modal open={!!assignRoleStaffId} onClose={() => setAssignRoleStaffId("")} title="Assign Department & Role" footer={
            <>
              <Button variant="outline" onClick={() => setAssignRoleStaffId("")}>Cancel</Button>
              <Button onClick={handleAssignRole} disabled={assignRoleMutation.isPending}>Save</Button>
            </>
          }>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <select 
                  value={assignDeptId} 
                  onChange={e => setAssignDeptId(e.target.value)} 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="">None</option>
                  {departmentList?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Title</label>
                <select 
                  value={assignJobId} 
                  onChange={e => setAssignJobId(e.target.value)} 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="">None</option>
                  {jobTitleList?.filter(j => !assignDeptId || j.department_id === assignDeptId).map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </Modal>

          <Modal open={!!assignSalaryStaffId} onClose={() => setAssignSalaryStaffId("")} title="Set Salary Configuration" footer={
            <>
              <Button variant="outline" onClick={() => setAssignSalaryStaffId("")}>Cancel</Button>
              <Button onClick={handleAssignSalary} disabled={setSalaryMutation.isPending}>Save</Button>
            </>
          }>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payroll Band</label>
                <select 
                  value={assignBandId} 
                  onChange={e => setAssignBandId(e.target.value)} 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="">None / Custom</option>
                  {bandList?.map(b => <option key={b.id} value={b.id}>{b.name} ({b.base_salary} {b.currency})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Base Salary (Overrides Band)</label>
                <input 
                  type="number"
                  value={assignCustomSalary} 
                  onChange={e => setAssignCustomSalary(e.target.value ? Number(e.target.value) : "")} 
                  placeholder="e.g. 50000"
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                />
              </div>
            </div>
          </Modal>
        </div>
      )}

      {activeTab === "attendance" && (
        <div className="space-y-6">
          <Card className="p-4 border border-slate-200">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700">Select Date:</label>
              <input 
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="flex h-9 w-48 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
              />
            </div>
          </Card>
          
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">Staff Name</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Staff Number</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Current Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Mark Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attLoading ? (
                  <tr><td colSpan={4} className="p-4 text-center text-slate-500">Loading attendance...</td></tr>
                ) : attendanceList?.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-slate-500">No active staff found for attendance.</td></tr>
                ) : (
                  attendanceList?.map((staff) => (
                    <tr key={staff.staff_profile_id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{staff.display_name}</td>
                      <td className="px-4 py-3 text-slate-500">{staff.staff_number || "—"}</td>
                      <td className="px-4 py-3">
                        {staff.attendance_status ? (
                          <StatusPill 
                            tone={staff.attendance_status === "present" ? "ok" : staff.attendance_status === "absent" ? "critical" : "warning"} 
                            label={staff.attendance_status.replace("_", " ")} 
                          />
                        ) : (
                          <span className="text-slate-400 italic">Not marked</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap max-w-sm">
                          {['present', 'absent', 'late', 'on_leave', 'field_duty'].map((status) => (
                            <button
                              key={status}
                              onClick={() => handleMarkAttendance(staff.staff_profile_id, status)}
                              className={`px-2 py-1 text-xs rounded-md border ${
                                staff.attendance_status === status
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {status.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "leave" && (
        <div className="space-y-6">
          <Card className="p-4 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Log Leave Request
            </h3>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Staff Member</label>
                <select 
                  value={leaveStaffId} 
                  onChange={e => setLeaveStaffId(e.target.value)} 
                  className="flex h-9 w-48 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="" disabled>Select Staff</option>
                  {staffList?.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Leave Type</label>
                <select 
                  value={leaveType} 
                  onChange={e => setLeaveType(e.target.value)} 
                  className="flex h-9 w-32 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="annual">Annual</option>
                  <option value="sick">Sick</option>
                  <option value="maternity">Maternity</option>
                  <option value="paternity">Paternity</option>
                  <option value="compassionate">Compassionate</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Days</label>
                <input 
                  type="number"
                  min="1"
                  value={leaveDays} 
                  onChange={e => setLeaveDays(Number(e.target.value))} 
                  className="flex h-9 w-24 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                />
              </div>
              <div className="space-y-1 flex-1 min-w-[200px]">
                <label className="text-xs font-medium text-slate-700">Reason / Notes</label>
                <input 
                  value={leaveReason} 
                  onChange={e => setLeaveReason(e.target.value)} 
                  placeholder="Optional details"
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                />
              </div>
              <Button onClick={handleRequestLeave} disabled={requestLeaveMutation.isPending || !leaveStaffId || leaveDays < 1}>
                {requestLeaveMutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </Card>

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-500">Staff Name</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Type & Days</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Reason / Override</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveLoading ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">Loading leave requests...</td></tr>
                ) : leaveList?.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-slate-500">No leave requests found.</td></tr>
                ) : (
                  leaveList?.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900">{req.display_name}</td>
                      <td className="px-4 py-3 text-slate-500 capitalize">{req.leave_type} - {req.requested_days} days</td>
                      <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">{req.override_reason || "—"}</td>
                      <td className="px-4 py-3">
                        <StatusPill 
                           tone={req.status === "approved" ? "ok" : req.status === "rejected" ? "critical" : "warning"} 
                           label={req.status} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          {req.status === "requested" && (
                            <>
                             <Button variant="default" size="sm" onClick={() => handleUpdateLeaveStatus(req.id, "approved")}>
                               Approve
                             </Button>
                             <Button variant="outline" size="sm" onClick={() => handleUpdateLeaveStatus(req.id, "rejected", true)}>
                               Reject
                             </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "structure" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Departments
            </h3>
            <div className="flex gap-2 mb-4">
              <input 
                value={newDeptName} 
                onChange={e => setNewDeptName(e.target.value)} 
                placeholder="Department Name"
                className="flex h-9 flex-1 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
              />
              <Button onClick={handleCreateDept} disabled={createDeptMutation.isPending || !newDeptName}>
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {departmentList?.length === 0 ? (
                <p className="text-sm text-slate-500">No departments defined.</p>
              ) : (
                departmentList?.map(d => (
                  <div key={d.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md border border-slate-100">
                    <span className="text-sm font-medium">{d.name}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4 border border-slate-200">
            <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Job Titles
            </h3>
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex gap-2">
                <select 
                  value={newJobDeptId} 
                  onChange={e => setNewJobDeptId(e.target.value)} 
                  className="flex h-9 w-1/3 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                >
                  <option value="">Global / No Dept</option>
                  {departmentList?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input 
                  value={newJobTitle} 
                  onChange={e => setNewJobTitle(e.target.value)} 
                  placeholder="Job Title"
                  className="flex h-9 flex-1 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                />
              </div>
              <Button onClick={handleCreateJob} disabled={createJobTitleMutation.isPending || !newJobTitle} className="self-end">
                Add Role
              </Button>
            </div>
            <div className="space-y-2">
              {jobTitleList?.length === 0 ? (
                <p className="text-sm text-slate-500">No roles defined.</p>
              ) : (
                jobTitleList?.map(j => {
                  const dept = departmentList?.find(d => d.id === j.department_id);
                  return (
                    <div key={j.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-sm font-medium">{j.title}</span>
                      <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{dept ? dept.name : "Global"}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "payroll" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
                Payroll Bands
              </h3>
              <div className="flex flex-col gap-2 mb-4">
                <input 
                  value={newBandName} 
                  onChange={e => setNewBandName(e.target.value)} 
                  placeholder="Band Name (e.g. Teacher II)"
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                />
                <div className="flex gap-2">
                  <input 
                    type="number"
                    value={newBandSalary} 
                    onChange={e => setNewBandSalary(e.target.value ? Number(e.target.value) : "")} 
                    placeholder="Base Salary"
                    className="flex h-9 flex-1 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                  <Button onClick={handleCreateBand} disabled={createBandMutation.isPending || !newBandName || !newBandSalary}>
                    Add
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                {bandList?.length === 0 ? (
                  <p className="text-sm text-slate-500">No bands defined.</p>
                ) : (
                  bandList?.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-2 bg-slate-50 rounded-md border border-slate-100">
                      <span className="text-sm font-medium">{b.name}</span>
                      <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">{b.base_salary} {b.currency}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Generate Payslip
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Staff Member</label>
                  <select 
                    value={generatePayslipStaffId} 
                    onChange={e => setGeneratePayslipStaffId(e.target.value)} 
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="">Select Staff...</option>
                    {staffList?.filter(s => s.status === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.display_name} ({s.staff_number || "—"})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-medium text-slate-700">Bonuses</label>
                    <input 
                      type="number"
                      value={generateBonuses} 
                      onChange={e => setGenerateBonuses(Number(e.target.value))} 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-xs font-medium text-slate-700">Deductions</label>
                    <input 
                      type="number"
                      value={generateDeductions} 
                      onChange={e => setGenerateDeductions(Number(e.target.value))} 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    />
                  </div>
                </div>
                <Button onClick={handleGeneratePayslip} disabled={generatePayslipMutation.isPending || !generatePayslipStaffId} className="w-full">
                  Generate Payslip
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card className="p-4 border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Payslips
                </h3>
                <div className="flex gap-2">
                  <select 
                    value={payslipMonth} 
                    onChange={e => setPayslipMonth(Number(e.target.value))} 
                    className="flex h-9 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                      <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('en', { month: 'long' })}</option>
                    ))}
                  </select>
                  <input 
                    type="number"
                    value={payslipYear} 
                    onChange={e => setPayslipYear(Number(e.target.value))} 
                    className="flex h-9 w-24 rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                </div>
              </div>

              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-500">Staff</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">Base</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">Bonuses</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">Deductions</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">Net Pay</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {payslipList?.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-500">No payslips for this period.</td></tr>
                    ) : (
                      payslipList?.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{p.display_name} <span className="text-slate-500 font-normal ml-1">({p.staff_number || "—"})</span></td>
                          <td className="px-4 py-3 text-right">{p.base_amount}</td>
                          <td className="px-4 py-3 text-right text-green-600">+{p.bonuses}</td>
                          <td className="px-4 py-3 text-right text-red-600">-{p.deductions}</td>
                          <td className="px-4 py-3 text-right font-medium">{p.net_pay}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                              {p.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "performance" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Performance Reviews
              </h3>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Staff Member</label>
                    <select 
                      value={reviewStaffId} 
                      onChange={e => setReviewStaffId(e.target.value)} 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    >
                      <option value="">Select Staff...</option>
                      {staffList?.filter(s => s.status === 'active').map(s => (
                        <option key={s.id} value={s.id}>{s.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Date</label>
                    <input 
                      type="date"
                      value={reviewDate} 
                      onChange={e => setReviewDate(e.target.value)} 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Score (1-5)</label>
                  <input 
                    type="number"
                    min="1" max="5"
                    value={reviewScore} 
                    onChange={e => setReviewScore(Number(e.target.value))} 
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Comments</label>
                  <textarea 
                    value={reviewComments} 
                    onChange={e => setReviewComments(e.target.value)} 
                    className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Goals for Next Period (Optional)</label>
                  <textarea 
                    value={reviewGoals} 
                    onChange={e => setReviewGoals(e.target.value)} 
                    className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                </div>
                <Button onClick={handleCreateReview} disabled={createReviewMutation.isPending || !reviewStaffId || !reviewComments} className="w-full">
                  Record Review
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-900">Recent Reviews</h4>
                {reviewsList?.length === 0 ? (
                  <p className="text-sm text-slate-500">No performance reviews recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {reviewsList?.map(r => (
                      <div key={r.id} className="p-3 bg-slate-50 rounded-md border border-slate-100 text-sm">
                        <div className="flex justify-between font-medium text-slate-900 mb-1">
                          <span>{r.display_name}</span>
                          <span className="flex items-center gap-1">Score: {r.score}/5</span>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">{new Date(r.review_date).toLocaleDateString()}</div>
                        <p className="text-slate-700">{r.comments}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-4 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-red-500" />
                Disciplinary Records
              </h3>
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Staff Member</label>
                    <select 
                      value={discStaffId} 
                      onChange={e => setDiscStaffId(e.target.value)} 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                    >
                      <option value="">Select Staff...</option>
                      {staffList?.map(s => (
                        <option key={s.id} value={s.id}>{s.display_name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">Date</label>
                    <input 
                      type="date"
                      value={discDate} 
                      onChange={e => setDiscDate(e.target.value)} 
                      className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Severity</label>
                  <select 
                    value={discSeverity} 
                    onChange={e => setDiscSeverity(e.target.value as any)} 
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Description</label>
                  <textarea 
                    value={discDescription} 
                    onChange={e => setDiscDescription(e.target.value)} 
                    className="flex min-h-[60px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Action Taken (Optional)</label>
                  <input 
                    value={discAction} 
                    onChange={e => setDiscAction(e.target.value)} 
                    placeholder="e.g. Verbal Warning"
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950" 
                  />
                </div>
                <Button variant="danger" onClick={handleCreateDisciplinary} disabled={createDisciplinaryMutation.isPending || !discStaffId || !discDescription} className="w-full">
                  Record Disciplinary Action
                </Button>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-slate-900">Recent Records</h4>
                {disciplinaryList?.length === 0 ? (
                  <p className="text-sm text-slate-500">No disciplinary records found.</p>
                ) : (
                  <div className="space-y-2">
                    {disciplinaryList?.map(d => (
                      <div key={d.id} className="p-3 bg-red-50/50 rounded-md border border-red-100 text-sm">
                        <div className="flex justify-between font-medium text-slate-900 mb-1">
                          <span>{d.display_name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${d.severity === 'critical' || d.severity === 'high' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                            {d.severity}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mb-2">{new Date(d.incident_date).toLocaleDateString()}</div>
                        <p className="text-slate-700">{d.description}</p>
                        {d.action_taken && <p className="text-xs text-slate-500 mt-2"><strong>Action:</strong> {d.action_taken}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}



