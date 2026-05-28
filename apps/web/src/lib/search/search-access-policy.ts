import type { PortalViewer, SchoolExperienceRole } from "@/lib/experiences/types";

export type SearchAccessMode =
  | "GLOBAL_EXECUTIVE"
  | "GLOBAL_OPERATIONS"
  | "GLOBAL_FRONT_OFFICE"
  | "GLOBAL_FINANCE"
  | "ROLE_SCOPED"
  | "MODULE_SCOPED"
  | "SENSITIVE_SCOPED"
  | "SELF_ONLY"
  | "PLATFORM"
  | "PLATFORM_HEALTH";

export type SearchEntityType =
  | "student"
  | "parent"
  | "staff"
  | "class"
  | "subject"
  | "receipt"
  | "invoice"
  | "mpesa"
  | "exam"
  | "assignment"
  | "incident"
  | "book"
  | "inventory"
  | "bus"
  | "route"
  | "visitor"
  | "admission"
  | "document"
  | "supportTicket"
  | "healthCase"
  | "counsellingCase"
  | "disciplineCase"
  | "platformTenant"
  | "systemJob";

export type OperationalRoleKey =
  | SchoolExperienceRole
  | PortalViewer
  | "superadmin"
  | "system-monitor"
  | "platform-owner";

export type SearchAccessPolicy = {
  roleKey: OperationalRoleKey;
  mode: SearchAccessMode;
  allowedEntities: SearchEntityType[];
  forbiddenEntities: SearchEntityType[];
  scopeTags: string[];
};

const allSchoolEntities: SearchEntityType[] = [
  "student",
  "parent",
  "staff",
  "class",
  "subject",
  "receipt",
  "invoice",
  "mpesa",
  "exam",
  "assignment",
  "incident",
  "book",
  "inventory",
  "bus",
  "route",
  "visitor",
  "admission",
  "document",
  "supportTicket",
  "healthCase",
  "counsellingCase",
  "disciplineCase",
];

const privateCaseEntities: SearchEntityType[] = ["healthCase", "counsellingCase", "disciplineCase"];
const financeEntities: SearchEntityType[] = ["receipt", "invoice", "mpesa"];
const platformEntities: SearchEntityType[] = ["platformTenant", "systemJob", "supportTicket", "document"];

