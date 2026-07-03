import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requireCurrentSchoolId } from "@/lib/school/school-operational-store";
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

// Wired to real backend using the standard api client
async function fetchApi(endpoint: string, options?: RequestInit) {
  const tenantId = requireCurrentSchoolId();
  
  return requestDashboardApi(endpoint, {
    method: options?.method as any || "GET",
    tenantId,
    body: options?.body ? JSON.parse(options.body as string) : undefined
  });
}

type ClassTeacherAssignment = {
  id?: string | null;
  classSectionId?: string | null;
  class_section_id?: string | null;
};

type ClassTeacherAssignmentResponse = {
  classes?: ClassTeacherAssignment[];
};

function isUnresolvedStreamId(streamId?: string | null) {
  return !streamId || streamId === "stream_123";
}

function firstAssignedClassSectionId(response: unknown) {
  const classes = Array.isArray(response)
    ? response as ClassTeacherAssignment[]
    : (response as ClassTeacherAssignmentResponse | null)?.classes;
  const firstClass = Array.isArray(classes) ? classes[0] : null;

  return firstClass?.classSectionId || firstClass?.class_section_id || firstClass?.id || "";
}

export function useResolvedClassTeacherStreamId(requestedStreamId?: string | null) {
  const shouldResolve = isUnresolvedStreamId(requestedStreamId);
  const assignmentsQuery = useQuery({
    queryKey: ["class-teacher", "resolved-stream"],
    queryFn: () => fetchApi("class-teacher/my-classes"),
    enabled: shouldResolve,
    staleTime: 60_000,
  });
  const resolvedStreamId = shouldResolve ? firstAssignedClassSectionId(assignmentsQuery.data) : requestedStreamId || "";

  return {
    streamId: resolvedStreamId,
    isResolvingStream: shouldResolve && assignmentsQuery.isLoading,
    streamResolutionError: shouldResolve ? assignmentsQuery.error : null,
    hasAssignedStream: Boolean(resolvedStreamId),
  };
}

function useClassTeacherStreamQuery<T>(scope: string, endpoint: string, streamId?: string | null) {
  const resolved = useResolvedClassTeacherStreamId(streamId);

  return useQuery<T, Error>({
    queryKey: ["class-teacher", scope, resolved.streamId || "unassigned"],
    queryFn: async () => {
      if (!resolved.streamId) return [] as T;
      return await fetchApi(`${endpoint}?streamId=${encodeURIComponent(resolved.streamId)}`) as T;
    },
    enabled: !resolved.isResolvingStream,
  });
}

export function useClassTeacherOverview(streamId: string) {
  return useClassTeacherStreamQuery("overview", "class-teacher/overview", streamId);
}

export function useClassTeacherRegister(streamId: string) {
  return useClassTeacherStreamQuery("register", "class-teacher/register", streamId);
}

export function useClassTeacherAttendance(streamId: string) {
  return useClassTeacherStreamQuery("attendance", "class-teacher/attendance", streamId);
}

export function useSaveAttendance() {
  const queryClient = useQueryClient();
  const schoolId = requireCurrentSchoolId();

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
  return useClassTeacherStreamQuery("progress", "class-teacher/progress", streamId);
}

export function useClassTeacherComments(streamId: string) {
  return useClassTeacherStreamQuery("comments", "class-teacher/comments", streamId);
}

export function useClassTeacherDiscipline(streamId: string) {
  return useClassTeacherStreamQuery("discipline", "class-teacher/discipline", streamId);
}

export function useReportDisciplineIncident() {
  const queryClient = useQueryClient();
  const schoolId = requireCurrentSchoolId();

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
  return useClassTeacherStreamQuery("welfare", "class-teacher/welfare", streamId);
}

export function useReferWelfareCase() {
  const queryClient = useQueryClient();
  const schoolId = requireCurrentSchoolId();

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
  return useClassTeacherStreamQuery("timetable", "class-teacher/timetable", streamId);
}

export function useClassTeacherSubjects(streamId: string) {
  return useClassTeacherStreamQuery("subjects", "class-teacher/subjects", streamId);
}

export function useClassTeacherCommunication(streamId: string) {
  return useClassTeacherStreamQuery("communication", "class-teacher/communication", streamId);
}

export function useClassTeacherTasks(streamId: string) {
  return useClassTeacherStreamQuery("tasks", "class-teacher/tasks", streamId);
}

export function useClassTeacherFees(streamId: string) {
  return useClassTeacherStreamQuery("fees", "class-teacher/fees", streamId);
}

export function useClassTeacherHealth(streamId: string) {
  return useClassTeacherStreamQuery("health", "class-teacher/health", streamId);
}

export function useClassTeacherHomework(streamId: string) {
  return useClassTeacherStreamQuery("homework", "class-teacher/homework", streamId);
}

export function useClassTeacherMeetings(streamId: string) {
  return useClassTeacherStreamQuery("meetings", "class-teacher/meetings", streamId);
}

export function useClassTeacherRequests(streamId: string) {
  return useClassTeacherStreamQuery("requests", "class-teacher/requests", streamId);
}

export function useClassTeacherDocuments(streamId: string) {
  return useClassTeacherStreamQuery("documents", "class-teacher/documents", streamId);
}

export function useClassTeacherNotifications(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "notifications", streamId],
    queryFn: () => fetchApi(`class-teacher/notifications`)
  });
}

export function useClassTeacherReports(streamId: string) {
  return useClassTeacherStreamQuery("reports", "class-teacher/reports", streamId);
}

export function useClassTeacherSettings(streamId: string) {
  return useQuery({
    queryKey: ["class-teacher", "settings", streamId],
    queryFn: () => fetchApi(`class-teacher/settings`)
  });
}

export function useSaveClassTeacherSettings(streamId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: { notificationsEnabled: boolean; defaultView: string; darkMode?: boolean }) =>
      fetchApi(`class-teacher/settings?streamId=${encodeURIComponent(streamId || "")}`, {
        method: "POST",
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-teacher", "settings", streamId] });
    },
  });
}

