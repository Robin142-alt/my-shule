import { requestSchoolApiProxy } from "@/lib/dashboard/school-api-proxy-client";
import type { ProgressionCommand, ProgressionCommandResult } from "../../../../../shared/student-progression";

export type { ProgressionAction, ProgressionClass, ProgressionCommand, ProgressionCommandResult, ProgressionOverview, ProgressionRun, ProgressionStatus, ProgressionStream, ProgressionStudent, ProgressionStudentDetail, ProgressionYear } from "../../../../../shared/student-progression";

export const submitProgressionCommand = (command: ProgressionCommand) =>
  requestSchoolApiProxy<ProgressionCommandResult>("/academics/progression/commands", { method: "POST", body: command });

export const runProgression = (academicYearId: string, requestId: string) =>
  requestSchoolApiProxy<{ status: string; message: string }>("/academics/progression/run", { method: "POST", body: { academic_year_id: academicYearId, request_id: requestId } });

export const decideProgressionApproval = (id: string, decision: "approved" | "rejected", reason: string) =>
  requestSchoolApiProxy<ProgressionCommandResult>(`/academics/progression/approvals/${encodeURIComponent(id)}`, { method: "POST", body: { decision, reason } });
