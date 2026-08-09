import type { LiveAuthSession } from "@/lib/dashboard/api-client";
import {
  canReplayAttendanceTask,
  saveAttendanceOffline,
  syncPendingAttendanceTasks,
  type AttendanceReplayContext,
  type OfflineAttendanceTask,
} from "@/lib/modules/attendance-offline";

const STORAGE_KEY = "myshule_offline_attendance_queue";

function context(overrides: Partial<AttendanceReplayContext> = {}): AttendanceReplayContext {
  return {
    tenantId: "school-alpha",
    userId: "teacher-one",
    roleId: "teacher",
    ...overrides,
  };
}

function session(overrides: Partial<AttendanceReplayContext> = {}): LiveAuthSession {
  const owner = context(overrides);
  return {
    tenantId: owner.tenantId,
    user: {
      user_id: owner.userId,
      tenant_id: owner.tenantId,
      role: owner.roleId,
      email: "teacher@example.test",
      display_name: "Teacher One",
      permissions: ["teacher:read", "teacher:write"],
      session_id: "session-one",
    },
  };
}

function task(overrides: Partial<OfflineAttendanceTask> = {}): OfflineAttendanceTask {
  return {
    id: "attendance-one",
    tenantId: "school-alpha",
    userId: "teacher-one",
    roleId: "teacher",
    streamId: "form-one-east",
    records: [{ studentId: "learner-one", status: "present" }],
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("teacher attendance offline role isolation", () => {
  beforeEach(() => localStorage.clear());

  it("allows replay only for the same tenant, authenticated user and active role", () => {
    expect(canReplayAttendanceTask(task(), context())).toBe(true);
    expect(canReplayAttendanceTask(task(), context({ tenantId: "school-beta" }))).toBe(false);
    expect(canReplayAttendanceTask(task(), context({ userId: "teacher-two" }))).toBe(false);
    expect(canReplayAttendanceTask(task(), context({ roleId: "class_teacher" }))).toBe(false);
    expect(canReplayAttendanceTask({ ...task(), roleId: undefined } as unknown as OfflineAttendanceTask, context())).toBe(false);
  });

  it("deduplicates only the current actor and role without overwriting shared-device work", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      task({ id: "other-user", userId: "teacher-two" }),
      task({ id: "other-role", roleId: "class_teacher" }),
      task({ id: "current-old" }),
    ]));

    expect(saveAttendanceOffline(context(), "form-one-east", [
      { studentId: "learner-two", status: "late" },
    ])).toBe(true);

    const queue = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as OfflineAttendanceTask[];
    expect(queue).toHaveLength(3);
    expect(queue.map((item) => item.id)).toEqual(expect.arrayContaining(["other-user", "other-role"]));
    expect(queue.find((item) => item.userId === "teacher-one" && item.roleId === "teacher")?.records)
      .toEqual([{ studentId: "learner-two", status: "late" }]);
  });

  it("replays and removes only records owned by the current active role", async () => {
    const legacyTask = {
      id: "legacy-unowned",
      tenantId: "school-alpha",
      streamId: "form-one-west",
      records: [{ studentId: "learner-legacy", status: "present" }],
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      task(),
      task({ id: "other-user", userId: "teacher-two", streamId: "form-two-east" }),
      task({ id: "other-role", roleId: "class_teacher", streamId: "form-three-east" }),
      legacyTask,
    ]));
    const sender = jest.fn().mockResolvedValue({ success: true });

    await expect(syncPendingAttendanceTasks(session(), sender)).resolves.toEqual({
      synced: 1,
      failed: 0,
      skipped: 3,
    });
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "school-alpha" }),
      "/class-teacher/attendance",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ streamId: "form-one-east" }),
      }),
    );

    const remaining = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Array<{ id: string }>;
    expect(remaining.map((item) => item.id)).toEqual([
      "other-user",
      "other-role",
      "legacy-unowned",
    ]);
  });
});
