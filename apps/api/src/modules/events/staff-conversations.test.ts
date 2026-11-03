import assert from "node:assert/strict";
import test from "node:test";
import { StaffConversationsService } from "./staff-conversations";
const actorId = "11111111-1111-4111-8111-111111111111",
  teacherId = "22222222-2222-4222-8222-222222222222",
  otherId = "33333333-3333-4333-8333-333333333333",
  requestId = "44444444-4444-4444-8444-444444444444";
function fixture(role = "principal") {
  let saved: any;
  let member = true;
  let allowed = true;
  const writes: Array<{ sql: string; params: any[] }> = [];
  const events: any[] = [];
  const actor = {
    tenant_id: "school-a",
    user_id: actorId,
    role,
    permissions: ["events:read", "events:write"],
    is_authenticated: true,
  };
  const tx = {
    $queryRawUnsafe: async (sql: string, ...params: any[]) => {
      assert.equal(params[0], "school-a");
      if (sql.includes("FROM tenant_memberships"))
        return member
          ? [
              { id: actorId, name: "Principal", roles: ["principal"] },
              { id: teacherId, name: "Teacher", roles: ["teacher"] },
            ]
          : [];
      if (sql.includes("metadata->>'message_id'=$3"))
        return saved ? [saved] : [];
      if (sql.includes("AS participants"))
        return allowed
          ? [{ title: "Learning support", participants: [actorId, teacherId] }]
          : [];
      return [];
    },
    $executeRawUnsafe: async (sql: string, ...params: any[]) => {
      writes.push({ sql, params });
      if (sql.includes("INSERT INTO notifications"))
        saved = { body: params[5], metadata: JSON.parse(params[7]) };
      return 1;
    },
  };
  const service = new StaffConversationsService(
    { requireStore: () => actor } as never,
    {
      executeWithTenant: async (
        tenant: string,
        user: string,
        run: (value: any) => unknown,
      ) => {
        assert.equal(tenant, "school-a");
        assert.equal(user, actorId);
        return run(tx);
      },
    } as never,
    {
      publish: async (event: unknown, transaction: unknown) => {
        assert.equal(transaction, tx);
        events.push(event);
      },
    } as never,
  );
  return {
    service,
    writes,
    events,
    actor,
    noMembership: () => (member = false),
    denyThread: () => (allowed = false),
  };
}
test("school staff messages create inbox copies and private audit/events atomically; retries do not resend", async () => {
  const f = fixture();
  const command = {
    request_id: requestId,
    subject: "Learning support",
    message: "Please review the learner support plan.",
    recipients: [teacherId],
  };
  const first = await f.service.send(command);
  assert.equal(first.delivered, 1);
  assert.equal(first.deduplicated, false);
  const second = await f.service.send(command);
  assert.equal(second.deduplicated, true);
  assert.equal(
    f.writes.filter((write) => write.sql.includes("INSERT INTO notifications"))
      .length,
    1,
  );
  assert.equal(f.events.length, 1);
  assert.ok(
    !JSON.stringify(f.events).includes(command.message),
    "Message text must not leak into school-wide event history",
  );
  await assert.rejects(
    () => f.service.send({ ...command, message: "Different message" }),
    /already used/,
  );
});
test("cross-school or inactive recipients and unverified staff membership cannot send", async () => {
  const f = fixture();
  await assert.rejects(
    () =>
      f.service.send({
        request_id: requestId,
        subject: "Private",
        message: "Private",
        recipients: [otherId],
      }),
    /Every recipient/,
  );
  assert.equal(f.events.length, 0);
  assert.equal(
    f.writes.filter((write) => write.sql.includes("INSERT")).length,
    0,
  );
  f.noMembership();
  await assert.rejects(() => f.service.list(), /membership/);
});
test("parents and students cannot open or initiate staff conversations even with event capabilities", async () => {
  for (const role of ["parent", "student"])
    await assert.rejects(
      async () => fixture(role).service.list(),
      /staff role/,
    );
});
test("replies and read receipts require a conversation in the signed-in staff inbox", async () => {
  const f = fixture("teacher");
  f.denyThread();
  await assert.rejects(() => f.service.messages(requestId), /not found/);
  await assert.rejects(
    () =>
      f.service.send({
        request_id: otherId,
        thread_id: requestId,
        message: "Reply",
      }),
    /not found/,
  );
  await assert.rejects(() => f.service.read(requestId, [otherId]), /not found/);
  assert.equal(
    f.writes.filter((write) => /INSERT|UPDATE/.test(write.sql)).length,
    0,
  );
});
test("read acknowledgements update only the current recipient and observed message IDs", async () => {
  const f = fixture("teacher");
  await f.service.read(requestId, [otherId]);
  const write = f.writes.find((row) =>
    row.sql.startsWith("UPDATE notifications"),
  )!;
  assert.equal(write.params[0], "school-a");
  assert.equal(write.params[1], actorId);
  assert.equal(write.params[3], requestId);
  assert.deepEqual(write.params[4], [otherId]);
});
