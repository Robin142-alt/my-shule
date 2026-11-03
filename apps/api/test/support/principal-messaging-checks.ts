import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { StaffConversationsService } from "../../src/modules/events/staff-conversations";
import { EventPublisherService } from "../../src/modules/events/event-publisher.service";
import { OutboxEventsRepository } from "../../src/modules/events/repositories/outbox-events.repository";

/** Exercise the inbox on the upgraded historical schema as a non-bypass RLS role. */
export async function verifyPrincipalMessaging(
  pool: Pool,
  fixture: { tenantId: string; userId: string },
) {
  const teacher = randomUUID(),
    outsider = randomUUID();
  for (const [id, tenant] of [
    [teacher, fixture.tenantId],
    [outsider, "sidebar-record-school-b"],
  ]) {
    await pool.query(
      "INSERT INTO users (id,full_name,display_name,email,password_hash,status) VALUES ($1,'Fixture staff','Fixture staff',$2,'test-only','active')",
      [id, id + "@example.invalid"],
    );
    const role = await pool.query(
      "INSERT INTO roles (tenant_id,code,name,updated_at) VALUES ($1,'teacher','Teacher',now()) ON CONFLICT (tenant_id,code) DO UPDATE SET name=EXCLUDED.name RETURNING id",
      [tenant],
    );
    await pool.query(
      "INSERT INTO tenant_memberships (tenant_id,user_id,role_id,status) VALUES ($1,$2,$3,'active')",
      [tenant, id, role.rows[0].id],
    );
  }
  const actor = {
    tenant_id: fixture.tenantId,
    user_id: fixture.userId,
    role: "principal",
    is_authenticated: true,
    permissions: ["*:*"],
  };
  const context = { requireStore: () => actor, getStore: () => actor };
  const service = new StaffConversationsService(
    context as never,
    {
      executeWithTenant: async (
        tenant: string,
        user: string,
        run: (tx: any) => Promise<unknown>,
      ) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SET LOCAL ROLE sidebar_read_test");
          await client.query("SET LOCAL row_security = on");
          await client.query(
            "SELECT set_config('app.tenant_id',$1,true),set_config('app.user_id',$2,true)",
            [tenant, user],
          );
          const result = await run({
            $queryRawUnsafe: async (sql: string, ...values: unknown[]) =>
              (await client.query(sql, values)).rows,
            $executeRawUnsafe: async (sql: string, ...values: unknown[]) =>
              (await client.query(sql, values)).rowCount,
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    } as never,
    new EventPublisherService(
      context as never,
      new OutboxEventsRepository({} as never),
    ),
  );
  const request = {
    request_id: randomUUID(),
    subject: "Fixture learning support",
    message: "Please review the lesson.",
    recipients: [teacher],
  };
  const sent = await service.send(request);
  assert.equal(sent.delivered, 1);
  assert.equal((await service.send(request)).deduplicated, true);
  assert.equal((await service.list()).items.length, 1);
  await assert.rejects(
    service.send({ ...request, message: "Changed retry" }),
    /already used/,
  );
  await assert.rejects(
    service.send({
      ...request,
      request_id: randomUUID(),
      recipients: [outsider],
    }),
    /active staff/,
  );
  actor.user_id = teacher;
  actor.role = "teacher";
  const inbox = await service.list();
  assert.equal(inbox.items[0].unread, 1);
  let thread = await service.messages(sent.thread_id);
  assert.equal(thread.items[0].body, request.message);
  assert.equal(thread.participants.length, 2);
  assert.equal(thread.items[0].read_count, 0);
  await service.read(sent.thread_id, [request.request_id]);
  const reply = await service.send({
    request_id: randomUUID(),
    thread_id: sent.thread_id,
    message: "The lesson is ready.",
  });
  actor.user_id = fixture.userId;
  actor.role = "principal";
  thread = await service.messages(sent.thread_id);
  assert.equal(thread.items.length, 2);
  assert.equal(
    thread.items.find((row) => row.id === request.request_id)?.read_count,
    1,
  );
  assert.equal(thread.items.find((row) => row.id === reply.id)?.read_count, 0);
  await service.read(sent.thread_id, [reply.id]);
  assert.equal((await service.list("lesson")).items.length, 1);
  assert.equal((await service.list("unrelated")).items.length, 0);

  // A page boundary containing equal timestamps must neither skip nor repeat a message.
  const ids = Array.from({ length: 52 }, () => randomUUID());
  await pool.query(
    `INSERT INTO notifications(tenant_id,notification_key,recipient_user_id,type,title,body,status,source_module,source_record_id,metadata,created_at)
    SELECT $1,'page-'||id,$2::uuid,'staff.conversation.message','Fixture learning support','Page fixture','read','communication',$3,
      jsonb_build_object('message_id',id,'thread_id',$3::text,'author_id',$2::text,'author_name','Fixture staff'),now()+interval '1 minute'
    FROM unnest($4::text[]) id`,
    [fixture.tenantId, fixture.userId, sent.thread_id, ids],
  );
  const first = await service.messages(sent.thread_id);
  const older = await service.messages(
    sent.thread_id,
    String(first.items[0].id),
  );
  assert.equal(first.items.length, 50);
  assert.equal(older.items.length, 4);
  assert.equal(
    new Set([...first.items, ...older.items].map((row) => row.id)).size,
    54,
  );

  actor.tenant_id = "sidebar-record-school-b";
  actor.user_id = outsider;
  actor.role = "teacher";
  assert.equal((await service.list()).items.length, 0);
  await assert.rejects(service.messages(sent.thread_id), /not found/);
  await assert.rejects(service.read(sent.thread_id, [reply.id]), /not found/);
  await assert.rejects(
    service.send({
      request_id: randomUUID(),
      thread_id: sent.thread_id,
      message: "Foreign reply",
    }),
    /not found/,
  );
  const count = await pool.query(
    "SELECT count(*)::int AS total FROM outbox_events WHERE tenant_id=$1 AND event_key LIKE 'staff.message.sent:%'",
    [fixture.tenantId],
  );
  assert.equal(count.rows[0].total, 2);
  console.log(
    "PASS staff inbox send, reply, read, retry, cursor pagination and cross-school isolation",
  );
}
