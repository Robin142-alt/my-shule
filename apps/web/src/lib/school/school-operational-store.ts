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
  requiresAction?: boolean;
  requestStatus?: SchoolOperationalRequestStatus;
  statusDetail?: string;
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

export type SchoolOperationalRequestStatus =
  | "Pending"
  | "Sent"
  | "Approved"
  | "Rejected"
  | "Completed"
  | "Issued"
  | "Returned"
  | "Failed"
  | "Cancelled";

export type SchoolOperationalRequest = {
  id: string;
  schoolId: string;
  sourceModule: string;
  targetModule: string;
  relatedRecordId: string;
  actionType: string;
  title: string;
  body: string;
  originRole: string;
  targetRoles: string[];
  status: SchoolOperationalRequestStatus;
  statusDetail: string;
  lastActorRole: string;
  actionUrl: string;
  payload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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

type SchoolOperationalEventSyncQueueRecord = {
  id: string;
  schoolId: string;
  eventId: string;
  endpoint: string;
  status: "Queued";
  error: string;
  payload: BackendOperationalEventSyncPayload;
  createdAt: string;
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
    requiresAction?: boolean;
    requestStatus?: SchoolOperationalRequestStatus;
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

function stableKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
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

function normalizeOperationalRequestStatus(
  value: unknown,
  fallback: SchoolOperationalRequestStatus,
): SchoolOperationalRequestStatus {
  if (
    value === "Pending"
    || value === "Sent"
    || value === "Approved"
    || value === "Rejected"
    || value === "Completed"
    || value === "Issued"
    || value === "Returned"
    || value === "Failed"
    || value === "Cancelled"
  ) {
    return value;
  }

  return fallback;
}

function inferOperationalRequestStatus(
  eventType: string,
  severity: SchoolOperationalSeverity,
): SchoolOperationalRequestStatus {
  const normalized = eventType.toLowerCase();

  if (/reject|revoke|cancel/.test(normalized)) return "Rejected";
  if (/approve|accepted/.test(normalized)) return "Approved";
  if (/issue|dispense|release/.test(normalized)) return "Issued";
  if (/return/.test(normalized)) return "Returned";
  if (/complete|resolved|sent|printed|confirmed|recorded|saved/.test(normalized)) return "Completed";
  if (/failed|error/.test(normalized) || severity === "critical") return "Failed";

  return severity === "success" ? "Completed" : "Pending";
}

function shouldCreateOperationalRequest(input: {
  type: string;
  title: string;
  severity: SchoolOperationalSeverity;
  notification: { requiresAction?: boolean; title?: string; body?: string; relatedRecordId?: string };
}) {
  if (input.notification.requiresAction === false) {
    return false;
  }

  if (input.notification.requiresAction === true) {
    return true;
  }

  const searchable = `${input.type} ${input.title} ${input.notification.title ?? ""} ${input.notification.body ?? ""}`.toLowerCase();

  return /request|approval|approve|reject|escalat|assign|issue|return|referral|alert|missing|failed|pending|follow-up|follow up|confirm|verify|resolve/.test(searchable);
}

export function upsertSchoolOperationalRequest(
  input: Omit<SchoolOperationalRequest, "id" | "schoolId" | "createdAt" | "updatedAt"> & {
    id?: string;
    schoolId?: string | null;
    createdAt?: string;
  },
) {
  const schoolId = getCurrentSchoolId(input.schoolId);
  const now = nowIso();
  const targetRoles = Array.from(new Set(input.targetRoles.filter(Boolean)));
  const id =
    input.id
    ?? `request-${stableKey(`${input.sourceModule}-${input.relatedRecordId}-${targetRoles.join("-")}`)}`;
  const current = readSchoolData<SchoolOperationalRequest>("operationalRequests", schoolId);
  const existing = current.find((request) => request.id === id);
  const nextRequest: SchoolOperationalRequest = {
    ...existing,
    id,
    schoolId,
    sourceModule: input.sourceModule,
    targetModule: input.targetModule,
    relatedRecordId: input.relatedRecordId,
    actionType: input.actionType,
    title: input.title,
    body: input.body,
    originRole: input.originRole,
    targetRoles,
    status: input.status,
    statusDetail: input.statusDetail,
    lastActorRole: input.lastActorRole,
    actionUrl: input.actionUrl,
    payload: input.payload,
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };
  const nextRecords = [
    nextRequest,
    ...current.filter((request) => request.id !== id),
  ].slice(0, 200);

  writeSchoolData("operationalRequests", nextRecords, schoolId);
  return nextRequest;
}

export function updateSchoolOperationalRequestStatus(
  input: {
    id?: string;
    relatedRecordId?: string;
    sourceModule?: string;
    status: SchoolOperationalRequestStatus;
    statusDetail: string;
    actorRole: string;
    schoolId?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  const schoolId = getCurrentSchoolId(input.schoolId);
  const current = readSchoolData<SchoolOperationalRequest>("operationalRequests", schoolId);
  const updatedRequests: SchoolOperationalRequest[] = [];
  const next = current.map((request) => {
    const idMatches = input.id && request.id === input.id;
    const relatedMatches =
      input.relatedRecordId
      && request.relatedRecordId === input.relatedRecordId
      && (!input.sourceModule || request.sourceModule === input.sourceModule);

    if (!idMatches && !relatedMatches) {
      return request;
    }

    const updatedRequest = {
      ...request,
      status: input.status,
      statusDetail: input.statusDetail,
      lastActorRole: input.actorRole,
      payload: input.payload ? { ...request.payload, ...input.payload } : request.payload,
      updatedAt: nowIso(),
    };

    updatedRequests.push(updatedRequest);
    return updatedRequest;
  });

  writeSchoolData("operationalRequests", next, schoolId);
  updatedRequests.forEach((request) => {
    const reflectionRoles =
      request.originRole && request.originRole !== input.actorRole
        ? [request.originRole]
        : request.targetRoles.filter((role) => role !== input.actorRole);

    if (!reflectionRoles.length) {
      return;
    }

    createNotification({
      schoolId,
      audienceRoles: Array.from(new Set(reflectionRoles)),
      sourceModule: request.sourceModule,
      relatedModule: request.targetModule,
      relatedRecordId: request.relatedRecordId,
      actionUrl: request.actionUrl,
      type: `${request.actionType}_${input.status.toUpperCase()}`,
      priority: input.status === "Rejected" || input.status === "Failed" ? "warning" : "success",
      requiresAction: false,
      requestStatus: input.status,
      statusDetail: input.statusDetail,
      title: `${request.title}: ${input.status}`,
      body: input.statusDetail,
      severity: input.status === "Rejected" || input.status === "Failed" ? "warning" : "success",
      createdBy: input.actorRole,
    });
    createAuditLog({
      schoolId,
      action: `${request.actionType}_${input.status.toUpperCase()}`,
      actorRole: input.actorRole,
      module: request.sourceModule,
      entityId: request.relatedRecordId,
      title: `${request.title}: ${input.status}`,
      body: input.statusDetail,
    });
  });
  return next;
}

export function listSchoolOperationalRequestsForRole(
  role: string,
  schoolId = getCurrentSchoolId(),
) {
  return readSchoolData<SchoolOperationalRequest>("operationalRequests", schoolId)
    .filter((request) => request.originRole === role || request.targetRoles.includes(role))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
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
  const currentQueue = readSchoolData<SchoolOperationalEventSyncQueueRecord>("eventSyncQueue", payload.schoolId);
  const queuedRecord: SchoolOperationalEventSyncQueueRecord = {
    id: currentQueue.find((record) => record.eventId === payload.event.id)?.id ?? uniqueId("event-sync-queue"),
    schoolId: payload.schoolId,
    eventId: payload.event.id,
    endpoint: "/api/events/school-operations",
    status: "Queued",
    error: normalizeErrorMessage(error),
    payload,
    createdAt: currentQueue.find((record) => record.eventId === payload.event.id)?.createdAt ?? nowIso(),
  };
  const nextQueue = currentQueue.some((record) => record.eventId === payload.event.id)
    ? currentQueue.map((record) => (record.eventId === payload.event.id ? queuedRecord : record))
    : [queuedRecord, ...currentQueue];

  writeSchoolData("eventSyncQueue", nextQueue, payload.schoolId);
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

async function postBackendOperationalEvent(payload: BackendOperationalEventSyncPayload) {
  const endpoint = "/api/events/school-operations";
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
}

function removeQueuedBackendEventSync(schoolId: string, eventId: string) {
  const currentQueue = readSchoolData<SchoolOperationalEventSyncQueueRecord>("eventSyncQueue", schoolId);
  writeSchoolData(
    "eventSyncQueue",
    currentQueue.filter((record) => record.eventId !== eventId),
    schoolId,
  );
}

export async function retrySchoolOperationalEventSyncQueue(schoolId = getCurrentSchoolId()) {
  if (typeof window === "undefined" || typeof globalThis.fetch === "undefined") {
    return { attempted: 0, synced: 0, failed: 0 };
  }

  const queue = readSchoolData<SchoolOperationalEventSyncQueueRecord>("eventSyncQueue", schoolId);
  let synced = 0;
  let failed = 0;

  for (const record of queue) {
    try {
      await postBackendOperationalEvent(record.payload);
      removeQueuedBackendEventSync(schoolId, record.eventId);
      synced += 1;
    } catch (error) {
      failed += 1;
      queueBackendEventSync(record.payload, error);
    }
  }

  return { attempted: queue.length, synced, failed };
}

export function startSchoolOperationalEventSyncRetryWorker(
  schoolId = getCurrentSchoolId(),
  options: { intervalMs?: number } = {},
) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const intervalMs = Math.max(1000, options.intervalMs ?? 30000);
  let running = false;

  const retryQueuedEvents = () => {
    if (running) {
      return;
    }

    running = true;
    void retrySchoolOperationalEventSyncQueue(schoolId).finally(() => {
      running = false;
    });
  };

  const timer = window.setInterval(retryQueuedEvents, intervalMs);
  window.addEventListener("online", retryQueuedEvents);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener("online", retryQueuedEvents);
  };
}

async function syncSchoolOperationalEventToBackend(payload: BackendOperationalEventSyncPayload) {
  if (typeof window === "undefined" || typeof globalThis.fetch === "undefined") {
    return;
  }

  try {
    await postBackendOperationalEvent(payload);
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
      requiresAction: input.requiresAction,
      requestStatus: input.requestStatus,
      statusDetail: input.statusDetail,
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
    const fallbackRequestStatus = inferOperationalRequestStatus(input.type, notification.severity ?? severity);
    const requestStatus = normalizeOperationalRequestStatus(notification.requestStatus, fallbackRequestStatus);

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
      requiresAction: notification.requiresAction,
      requestStatus,
      statusDetail: `${input.actorRole} ${requestStatus.toLowerCase()} ${notification.title ?? input.title}`,
      title: notification.title ?? input.title,
      body: notification.body ?? input.body,
      severity: notification.severity ?? severity,
      createdBy: input.actorRole,
    });
    createdNotifications.push(createdNotification);

    if (shouldCreateOperationalRequest({
      type: input.type,
      title: input.title,
      severity: notification.severity ?? severity,
      notification,
    })) {
      const request = upsertSchoolOperationalRequest({
        schoolId,
        sourceModule: input.module,
        targetModule: relatedModule,
        relatedRecordId: relatedRecordId ?? input.entityId ?? event.id,
        actionType: notification.type ?? input.type,
        title: notification.title ?? input.title,
        body: notification.body ?? input.body,
        originRole: input.actorRole,
        targetRoles: notification.audienceRoles,
        status: requestStatus,
        statusDetail: `${input.actorRole} ${requestStatus.toLowerCase()} ${notification.title ?? input.title}`,
        lastActorRole: input.actorRole,
        actionUrl,
        payload: {
          ...input.payload,
          sourceEventId: event.id,
          notificationId: createdNotification.id,
        },
      });
      createdNotification.relatedRecordId = createdNotification.relatedRecordId ?? request.relatedRecordId;
    }
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
