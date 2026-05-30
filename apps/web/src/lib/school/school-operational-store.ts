"use client";

import { getCsrfToken } from "@/lib/auth/csrf-client";

export type SchoolOperationalSeverity = "info" | "warning" | "critical" | "success";

export type SchoolOperationalEvent = {
  id: string;
  schoolId: string;
  type: string;
  module: string;
  actorRole: string;
  title: string;
  body: string;
  entityId?: string;
  severity: SchoolOperationalSeverity;
  payload?: Record<string, unknown>;
  createdAt: string;
};

export type SchoolNotification = {
  id: string;
  schoolId: string;
  audienceRoles: string[];
  recipientRole?: string;
  sourceModule: string;
  relatedModule?: string;
  relatedRecordId?: string;
  actionUrl?: string;
  type?: string;
  priority?: SchoolOperationalSeverity;
  title: string;
  body: string;
  severity: SchoolOperationalSeverity;
  read: boolean;
  createdBy?: string;
  createdAt: string;
};

export type SchoolAuditLog = {
  id: string;
  schoolId: string;
  action: string;
  actorRole: string;
  module: string;
  entityId?: string;
  title: string;
  body: string;
  createdAt: string;
};

export type SchoolSmsLog = {
  id: string;
  schoolId: string;
  recipient: string;
  message: string;
  sourceModule: string;
  status: "Queued" | "Sent";
  createdAt: string;
};

export type SchoolOperationalEventSyncStatus = {
  id: string;
  schoolId: string;
  eventId: string;
  endpoint: string;
  status: "Synced" | "Queued" | "Failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishSchoolOperationalEventInput = {
  schoolId?: string | null;
  type: string;
  module: string;
  actorRole: string;
  title: string;
  body: string;
  entityId?: string;
  severity?: SchoolOperationalSeverity;
  payload?: Record<string, unknown>;
  notifications?: Array<{
    audienceRoles: string[];
    title?: string;
    body?: string;
    severity?: SchoolOperationalSeverity;
    recipientRole?: string;
    relatedModule?: string;
    relatedRecordId?: string;
    actionUrl?: string;
    type?: string;
  }>;
  sms?: Array<{
    recipient: string;
    message: string;
  }>;
};

type BackendOperationalEventSyncPayload = {
  schoolId: string;
  event: SchoolOperationalEvent;
  notifications: SchoolNotification[];
  sms: SchoolSmsLog[];
};

const DEFAULT_SCHOOL_ID = "kb-high";
const UPDATE_EVENT_NAME = "myshule:school-data-updated";

function nowIso() {
  return new Date().toISOString();
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Backend event sync failed.";
}

export function getCurrentSchoolId(explicitSchoolId?: string | null) {
  const normalizedExplicit = explicitSchoolId?.trim();

  if (normalizedExplicit) {
    return normalizedExplicit;
  }

  if (typeof window === "undefined") {
    return DEFAULT_SCHOOL_ID;
  }

  try {
    return window.localStorage.getItem("myshule.currentSchoolId") || DEFAULT_SCHOOL_ID;
  } catch {
    return DEFAULT_SCHOOL_ID;
  }
}

export function getSchoolScopedStorageKey(schoolId: string, moduleName: string) {
  return `myshule:${schoolId}:${moduleName}`;
}

function emitSchoolDataUpdated(schoolId: string, moduleName: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(UPDATE_EVENT_NAME, { detail: { schoolId, moduleName } }));
}

export function subscribeToSchoolDataUpdates(
  listener: (detail: { schoolId: string; moduleName: string }) => void,
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<{ schoolId: string; moduleName: string }>).detail;

    if (detail) {
      listener(detail);
    }
  };

  window.addEventListener(UPDATE_EVENT_NAME, handler);
  return () => window.removeEventListener(UPDATE_EVENT_NAME, handler);
}

