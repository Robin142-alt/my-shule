"use client";

import { workspaceResource } from "@/components/shared/workspace-resource";
import { WorkspaceLoading } from "@/components/shared/workspace-loading";

export const roleResources = {
  DeanAcademicsCommandCenter: workspaceResource(() => import("./dean-academics-command-center").then((module) => module.DeanAcademicsCommandCenter), WorkspaceLoading),
  DeputyPrincipalCommandCenter: workspaceResource(() => import("./deputy-principal-command-center").then((module) => module.DeputyPrincipalCommandCenter), WorkspaceLoading),
  PrincipalCommandCenter: workspaceResource(() => import("./principal-command-center").then((module) => module.PrincipalCommandCenter), WorkspaceLoading),
  AccountantCommandCenter: workspaceResource(() => import("./accountant-command-center").then((module) => module.AccountantCommandCenter), WorkspaceLoading),
  ExamsManagerCommandCenter: workspaceResource(() => import("./exams-manager-command-center").then((module) => module.ExamsManagerCommandCenter), WorkspaceLoading),
  GradeMasterCommandCenter: workspaceResource(() => import("./grade-master-command-center").then((module) => module.GradeMasterCommandCenter), WorkspaceLoading),
  HosCommandCenter: workspaceResource(() => import("./hos-command-center").then((module) => module.HosCommandCenter), WorkspaceLoading),
  HodCommandCenter: workspaceResource(() => import("./hod-command-center").then((module) => module.HodCommandCenter), WorkspaceLoading),
  LiveRoleCommandCenter: workspaceResource(() => import("./live-role-command-center").then((module) => module.LiveRoleCommandCenter), WorkspaceLoading),
  RoleOperationalCommandCenter: workspaceResource(() => import("./role-operational-command-center").then((module) => module.RoleOperationalCommandCenter), WorkspaceLoading),
  TeacherCommandCenter: workspaceResource(() => import("./teacher-command-center").then((module) => module.TeacherCommandCenter), WorkspaceLoading),
  ProcurementOfficerCommandCenter: workspaceResource(() => import("./procurement-officer-command-center").then((module) => module.ProcurementOfficerCommandCenter), WorkspaceLoading),
  ClassTeacherCommandCenter: workspaceResource(() => import("./class-teacher-command-center").then((module) => module.ClassTeacherCommandCenter), WorkspaceLoading),
  AdmissionsDashboardCommandCenter: workspaceResource(() => import("./admissions-dashboard/admissions-dashboard-command-center").then((module) => module.AdmissionsDashboardCommandCenter), WorkspaceLoading),
};

const roleResourceNames: Record<string, keyof typeof roleResources> = {
  "admin": "RoleOperationalCommandCenter",
  "principal": "PrincipalCommandCenter",
  "deputy-principal": "DeputyPrincipalCommandCenter",
  "teacher": "TeacherCommandCenter",
  "accountant": "AccountantCommandCenter",
  "bursar": "AccountantCommandCenter",
  "dean-academics": "DeanAcademicsCommandCenter",
  "exams-manager": "ExamsManagerCommandCenter",
  "grade-master": "GradeMasterCommandCenter",
  "hod": "HodCommandCenter",
  "hos": "HosCommandCenter",
  "class-teacher": "ClassTeacherCommandCenter",
  "admissions": "AdmissionsDashboardCommandCenter",
  "procurement-officer": "ProcurementOfficerCommandCenter",
};

/** Prefetch JavaScript only. Authorization and school data are never prefetched. */
export async function preloadSchoolRole(role: string) {
  const resource = roleResourceNames[role] ?? "LiveRoleCommandCenter";
  await roleResources[resource].preload();
}
