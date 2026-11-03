import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Injectable,
  NotFoundException,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { SCHOOL_STAFF_ROLE_CODES } from "../../auth/auth.constants";
import { Permissions } from "../../auth/decorators/permissions.decorator";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { PrismaService } from "../../database/prisma.service";
import { EventPublisherService } from "./event-publisher.service";
import { createHash } from "node:crypto";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPE = "staff.conversation.message";
type Staff = { id: string; name: string; roles: string[] };
type MessageInput = {
  request_id?: unknown;
  thread_id?: unknown;
  subject?: unknown;
  message?: unknown;
  audience?: unknown;
  recipients?: unknown;
};
const STAFF_SQL = `SELECT member.user_id::text AS id,COALESCE(NULLIF(profile.display_name,''),NULLIF(person.display_name,''),'School staff') AS name,
  array_agg(DISTINCT role.code) AS roles FROM tenant_memberships member
  JOIN roles role ON role.tenant_id=member.tenant_id AND role.id=member.role_id
  LEFT JOIN staff_profiles profile ON profile.tenant_id=member.tenant_id AND profile.user_id=member.user_id
  LEFT JOIN users person ON person.id=member.user_id
  WHERE member.tenant_id=$1 AND lower(member.status::text)='active' AND COALESCE(profile.status,'active') IN ('active','reactivated')
    AND (person.id IS NULL OR person.status='active') AND role.code=ANY($2::text[])
  GROUP BY member.user_id,profile.display_name,person.display_name`;

/** Conversations live in the existing per-recipient notification inbox. Each
 * recipient's own read_at is the receipt; no parallel messaging store is created. */
@Injectable()
export class StaffConversationsService {
  constructor(
    private readonly context: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly events: EventPublisherService,
  ) {}