export function readSchoolData<T extends object>(
  moduleName: string,
  schoolId = getCurrentSchoolId(),
): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(getSchoolScopedStorageKey(schoolId, moduleName));
    const parsed = stored ? (JSON.parse(stored) as T[]) : [];

    return Array.isArray(parsed)
      ? parsed.filter((record) => {
          const scopedRecord = record as T & { schoolId?: string };
          return !scopedRecord.schoolId || scopedRecord.schoolId === schoolId;
        })
      : [];
  } catch {
    return [];
  }
}

export function writeSchoolData<T extends object>(
  moduleName: string,
  records: T[],
  schoolId = getCurrentSchoolId(),
) {
  if (typeof window === "undefined") {
    return records;
  }

  const scopedRecords = records.map((record) => ({ ...record, schoolId }));
  window.localStorage.setItem(getSchoolScopedStorageKey(schoolId, moduleName), JSON.stringify(scopedRecords));
  emitSchoolDataUpdated(schoolId, moduleName);
  return scopedRecords;
}

export function addSchoolRecord<T extends object>(
  moduleName: string,
  record: T,
  schoolId = getCurrentSchoolId(),
) {
  const current = readSchoolData<T & { schoolId?: string }>(moduleName, schoolId);
  const scopedRecord = { ...record, schoolId };

  writeSchoolData(moduleName, [scopedRecord, ...current], schoolId);
  return scopedRecord;
}

export function updateSchoolRecord<T extends { id: string; schoolId?: string }>(
  moduleName: string,
  recordId: string,
  updates: Record<string, unknown>,
  schoolId = getCurrentSchoolId(),
) {
  const current = readSchoolData<T>(moduleName, schoolId);
  const next = current.map((record) => (record.id === recordId ? { ...record, ...updates, schoolId } : record));

  writeSchoolData(moduleName, next, schoolId);
  return next;
}

function upsertEventSyncStatus(status: SchoolOperationalEventSyncStatus) {
  const current = readSchoolData<SchoolOperationalEventSyncStatus>("eventSyncStatus", status.schoolId);
  const next = current.some((record) => record.eventId === status.eventId)
    ? current.map((record) => (record.eventId === status.eventId ? status : record))
    : [status, ...current];

  writeSchoolData("eventSyncStatus", next, status.schoolId);
  return status;
}

