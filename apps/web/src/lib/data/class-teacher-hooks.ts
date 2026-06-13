import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

// Wired to real backend using the standard api client
async function fetchApi(endpoint: string, options?: RequestInit) {
  const tenantId = getCurrentSchoolId() || "myshule-tenant-demo";
  
  return requestDashboardApi(endpoint, {
    method: options?.method as any || "GET",
    tenantId,
    body: options?.body ? JSON.parse(options.body as string) : undefined
  });
}

export function useClassTeacherOverview(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "overview", streamId],
    queryFn: () => fetchApi(`dashboard/summary?role=class-teacher&streamId=${streamId}`)
  });
}

export function useClassTeacherRegister(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "register", streamId],
    queryFn: () => fetchApi(`students?streamId=${streamId}`)
  });
}

export function useClassTeacherAttendance(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "attendance", streamId],
    queryFn: () => fetchApi(`attendance/summary?streamId=${streamId}`)
  });
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();
  const schoolId = getCurrentSchoolId() || "myshule-tenant-demo";

  return useOfflineMutation({
    module: "attendance",
    action: "bulk_save",
    schoolId,
    mutationFn: (data: { streamId: string; records: any[] }) => 
      fetchApi("attendance/bulk", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "attendance", variables.streamId] });
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "overview", variables.streamId] });
    }
  });
}

export function useClassTeacherProgress(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "progress", streamId],
    queryFn: () => fetchApi(`exams/results?streamId=${streamId}`)
  });
}

export function useClassTeacherComments(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "comments", streamId],
    queryFn: () => fetchApi(`exams/comments?streamId=${streamId}`)
  });
}

export function useClassTeacherDiscipline(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "discipline", streamId],
    queryFn: () => fetchApi(`discipline/incidents?streamId=${streamId}`)
  });
}

export function useReportDisciplineIncident() {
  const queryClient = useQueryClient();
  const schoolId = getCurrentSchoolId() || "myshule-tenant-demo";

  return useOfflineMutation({
    module: "discipline",
    action: "report_incident",
    schoolId,
    mutationFn: (data: { streamId: string; payload: any }) => 
      fetchApi("discipline/incidents", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "discipline", variables.streamId] });
    }
  });
}

export function useClassTeacherWelfare(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "welfare", streamId],
    queryFn: () => fetchApi(`welfare/cases?streamId=${streamId}`)
  });
}

export function useReferWelfareCase() {
  const queryClient = useQueryClient();
  const schoolId = getCurrentSchoolId() || "myshule-tenant-demo";

  return useOfflineMutation({
    module: "welfare",
    action: "refer_case",
    schoolId,
    mutationFn: (data: { streamId: string; payload: any }) => 
      fetchApi("welfare/cases", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "welfare", variables.streamId] });
    }
  });
}

export function useClassTeacherTimetable(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "timetable", streamId],
    queryFn: () => fetchApi(`academics/timetable?streamId=${streamId}`)
  });
}

export function useClassTeacherSubjects(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "subjects", streamId],
    queryFn: () => fetchApi(`academics/subjects?streamId=${streamId}`)
  });
}

export function useClassTeacherCommunication(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "communication", streamId],
    queryFn: () => fetchApi(`communication/messages?streamId=${streamId}`)
  });
}

export function useClassTeacherTasks(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "tasks", streamId],
    queryFn: () => fetchApi(`operations/tasks?streamId=${streamId}`)
  });
}

export function useClassTeacherFees(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "fees", streamId],
    queryFn: () => fetchApi(`finance/balances?streamId=${streamId}`)
  });
}

export function useClassTeacherHealth(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "health", streamId],
    queryFn: () => fetchApi(`health/records?streamId=${streamId}`)
  });
}

export function useClassTeacherHomework(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "homework", streamId],
    queryFn: () => fetchApi(`academics/homework?streamId=${streamId}`)
  });
}

export function useClassTeacherMeetings(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "meetings", streamId],
    queryFn: () => fetchApi(`communication/meetings?streamId=${streamId}`)
  });
}

export function useClassTeacherRequests(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "requests", streamId],
    queryFn: () => fetchApi(`operations/requests?streamId=${streamId}`)
  });
}

export function useClassTeacherDocuments(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "documents", streamId],
    queryFn: () => fetchApi(`operations/documents?streamId=${streamId}`)
  });
}

export function useClassTeacherNotifications(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "notifications", streamId],
    queryFn: () => fetchApi(`operations/notifications`)
  });
}

export function useClassTeacherReports(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "reports", streamId],
    queryFn: () => fetchApi(`operations/reports?streamId=${streamId}`)
  });
}

export function useClassTeacherSettings(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "settings", streamId],
    queryFn: () => fetchApi(`school/settings`)
  });
}

