import {
  isDashboardApiConfigured,
  requestDashboardApi,
} from "@/lib/dashboard/api-client";

export type SchoolModuleAccessFailureReason =
  | "missing_session"
  | "module_status_unavailable"
  | "module_disabled";

export type SchoolModuleAccessState =
  | {
      enabled: true;
      reason?: never;
    }
  | {
      enabled: false;
      reason: SchoolModuleAccessFailureReason;
    };

export const MODULE_NOT_ENABLED_MESSAGE = "Module not enabled for your school";
export const MODULE_STATUS_UNAVAILABLE_MESSAGE = "Module access could not be verified for your school.";

type ModuleAccessRecord = {
  code?: unknown;
  enabled?: unknown;
  status?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapEnvelope(value: unknown): unknown {
  if (isRecord(value) && "data" in value) {
    return value.data;
  }

  return value;
}

function addEnabledModuleCode(codes: Set<string>, value: unknown) {
  if (typeof value === "string" && value.trim()) {
    codes.add(value.trim());
  }
}

function addModuleRecord(codes: Set<string>, value: unknown) {
  if (typeof value === "string") {
    addEnabledModuleCode(codes, value);
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const record = value as ModuleAccessRecord;
  const code = typeof record.code === "string" ? record.code.trim() : "";
  const enabled = record.enabled !== false;
  const active = record.status !== "inactive";

  if (code && enabled && active) {
    codes.add(code);
  }
}

export function extractEnabledModuleCodes(payload: unknown): Set<string> {
  const source = unwrapEnvelope(payload);
  const codes = new Set<string>();

  if (Array.isArray(source)) {
    for (const item of source) {
      addModuleRecord(codes, item);
    }

    return codes;
  }

  if (!isRecord(source)) {
    return codes;
  }

  for (const key of ["modules", "enabled_modules", "enabledModuleCodes", "module_codes"]) {
    const value = source[key];

    if (!Array.isArray(value)) {
      continue;
    }

    for (const item of value) {
      addModuleRecord(codes, item);
    }
  }

  return codes;
}

export function isSchoolModuleEnabledFromPayload(payload: unknown, moduleCode: string): boolean {
  return extractEnabledModuleCodes(payload).has(moduleCode);
}

export function resolveSchoolModuleAccessState(
  payload: unknown,
  moduleCode: string,
): SchoolModuleAccessState {
  if (payload === null || payload === undefined) {
    return {
      enabled: false,
      reason: "module_status_unavailable",
    };
  }

  if (isSchoolModuleEnabledFromPayload(payload, moduleCode)) {
    return { enabled: true };
  }

  return {
    enabled: false,
    reason: "module_disabled",
  };
}

export function getSchoolModuleAccessFailureMessage(state: SchoolModuleAccessState) {
  if (state.enabled) {
    return "";
  }

  return state.reason === "module_status_unavailable"
    ? MODULE_STATUS_UNAVAILABLE_MESSAGE
    : MODULE_NOT_ENABLED_MESSAGE;
}

export function getSchoolModuleAccessFailureStatus(state: SchoolModuleAccessState) {
  if (state.enabled) {
    return 200;
  }

  return state.reason === "module_status_unavailable" ? 503 : 403;
}

export async function checkSchoolModuleAccess(input: {
  tenantId: string | null | undefined;
  accessToken: string | null | undefined;
  moduleCode: string;
}): Promise<SchoolModuleAccessState> {
  if (!input.tenantId || !input.accessToken) {
    return {
      enabled: false,
      reason: "missing_session",
    };
  }

  if (!isDashboardApiConfigured()) {
    return {
      enabled: false,
      reason: "module_status_unavailable",
    };
  }

  try {
    const payload = await requestDashboardApi<unknown>("/school/modules/me", {
      tenantId: input.tenantId,
      accessToken: input.accessToken,
      unwrapEnvelope: false,
    });

    return resolveSchoolModuleAccessState(payload, input.moduleCode);
  } catch {
    return {
      enabled: false,
      reason: "module_status_unavailable",
    };
  }
}