const rolePolicies: Record<OperationalRoleKey, Omit<SearchAccessPolicy, "roleKey">> = {
  principal: {
    mode: "GLOBAL_EXECUTIVE",
    allowedEntities: allSchoolEntities,
    forbiddenEntities: ["platformTenant", "systemJob"],
    scopeTags: ["school-wide", "executive"],
  },
  "deputy-principal": {
    mode: "GLOBAL_OPERATIONS",
    allowedEntities: [
      "student",
      "parent",
      "staff",
      "class",
      "subject",
      "exam",
      "assignment",
      "incident",
      "bus",
      "route",
      "visitor",
      "document",
      "disciplineCase",
    ],
    forbiddenEntities: ["receipt", "invoice", "mpesa", "platformTenant", "systemJob", "counsellingCase", "healthCase"],
    scopeTags: ["school-wide", "operations"],
  },
  secretary: {
    mode: "GLOBAL_FRONT_OFFICE",
    allowedEntities: ["student", "parent", "visitor", "admission", "document", "receipt", "supportTicket", "class"],
    forbiddenEntities: ["mpesa", "invoice", "healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
    scopeTags: ["front-office"],
  },
  bursar: {
    mode: "GLOBAL_FINANCE",
    allowedEntities: ["student", "parent", "receipt", "invoice", "mpesa", "document", "supportTicket", "staff"],
    forbiddenEntities: ["healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
    scopeTags: ["finance"],
  },
  accountant: {
    mode: "GLOBAL_FINANCE",
    allowedEntities: ["student", "parent", "receipt", "invoice", "mpesa", "document", "supportTicket", "staff"],
    forbiddenEntities: ["healthCase", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
    scopeTags: ["finance"],
  },
  teacher: {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "parent", "class", "subject", "assignment", "exam", "document"],
    forbiddenEntities: [...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["teacher-assigned"],
  },
  "class-teacher": {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "parent", "class", "assignment", "exam", "incident", "document", "disciplineCase"],
    forbiddenEntities: [...financeEntities, "healthCase", "counsellingCase", "platformTenant", "systemJob"],
    scopeTags: ["class-teacher-owned"],
  },
  "grade-master": {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "parent", "staff", "class", "subject", "exam", "assignment", "incident", "disciplineCase", "document"],
    forbiddenEntities: [...financeEntities, "healthCase", "counsellingCase", "platformTenant", "systemJob"],
    scopeTags: ["grade-owned"],
  },
  hod: {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "staff", "class", "subject", "exam", "assignment", "document"],
    forbiddenEntities: [...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["department-owned"],
  },
  "dean-academics": {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "staff", "class", "subject", "exam", "assignment", "document"],
    forbiddenEntities: [...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["academic-approval"],
  },
  "exams-manager": {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "staff", "class", "subject", "exam", "assignment", "document"],
    forbiddenEntities: [...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["exams-office"],
  },
  admin: {
    mode: "ROLE_SCOPED",
    allowedEntities: ["student", "parent", "staff", "class", "subject", "document", "supportTicket"],
    forbiddenEntities: [...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["school-admin"],
  },
  storekeeper: {
    mode: "MODULE_SCOPED",
    allowedEntities: ["inventory", "document", "supportTicket"],
    forbiddenEntities: ["student", "parent", "receipt", "invoice", "mpesa", ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["inventory"],
  },
  librarian: {
    mode: "MODULE_SCOPED",
    allowedEntities: ["book", "student", "parent", "document"],
    forbiddenEntities: [...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["library"],
  },
  nurse: {
    mode: "SENSITIVE_SCOPED",
    allowedEntities: ["student", "parent", "healthCase", "inventory", "document"],
    forbiddenEntities: ["receipt", "invoice", "mpesa", "counsellingCase", "disciplineCase", "platformTenant", "systemJob"],
    scopeTags: ["clinic-permitted"],
  },
  "boarding-master": {
    mode: "MODULE_SCOPED",
    allowedEntities: ["student", "parent", "incident", "document"],
    forbiddenEntities: [...financeEntities, "healthCase", "counsellingCase", "platformTenant", "systemJob"],
    scopeTags: ["boarding"],
  },
  "security-officer": {
    mode: "MODULE_SCOPED",
    allowedEntities: ["visitor", "student", "staff", "bus", "route", "incident", "document"],
    forbiddenEntities: [...financeEntities, "healthCase", "counsellingCase", "platformTenant", "systemJob"],
    scopeTags: ["security"],
  },
  "transport-manager": {
    mode: "MODULE_SCOPED",
    allowedEntities: ["student", "parent", "bus", "route", "staff", "incident", "document"],
    forbiddenEntities: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
    scopeTags: ["transport"],
  },
  "laboratory-technician": {
    mode: "MODULE_SCOPED",
    allowedEntities: ["class", "subject", "inventory", "document", "incident"],
    forbiddenEntities: ["student", "parent", ...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["labs"],
  },
  "guidance-counselling": {
    mode: "SENSITIVE_SCOPED",
    allowedEntities: ["student", "parent", "counsellingCase", "incident", "document"],
    forbiddenEntities: ["receipt", "invoice", "mpesa", "healthCase", "platformTenant", "systemJob"],
    scopeTags: ["counselling-permitted"],
  },
  "discipline-master": {
    mode: "SENSITIVE_SCOPED",
    allowedEntities: ["student", "parent", "incident", "disciplineCase", "document"],
    forbiddenEntities: ["receipt", "invoice", "mpesa", "healthCase", "counsellingCase", "platformTenant", "systemJob"],
    scopeTags: ["discipline-permitted"],
  },
  admissions: {
    mode: "MODULE_SCOPED",
    allowedEntities: ["admission", "student", "parent", "document", "supportTicket"],
    forbiddenEntities: [...financeEntities, ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["admissions"],
  },
  parent: {
    mode: "SELF_ONLY",
    allowedEntities: ["student", "receipt", "invoice", "exam", "assignment", "bus", "route", "document", "incident", "healthCase"],
    forbiddenEntities: ["staff", "platformTenant", "systemJob", "counsellingCase", "disciplineCase"],
    scopeTags: ["own-child"],
  },
  student: {
    mode: "SELF_ONLY",
    allowedEntities: ["assignment", "exam", "book", "document", "student", "subject", "class"],
    forbiddenEntities: ["parent", "staff", "receipt", "invoice", "mpesa", ...privateCaseEntities, "platformTenant", "systemJob"],
    scopeTags: ["self"],
  },
  superadmin: {
    mode: "PLATFORM",
    allowedEntities: platformEntities,
    forbiddenEntities: ["student", "parent", "healthCase", "counsellingCase", "disciplineCase"],
    scopeTags: ["platform"],
  },
  "platform-owner": {
    mode: "PLATFORM",
    allowedEntities: platformEntities,
    forbiddenEntities: ["student", "parent", "healthCase", "counsellingCase", "disciplineCase"],
    scopeTags: ["platform"],
  },
  "system-monitor": {
    mode: "PLATFORM_HEALTH",
    allowedEntities: ["systemJob", "supportTicket", "document", "platformTenant"],
    forbiddenEntities: ["student", "parent", "staff", "receipt", "invoice", "mpesa", ...privateCaseEntities],
    scopeTags: ["platform-health"],
  },
};

export function normalizeOperationalRoleKey(input: string | null | undefined): OperationalRoleKey {
  const normalized = (input ?? "").trim().toLowerCase().replace(/_/g, "-");

  if (normalized in rolePolicies) {
    return normalized as OperationalRoleKey;
  }

  if (normalized.includes("deputy")) return "deputy-principal";
  if (normalized.includes("secretary") || normalized.includes("reception")) return "secretary";
  if (normalized.includes("accountant")) return "accountant";
  if (normalized.includes("bursar")) return "bursar";
  if (normalized.includes("class teacher")) return "class-teacher";
  if (normalized.includes("grade") || normalized.includes("form master")) return "grade-master";
  if (normalized.includes("head of department") || normalized === "hod") return "hod";
  if (normalized.includes("dean")) return "dean-academics";
  if (normalized.includes("exam")) return "exams-manager";
  if (normalized.includes("nurse") || normalized.includes("clinic")) return "nurse";
  if (normalized.includes("boarding")) return "boarding-master";
  if (normalized.includes("security")) return "security-officer";
  if (normalized.includes("transport")) return "transport-manager";
  if (normalized.includes("laboratory") || normalized.includes("lab")) return "laboratory-technician";
  if (normalized.includes("counsellor") || normalized.includes("counselling")) return "guidance-counselling";
  if (normalized.includes("discipline")) return "discipline-master";
  if (normalized.includes("admission") || normalized.includes("registrar")) return "admissions";
  if (normalized.includes("parent")) return "parent";
  if (normalized.includes("student")) return "student";
  if (normalized.includes("platform") || normalized.includes("super")) return "superadmin";
  if (normalized.includes("system monitor")) return "system-monitor";
  if (normalized.includes("admin")) return "admin";

  return "teacher";
}

export function resolveSearchPolicy(
  roleInput: string | null | undefined,
  capabilities: readonly string[] = [],
): SearchAccessPolicy {
  const roleKey = normalizeOperationalRoleKey(roleInput);
  const policy = rolePolicies[roleKey];
  const capabilitySet = new Set(capabilities);
  const extraEntities: SearchEntityType[] = [];

  if (capabilitySet.has("finance:search")) {
    extraEntities.push(...financeEntities);
  }

  if (capabilitySet.has("sensitive-cases:search")) {
    extraEntities.push(...privateCaseEntities);
  }

  return {
    roleKey,
    mode: policy.mode,
    allowedEntities: [...new Set([...policy.allowedEntities, ...extraEntities])],
    forbiddenEntities: policy.forbiddenEntities.filter((entity) => !extraEntities.includes(entity)),
    scopeTags: policy.scopeTags,
  };
}
