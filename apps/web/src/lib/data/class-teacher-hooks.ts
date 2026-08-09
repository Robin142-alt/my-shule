import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { useOptionalAuth } from "@/lib/auth/auth-context";

// Wired to real backend using the standard api client
async function fetchApi(tenantId: string, endpoint: string, options?: RequestInit) {
  return requestDashboardApi(endpoint, {
    method: options?.method as any || "GET",
    tenantId,
    body: options?.body ? JSON.parse(options.body as string) : undefined
  });
}

export type ClassTeacherQueryScope = {
  schoolId: string;
  userId: string;
  activeAuthorizationRoleCode: string;
};

export function buildClassTeacherQueryKey(
  scope: ClassTeacherQueryScope,
  area: string,
  streamId?: string,
) {
  return [
    "class-teacher",
    scope.schoolId,
    scope.userId,
    scope.activeAuthorizationRoleCode,
    area,
    ...(streamId ? [streamId] : []),
  ] as const;
}

function useClassTeacherQueryScope(): ClassTeacherQueryScope {
  const tenantId = useOptionalSchoolTenantId();
  const dashboardRole = useOptionalSchoolDashboardRole();
  const legacyAuth = useOptionalAuth();

  return {
    schoolId: tenantId?.trim()
      || dashboardRole?.tenantSlug?.trim()
      || getCurrentSchoolId().trim(),
    userId: dashboardRole?.userId?.trim() || legacyAuth?.user?.id?.trim() || "",
    activeAuthorizationRoleCode: dashboardRole?.activeAuthorizationRoleCode.trim()
      || legacyAuth?.user?.role?.trim()
      || "",
  };
}

function isReadyClassTeacherScope(scope: ClassTeacherQueryScope) {
  return Boolean(scope.schoolId && scope.userId && scope.activeAuthorizationRoleCode);
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

function useResolvedClassTeacherStreamIdForScope(
  scope: ClassTeacherQueryScope,
  requestedStreamId?: string | null,
) {
  const shouldResolve = isUnresolvedStreamId(requestedStreamId);
  const assignmentsQuery = useQuery({
    queryKey: buildClassTeacherQueryKey(scope, "resolved-stream"),
    queryFn: () => fetchApi(scope.schoolId, "class-teacher/my-classes"),
    enabled: shouldResolve && isReadyClassTeacherScope(scope),
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

export function useResolvedClassTeacherStreamId(requestedStreamId?: string | null) {
  return useResolvedClassTeacherStreamIdForScope(
    useClassTeacherQueryScope(),
    requestedStreamId,
  );
}

function useClassTeacherStreamQuery<T>(scope: string, endpoint: string, streamId?: string | null) {
  const queryScope = useClassTeacherQueryScope();
  const resolved = useResolvedClassTeacherStreamIdForScope(queryScope, streamId);

  return useQuery<T, Error>({
    queryKey: buildClassTeacherQueryKey(
      queryScope,
      scope,
      resolved.streamId || "unassigned",
    ),
    queryFn: async () => {
      if (!resolved.streamId) return [] as T;
      return await fetchApi(
        queryScope.schoolId,
        `${endpoint}?streamId=${encodeURIComponent(resolved.streamId)}`,
      ) as T;
    },
    enabled: isReadyClassTeacherScope(queryScope) && !resolved.isResolvingStream,
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
  const scope = useClassTeacherQueryScope();

  return useOfflineMutation({
    module: "attendance",
    action: "bulk_save",
    schoolId: scope.schoolId,
    roleId: scope.activeAuthorizationRoleCode,
    requireAuthenticatedQueueActor: true,
    mutationFn: (data: { streamId: string; records: any[] }) => 
      fetchApi(scope.schoolId, "class-teacher/attendance", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: buildClassTeacherQueryKey(scope, "attendance", variables.streamId),
      });
      void queryClient.invalidateQueries({
        queryKey: buildClassTeacherQueryKey(scope, "overview", variables.streamId),
      });
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
  const scope = useClassTeacherQueryScope();

  return useOfflineMutation({
    module: "discipline",
    action: "report_incident",
    schoolId: scope.schoolId,
    roleId: scope.activeAuthorizationRoleCode,
    requireAuthenticatedQueueActor: true,
    mutationFn: (data: { streamId: string; payload: any }) => 
      fetchApi(scope.schoolId, "class-teacher/discipline", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: buildClassTeacherQueryKey(scope, "discipline", variables.streamId),
      });
    }
  });
}

export function useClassTeacherWelfare(streamId: string) {
  return useClassTeacherStreamQuery("welfare", "class-teacher/welfare", streamId);
}

export function useReferWelfareCase() {
  const queryClient = useQueryClient();
  const scope = useClassTeacherQueryScope();

  return useOfflineMutation({
    module: "welfare",
    action: "refer_case",
    schoolId: scope.schoolId,
    roleId: scope.activeAuthorizationRoleCode,
    requireAuthenticatedQueueActor: true,
    mutationFn: (data: { streamId: string; payload: any }) => 
      fetchApi(scope.schoolId, "class-teacher/welfare", {
        method: "POST",
        body: JSON.stringify(data)
      }),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({
        queryKey: buildClassTeacherQueryKey(scope, "welfare", variables.streamId),
      });
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
  const scope = useClassTeacherQueryScope();
  return useQuery({
    queryKey: buildClassTeacherQueryKey(scope, "notifications", streamId),
    queryFn: () => fetchApi(scope.schoolId, "class-teacher/notifications"),
    enabled: isReadyClassTeacherScope(scope),
  });
}

export function useClassTeacherReports(streamId: string) {
  return useClassTeacherStreamQuery("reports", "class-teacher/reports", streamId);
}

export function useClassTeacherSettings(streamId: string) {
  const scope = useClassTeacherQueryScope();
  return useQuery({
    queryKey: buildClassTeacherQueryKey(scope, "settings", streamId),
    queryFn: () => fetchApi(scope.schoolId, "class-teacher/settings"),
    enabled: isReadyClassTeacherScope(scope),
  });
}

export function useSaveClassTeacherSettings(streamId: string) {
  const queryClient = useQueryClient();
  const scope = useClassTeacherQueryScope();

  return useMutation({
    mutationFn: (settings: { notificationsEnabled: boolean; defaultView: string; darkMode?: boolean }) =>
      fetchApi(scope.schoolId, `class-teacher/settings?streamId=${encodeURIComponent(streamId || "")}`, {
        method: "POST",
        body: JSON.stringify(settings),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: buildClassTeacherQueryKey(scope, "settings", streamId),
      });
    },
  });
}

