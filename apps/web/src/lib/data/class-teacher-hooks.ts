import { useQuery, useQueryClient } from "@tanstack/react-query";
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
    queryFn: () => fetchApi(`class-teacher/overview?streamId=${streamId}`)
  });
}

export function useClassTeacherRegister(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "register", streamId],
    queryFn: () => fetchApi(`class-teacher/register?streamId=${streamId}`)
  });
}

export function useClassTeacherAttendance(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "attendance", streamId],
    queryFn: () => fetchApi(`class-teacher/attendance?streamId=${streamId}`)
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
      fetchApi("class-teacher/attendance", {
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
    queryFn: () => fetchApi(`class-teacher/progress?streamId=${streamId}`)
  });
}

export function useClassTeacherComments(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "comments", streamId],
    queryFn: () => fetchApi(`class-teacher/comments?streamId=${streamId}`)
  });
}

export function useClassTeacherDiscipline(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "discipline", streamId],
    queryFn: () => fetchApi(`class-teacher/discipline?streamId=${streamId}`)
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
      fetchApi("class-teacher/discipline", {
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
    queryFn: () => fetchApi(`class-teacher/welfare?streamId=${streamId}`)
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
      fetchApi("class-teacher/welfare", {
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
    queryFn: () => fetchApi(`class-teacher/timetable?streamId=${streamId}`)
  });
}

export function useClassTeacherSubjects(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "subjects", streamId],
    queryFn: () => fetchApi(`class-teacher/subjects?streamId=${streamId}`)
  });
}

export function useClassTeacherCommunication(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "communication", streamId],
    queryFn: () => fetchApi(`class-teacher/communication?streamId=${streamId}`)
  });
}

export function useClassTeacherTasks(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "tasks", streamId],
    queryFn: () => fetchApi(`class-teacher/tasks?streamId=${streamId}`)
  });
}

export function useClassTeacherFees(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "fees", streamId],
    queryFn: () => fetchApi(`class-teacher/fees?streamId=${streamId}`)
  });
}

export function useClassTeacherHealth(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "health", streamId],
    queryFn: () => fetchApi(`class-teacher/health?streamId=${streamId}`)
  });
}

export function useClassTeacherHomework(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "homework", streamId],
    queryFn: () => fetchApi(`class-teacher/homework?streamId=${streamId}`)
  });
}

export function useClassTeacherMeetings(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "meetings", streamId],
    queryFn: () => fetchApi(`class-teacher/meetings?streamId=${streamId}`)
  });
}

export function useClassTeacherRequests(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "requests", streamId],
    queryFn: () => fetchApi(`class-teacher/requests?streamId=${streamId}`)
  });
}

export function useClassTeacherDocuments(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "documents", streamId],
    queryFn: () => fetchApi(`class-teacher/documents?streamId=${streamId}`)
  });
}

export function useClassTeacherNotifications(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "notifications", streamId],
    queryFn: () => fetchApi(`class-teacher/notifications`)
  });
}

export function useClassTeacherReports(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "reports", streamId],
    queryFn: () => fetchApi(`class-teacher/reports?streamId=${streamId}`)
  });
}

export function useClassTeacherSettings(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "settings", streamId],
    queryFn: () => fetchApi(`class-teacher/settings`)
  });
}