function queueBackendEventSync(payload: BackendOperationalEventSyncPayload, error: unknown) {
  addSchoolRecord(
    "eventSyncQueue",
    {
      id: uniqueId("event-sync-queue"),
      schoolId: payload.schoolId,
      eventId: payload.event.id,
      endpoint: "/api/events/school-operations",
      status: "Queued",
      error: normalizeErrorMessage(error),
      payload,
      createdAt: nowIso(),
    },
    payload.schoolId,
  );
  upsertEventSyncStatus({
    id: `event-sync-status-${payload.event.id}`,
    schoolId: payload.schoolId,
    eventId: payload.event.id,
    endpoint: "/api/events/school-operations",
    status: "Queued",
    error: normalizeErrorMessage(error),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

async function syncSchoolOperationalEventToBackend(payload: BackendOperationalEventSyncPayload) {
  if (typeof window === "undefined" || typeof globalThis.fetch === "undefined") {
    return;
  }

  const endpoint = "/api/events/school-operations";

  try {
    const csrfToken = await getCsrfToken();
    const response = await globalThis.fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-myshule-csrf": csrfToken,
      },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(body?.message ?? `Backend event sync failed with ${response.status}`);
    }

    upsertEventSyncStatus({
      id: `event-sync-status-${payload.event.id}`,
      schoolId: payload.schoolId,
      eventId: payload.event.id,
      endpoint,
      status: "Synced",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  } catch (error) {
    queueBackendEventSync(payload, error);
  }
}

export function createNotification(
  input: Omit<SchoolNotification, "id" | "schoolId" | "read" | "createdAt"> & { schoolId?: string | null },
) {
  const schoolId = getCurrentSchoolId(input.schoolId);

  return addSchoolRecord<SchoolNotification>(
    "notifications",
    {
      id: uniqueId("notification"),
      schoolId,
      audienceRoles: input.audienceRoles,
      recipientRole: input.recipientRole,
      sourceModule: input.sourceModule,
      relatedModule: input.relatedModule,
      relatedRecordId: input.relatedRecordId,
      actionUrl: input.actionUrl,
      type: input.type,
      priority: input.priority,
      title: input.title,
      body: input.body,
      severity: input.severity,
      read: false,
      createdBy: input.createdBy,
      createdAt: nowIso(),
    },
    schoolId,
  );
}

export function createAuditLog(
  input: Omit<SchoolAuditLog, "id" | "schoolId" | "createdAt"> & { schoolId?: string | null },
) {
  const schoolId = getCurrentSchoolId(input.schoolId);

  return addSchoolRecord<SchoolAuditLog>(
    "auditLogs",
    {
      id: uniqueId("audit"),
      schoolId,
      action: input.action,
      actorRole: input.actorRole,
      module: input.module,
      entityId: input.entityId,
      title: input.title,
      body: input.body,
      createdAt: nowIso(),
    },
    schoolId,
  );
}

export function simulateSms(input: Omit<SchoolSmsLog, "id" | "schoolId" | "status" | "createdAt"> & { schoolId?: string | null }) {
  const schoolId = getCurrentSchoolId(input.schoolId);

  return addSchoolRecord<SchoolSmsLog>(
    "smsLogs",
    {
      id: uniqueId("sms"),
      schoolId,
      recipient: input.recipient,
      message: input.message,
      sourceModule: input.sourceModule,
      status: "Sent",
      createdAt: nowIso(),
    },
    schoolId,
  );
}

export function publishSchoolOperationalEvent(input: PublishSchoolOperationalEventInput) {
  const schoolId = getCurrentSchoolId(input.schoolId);
  const severity = input.severity ?? "info";
  const createdSmsLogs: SchoolSmsLog[] = [];
  const createdNotifications: SchoolNotification[] = [];
  const event = addSchoolRecord<SchoolOperationalEvent>(
    "events",
    {
      id: uniqueId("event"),
      schoolId,
      type: input.type,
      module: input.module,
      actorRole: input.actorRole,
      title: input.title,
      body: input.body,
      entityId: input.entityId,
      severity,
      payload: input.payload,
      createdAt: nowIso(),
    },
    schoolId,
  );

  createAuditLog({
    schoolId,
    action: input.type,
    actorRole: input.actorRole,
    module: input.module,
    entityId: input.entityId,
    title: input.title,
    body: input.body,
  });

  input.notifications?.forEach((notification) => {
    const relatedModule = notification.relatedModule ?? input.module;
    const relatedRecordId = notification.relatedRecordId ?? input.entityId;
    const actionUrl =
      notification.actionUrl
      ?? (relatedRecordId ? `/${relatedModule}?record=${encodeURIComponent(relatedRecordId)}` : `/${relatedModule}`);

    const createdNotification = createNotification({
      schoolId,
      audienceRoles: notification.audienceRoles,
      recipientRole: notification.recipientRole,
      sourceModule: input.module,
      relatedModule,
      relatedRecordId,
      actionUrl,
      type: notification.type ?? input.type,
      priority: notification.severity ?? severity,
      title: notification.title ?? input.title,
      body: notification.body ?? input.body,
      severity: notification.severity ?? severity,
      createdBy: input.actorRole,
    });
    createdNotifications.push(createdNotification);
  });

  input.sms?.forEach((sms) => {
    const createdSmsLog = simulateSms({
      schoolId,
      recipient: sms.recipient,
      message: sms.message,
      sourceModule: input.module,
    });
    createdSmsLogs.push(createdSmsLog);
  });

  void syncSchoolOperationalEventToBackend({
    schoolId,
    event,
    notifications: createdNotifications,
    sms: createdSmsLogs,
  });

  return event;
}

export function mergeSchoolRecordsById<T extends { id: string }>(baseRecords: T[], storedRecords: T[]) {
  const byId = new Map<string, T>();

  [...storedRecords, ...baseRecords].forEach((record) => {
    byId.set(record.id, { ...byId.get(record.id), ...record });
  });

  return Array.from(byId.values());
}
