import type { SchoolExperienceRole } from "@/lib/experiences/types";

// Route selection must stay independent of the operational workspace bundle.
const liveSchoolRoles = [
  "secretary", "librarian", "storekeeper", "nurse", "guidance-counselling",
  "discipline-master", "laboratory-technician", "ict-manager", "security-officer",
  "transport-manager", "boarding-master", "student",
] as const satisfies readonly SchoolExperienceRole[];

export type LiveSchoolRole = (typeof liveSchoolRoles)[number];

export function isLiveRoleCommandCenterRole(role: SchoolExperienceRole): role is LiveSchoolRole {
  return (liveSchoolRoles as readonly SchoolExperienceRole[]).includes(role);
}