  private actor(write = false) {
    const actor = this.context.requireStore();
    if (!actor.is_authenticated || !actor.tenant_id || !actor.user_id)
      throw new UnauthorizedException("A verified school session is required");
    if (
      !(SCHOOL_STAFF_ROLE_CODES as readonly string[]).includes(actor.role ?? "")
    )
      throw new ForbiddenException(
        "Staff conversations require an active school staff role",
      );
    const required = write ? "events:write" : "events:read";
    if (
      !actor.permissions.some(
        (value) =>
          value === required || value === "events:*" || value === "*:*",
      )
    )
      throw new ForbiddenException("Staff inbox permission is required");
    return { ...actor, tenant_id: actor.tenant_id, user_id: actor.user_id };
  }
  private async scoped<T>(
    write: boolean,
    run: (
      tx: Prisma.TransactionClient,
      actor: ReturnType<StaffConversationsService["actor"]>,
      staff: Staff[],
    ) => Promise<T>,
  ) {
    const actor = this.actor(write);
    return this.prisma.executeWithTenant(
      actor.tenant_id,
      actor.user_id,
      async (tx) => {
        const staff = await tx.$queryRawUnsafe<Staff[]>(
          STAFF_SQL,
          actor.tenant_id,
          [...SCHOOL_STAFF_ROLE_CODES],
        );
        if (!staff.some((person) => person.id === actor.user_id))
          throw new ForbiddenException("Active staff membership is required");
        return run(tx, actor, staff);
      },
    );
  }
  recipients(search = "") {
    return this.scoped(false, async (_tx, actor, staff) => ({
      items: staff
        .filter(
          (person) =>
            person.id !== actor.user_id &&
            `${person.name} ${person.roles.join(" ")}`
              .toLowerCase()
              .includes(search.trim().toLowerCase().slice(0, 100)),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 200),
    }));
  }
  list(search = "", offset = 0) {
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 10000)
      throw new BadRequestException("Invalid conversation page");
    return this.scoped(false, async (tx, actor) => {
      const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT n.metadata->>'thread_id' AS id,
        MAX(n.title) AS subject,MAX(n.created_at)::text AS updated_at,
        COUNT(*) FILTER(WHERE n.read_at IS NULL AND n.metadata->>'author_id'<>$2)::int AS unread,
        (array_agg(n.body ORDER BY n.created_at DESC,n.id DESC))[1] AS last_message,
        (array_agg(n.metadata->>'author_name' ORDER BY n.created_at DESC,n.id DESC))[1] AS last_author
        FROM notifications n WHERE n.tenant_id=$1 AND n.recipient_user_id::text=$2 AND n.type=$3
        AND ($4='' OR EXISTS(SELECT 1 FROM notifications matched WHERE matched.tenant_id=n.tenant_id
          AND matched.recipient_user_id::text=$2 AND matched.type=$3 AND matched.source_record_id=n.source_record_id
          AND (matched.title ILIKE '%'||$4||'%' OR matched.body ILIKE '%'||$4||'%' OR matched.metadata->>'author_name' ILIKE '%'||$4||'%')))
        GROUP BY n.metadata->>'thread_id' ORDER BY MAX(n.created_at) DESC,n.metadata->>'thread_id' LIMIT 26 OFFSET $5`,
        actor.tenant_id,
        actor.user_id,
        TYPE,
        search.trim().slice(0, 200),
        offset,
      );
      return { items: rows.slice(0, 25), has_more: rows.length > 25, offset };
    });
  }
  private async thread(
    tx: Prisma.TransactionClient,
    tenant: string,
    user: string,
    id: string,
  ) {
    if (!UUID.test(id))
      throw new BadRequestException("Invalid conversation reference");
    const rows = await tx.$queryRawUnsafe<
      Array<{ title: string; participants: string[] }>
    >(
      `SELECT title,
      ARRAY(SELECT original.recipient_user_id::text FROM notifications original
        WHERE original.tenant_id=$1 AND original.type=$3 AND original.source_record_id=$4 AND original.metadata->>'message_id'=$4) AS participants
      FROM notifications
      WHERE tenant_id=$1 AND recipient_user_id::text=$2 AND type=$3 AND source_record_id=$4
      ORDER BY created_at,id LIMIT 1`,
      tenant,
      user,
      TYPE,
      id,
    );
    if (!rows[0])
      throw new NotFoundException(
        "Conversation was not found in your school inbox",
      );
    return rows[0];
  }
  messages(id: string, before?: string) {
    if (before && !UUID.test(before))
      throw new BadRequestException("Invalid message cursor");
    return this.scoped(false, async (tx, actor, staff) => {
      const thread = await this.thread(tx, actor.tenant_id, actor.user_id, id);
      const rows = await tx.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT n.metadata->>'message_id' AS id,n.body,
        n.metadata->>'author_id' AS author_id,n.metadata->>'author_name' AS author_name,n.created_at::text,n.read_at::text,
        (SELECT COUNT(*)::int FROM notifications receipt WHERE receipt.tenant_id=n.tenant_id AND receipt.type=$3
          AND receipt.metadata->>'message_id'=n.metadata->>'message_id' AND receipt.recipient_user_id::text<>n.metadata->>'author_id') AS delivered,
        (SELECT COUNT(*)::int FROM notifications receipt WHERE receipt.tenant_id=n.tenant_id AND receipt.type=$3
          AND receipt.metadata->>'message_id'=n.metadata->>'message_id' AND receipt.recipient_user_id::text<>n.metadata->>'author_id'
          AND receipt.read_at IS NOT NULL) AS read_count
        FROM notifications n WHERE n.tenant_id=$1 AND n.recipient_user_id::text=$2 AND n.type=$3 AND n.source_record_id=$4
          AND ($5::text IS NULL OR (n.created_at,n.id)<(
            SELECT cursor.created_at,cursor.id FROM notifications cursor
            WHERE cursor.tenant_id=$1 AND cursor.recipient_user_id::text=$2 AND cursor.type=$3
              AND cursor.source_record_id=$4 AND cursor.metadata->>'message_id'=$5 LIMIT 1))
        ORDER BY n.created_at DESC,n.id DESC LIMIT 51`,
        actor.tenant_id,
        actor.user_id,
        TYPE,
        id,
        before || null,
      );
      return {
        id,
        subject: thread.title,
        user_id: actor.user_id,
        participants: thread.participants.map(
          (userId) =>
            staff.find((person) => person.id === userId) ?? {
              id: userId,
              name: "Former staff member",
              roles: [],
            },
        ),
        items: rows.slice(0, 50).reverse(),
        has_older: rows.length > 50,
      };
    });
  }
  send(input: MessageInput) {
    if (!input || typeof input !== "object") throw new BadRequestException("A message is required");
    const id = typeof input.request_id === "string" ? input.request_id : "";
    const body = typeof input.message === "string" ? input.message.trim() : "";
    const subject =
      typeof input.subject === "string" ? input.subject.trim() : "";
    const threadId = typeof input.thread_id === "string" ? input.thread_id : id;
    if (!UUID.test(id) || !UUID.test(threadId))
      throw new BadRequestException(
        "A valid message request reference is required",
      );
    if (!body || body.length > 8000)
      throw new BadRequestException(
        "Enter a message of up to 8,000 characters",
      );
    if (!input.thread_id && (!subject || subject.length > 160))
      throw new BadRequestException("Enter a subject of up to 160 characters");
    const checksum = createHash("sha256")
      .update(
        JSON.stringify({
          threadId,
          body,
          subject,
          audience: input.audience ?? null,
          recipients: Array.isArray(input.recipients)
            ? [...input.recipients].sort()
            : null,
        }),
      )
      .digest("hex");
    return this.scoped(true, async (tx, actor, staff) => {
      // Serialize retries of the same command before looking for its receipt.
      await tx.$executeRawUnsafe(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        `${actor.tenant_id}:${id}`,
      );
      const existing = await tx.$queryRawUnsafe<
        Array<{
          body: string;
          metadata: {
            thread_id: string;
            author_id: string;
            command_checksum: string;
          };
        }>
      >(
        `SELECT body,metadata FROM notifications
        WHERE tenant_id=$1 AND type=$2 AND metadata->>'message_id'=$3 LIMIT 1`,
        actor.tenant_id,
        TYPE,
        id,
      );
      if (existing[0]) {
        if (
          existing[0].metadata.command_checksum !== checksum ||
          existing[0].metadata.author_id !== actor.user_id
        )
          throw new ConflictException(
            "This message request was already used. Refresh before sending a different message.",
          );
        return { id, thread_id: threadId, deduplicated: true };
      }
      let participants: string[],
        title = subject;
      if (input.thread_id) {
        const thread = await this.thread(
          tx,
          actor.tenant_id,
          actor.user_id,
          threadId,
        );
        participants = thread.participants;
        title = thread.title;
      } else if (input.audience === "all_staff")
        participants = staff.map((person) => person.id);
      else {
        if (
          !Array.isArray(input.recipients) ||
          !input.recipients.length ||
          input.recipients.length > 200 ||
          input.recipients.some(
            (value) => typeof value !== "string" || !UUID.test(value),
          )
        )
          throw new BadRequestException("Choose at least one staff recipient");
        participants = [
          ...new Set([actor.user_id, ...(input.recipients as string[])]),
        ];
        if (
          participants.some(
            (user) => !staff.some((person) => person.id === user),
          )
        )
          throw new ForbiddenException(
            "Every recipient must be active staff in this school",
          );
      }
      const active = participants.filter((user) =>
        staff.some((person) => person.id === user),
      );

      if (active.length < 2)
        throw new BadRequestException(
          "No other active staff are available in this conversation",
        );
      const metadata = {
        thread_id: threadId,
        message_id: id,
        author_id: actor.user_id,
        author_name: staff.find((person) => person.id === actor.user_id)!.name,
        channel: "IN_APP",
        command_checksum: checksum,
      };
      await tx.$executeRawUnsafe(
        `INSERT INTO notifications(tenant_id,notification_key,recipient_user_id,type,title,body,status,source_module,source_record_id,metadata,read_at)
        SELECT $1,'staff-message-'||$3||'-'||recipient,recipient::uuid,$4,$5,$6,CASE WHEN recipient=$2 THEN 'read' ELSE 'unread' END,
          'communication',$7,$8::jsonb,CASE WHEN recipient=$2 THEN now() ELSE NULL END FROM unnest($9::text[]) recipient
        ON CONFLICT(tenant_id,notification_key) DO NOTHING`,
        actor.tenant_id,
        actor.user_id,
        id,
        TYPE,
        title,
        body,
        threadId,
        JSON.stringify(metadata),
        active,
      );
      await tx.$executeRawUnsafe(
        `INSERT INTO audit_logs(tenant_id,actor_user_id,action,resource_type,resource_id,metadata)
        VALUES($1,$2::uuid,'staff.message.sent','staff_conversation',$3::uuid,$4::jsonb)`,
        actor.tenant_id,
        actor.user_id,
        threadId,
        JSON.stringify({ message_id: id, recipient_count: active.length - 1 }),
      );
      await this.events.publish(
        {
          event_key: `staff.message.sent:${id}`,
          event_name: "school.operation.recorded",
          aggregate_type: "staff_conversation",
          aggregate_id: threadId,
          payload: {
            tenant_id: actor.tenant_id,
            school_id: actor.tenant_id,
            operation_id: id,
            operation_type: "staff.message.sent",
            module: "communication",
            actor_role: actor.role!,
            title: "Staff message sent",
            body: "A message was saved to its recipients’ school inboxes.",
            entity_id: threadId,
            severity: "info",
            target_roles: [],
            target_user_ids: active,
            notifications: [],
            sms: [],
            payload: { message_id: id, recipient_count: active.length - 1 },
            occurred_at: new Date().toISOString(),
          },
        },
        tx,
      );
      return {
        id,
        thread_id: threadId,
        delivered: active.length - 1,
        deduplicated: false,
      };
    });
  }
  read(id: string, messageIds: unknown) {
    if (
      !Array.isArray(messageIds) ||
      messageIds.length > 50 ||
      messageIds.some((value) => typeof value !== "string" || !UUID.test(value))
    )
      throw new BadRequestException("Invalid message receipt list");
    return this.scoped(true, async (tx, actor) => {
      await this.thread(tx, actor.tenant_id, actor.user_id, id);
      await tx.$executeRawUnsafe(
        `UPDATE notifications SET read_at=COALESCE(read_at,now()),status='read',updated_at=now()
        WHERE tenant_id=$1 AND recipient_user_id::text=$2 AND type=$3 AND source_record_id=$4
          AND metadata->>'message_id'=ANY($5::text[])`,
        actor.tenant_id,
        actor.user_id,
        TYPE,
        id,
        messageIds,
      );
      return { success: true };
    });
  }
}

@Controller("workflow/inbox/staff")
export class StaffConversationsController {
  constructor(private readonly service: StaffConversationsService) {}
  @Get("recipients")
  @Permissions("events:read")
  @Header("Cache-Control", "private, no-store")
  recipients(@Query("q") q?: string) {
    return this.service.recipients(q);
  }
  @Get("conversations")
  @Permissions("events:read")
  @Header("Cache-Control", "private, no-store")
  list(@Query("q") q?: string, @Query("offset") offset?: string) {
    return this.service.list(q, Number(offset ?? 0));
  }
  @Get("conversations/:id")
  @Permissions("events:read")
  @Header("Cache-Control", "private, no-store")
  messages(@Param("id") id: string, @Query("before") before?: string) {
    return this.service.messages(id, before);
  }
  @Post("messages")
  @Permissions("events:write")
  send(@Body() body: MessageInput) {
    return this.service.send(body);
  }
  @Post("conversations/:id/read")
  @Permissions("events:write")
  read(@Param("id") id: string, @Body() body: { message_ids?: unknown }) {
    return this.service.read(id, body.message_ids);
  }
}
