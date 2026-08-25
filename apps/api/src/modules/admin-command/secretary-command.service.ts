import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class SecretaryCommandService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly prisma: PrismaService,
    private readonly operations: AdminCommandOperationsService,
  ) {}

  private requireTenantId(): string {
    const tenantId = this.requestContext.getStore()?.tenant_id;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }
    return tenantId;
  }

  private currentUserId(): string | null {
    return this.requestContext.getStore()?.user_id || null;
  }

  private async createWorkflowEvent(input: {
    eventType: string;
    entityType: string;
    entityId?: string | null;
    title: string;
    message: string;
    status?: string;
    priority?: string;
    targetRoles?: string[];
    payload?: Record<string, unknown>;
  }) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, status, payload
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        this.requestContext.getStore()?.role || 'secretary',
        JSON.stringify(input.targetRoles || ['secretary']),
        input.eventType,
        input.entityType,
        input.entityId || null,
        input.title,
        input.message,
        input.priority || 'normal',
        input.status || 'pending',
        JSON.stringify(input.payload || {}),
      ],
    );
    const event = result.rows[0];
    await this.operations.recordAudit(tenantId, input.eventType, input.entityType, event.id, { event }, userId);
    return event;
  }

  private async listWorkflowEvents(eventType: string) {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          source_user_id::text,
          title,
          message,
          status,
          priority,
          payload,
          (created_at::date = CURRENT_DATE) AS is_today,
          created_at::text,
          updated_at::text
        FROM workflow_events
        WHERE tenant_id = $1 AND event_type = $2
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId, eventType],
    );
    return result.rows;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  private titleCase(value: unknown, fallback = ''): string {
    const text = String(value ?? '').trim();
    if (!text) return fallback;
    return text
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (character) => character.toUpperCase());
  }

  private async resolveTenantGuardianRecipient(tenantId: string, dto: any) {
    const studentReference = this.operations.requiredText(
      dto?.student_id ?? dto?.studentId ?? dto?.student_reference ?? dto?.studentReference ?? dto?.student_name ?? dto?.student,
      'Student reference',
    );
    const studentUuid = this.operations.uuidOrNull(studentReference);
    const explicitGuardianReference = String(
      dto?.guardian_id ?? dto?.guardianId ?? dto?.recipient_user_id ?? dto?.recipientUserId ?? '',
    ).trim();
    const guardianUuid = this.operations.uuidOrNull(explicitGuardianReference);
    const recipientReference = String(dto?.recipient ?? dto?.guardian_reference ?? dto?.guardianReference ?? '').trim();
    const guardianName = String(dto?.parent_name ?? dto?.guardian_name ?? dto?.guardianName ?? (
      recipientReference && !recipientReference.includes('@') && !/^[+\d\s()-]+$/.test(recipientReference)
        ? recipientReference
        : ''
    )).trim();
    const guardianContact = String(
      dto?.phone_number ?? dto?.phone ?? dto?.guardian_email ?? dto?.email ?? (
        recipientReference && (recipientReference.includes('@') || /^[+\d\s()-]+$/.test(recipientReference))
          ? recipientReference
          : ''
      ),
    ).trim();

    if (!guardianUuid && !guardianName && !guardianContact) {
      throw new BadRequestException('An exact guardian name, email, phone number, guardian ID, or guardian account ID is required');
    }

    const result = await this.operations.readSql(
      `
        SELECT DISTINCT
          student.id::text AS student_id,
          student.admission_number,
          concat_ws(' ', student.first_name, student.middle_name, student.last_name) AS student_name,
          COALESCE(student.metadata->>'class_name', student.metadata->>'class', '') AS class_name,
          guardian.id::text AS guardian_id,
          guardian.user_id::text AS guardian_user_id,
          guardian.display_name AS guardian_name,
          guardian.email::text AS guardian_email,
          guardian.phone AS guardian_phone
        FROM students student
        INNER JOIN student_guardians guardian
          ON guardian.tenant_id = student.tenant_id
         AND guardian.student_id = student.id
         AND lower(guardian.status) = 'active'
         AND guardian.user_id IS NOT NULL
        INNER JOIN tenant_memberships membership
          ON membership.tenant_id = guardian.tenant_id
         AND membership.user_id = guardian.user_id
         AND lower(membership.status) = 'active'
        WHERE student.tenant_id = $1
          AND lower(student.status) = 'active'
          AND (
            ($2::uuid IS NOT NULL AND student.id = $2::uuid)
            OR (
              $2::uuid IS NULL
              AND (
                lower(btrim(student.admission_number)) = lower(btrim($3))
                OR lower(btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name))) = lower(btrim($3))
              )
            )
          )
          AND (
            ($4::uuid IS NOT NULL AND (guardian.id = $4::uuid OR guardian.user_id = $4::uuid))
            OR (
              $4::uuid IS NULL
              AND ($5 = '' OR lower(btrim(guardian.display_name)) = lower(btrim($5)))
              AND (
                $6 = ''
                OR lower(btrim(guardian.email::text)) = lower(btrim($6))
                OR regexp_replace(COALESCE(guardian.phone, ''), '[^0-9]+', '', 'g') = regexp_replace($6, '[^0-9]+', '', 'g')
              )
            )
          )
        ORDER BY student.id, guardian.id
        LIMIT 2
      `,
      [tenantId, studentUuid, studentReference, guardianUuid, guardianName, guardianContact],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('No active guardian account matching that student and recipient was found in this school');
    }
    if (result.rows.length > 1) {
      throw new BadRequestException('More than one guardian record matches. Use the student admission number and guardian email, phone, or account ID');
    }

    return result.rows[0] as {
      student_id: string;
      admission_number: string;
      student_name: string;
      class_name: string;
      guardian_id: string;
      guardian_user_id: string;
      guardian_name: string;
      guardian_email: string;
      guardian_phone: string | null;
    };
  }

  private async resolveTenantStaffRecipient(tenantId: string, referenceValue: unknown) {
    const reference = this.operations.requiredText(referenceValue, 'Mail or parcel recipient');
    const referenceUuid = this.operations.uuidOrNull(reference);
    const result = await this.operations.readSql(
      `
        SELECT DISTINCT
          profile.id::text AS staff_profile_id,
          profile.user_id::text AS user_id,
          COALESCE(NULLIF(profile.display_name, ''), NULLIF(account.full_name, ''), profile.staff_number) AS staff_name,
          profile.staff_number
        FROM staff_profiles profile
        INNER JOIN tenant_memberships membership
          ON membership.tenant_id = profile.tenant_id
         AND membership.user_id = profile.user_id
         AND lower(membership.status) = 'active'
        INNER JOIN users account
          ON account.id = profile.user_id
        WHERE profile.tenant_id = $1
          AND profile.user_id IS NOT NULL
          AND lower(COALESCE(profile.status, 'active')) IN ('active', 'on_leave', 'reactivated')
          AND (
            ($2::uuid IS NOT NULL AND (profile.id = $2::uuid OR profile.user_id = $2::uuid))
            OR (
              $2::uuid IS NULL
              AND (
                lower(btrim(COALESCE(profile.display_name, ''))) = lower(btrim($3))
                OR lower(btrim(COALESCE(profile.staff_number, ''))) = lower(btrim($3))
                OR lower(btrim(COALESCE(account.full_name, ''))) = lower(btrim($3))
                OR lower(btrim(COALESCE(account.email::text, ''))) = lower(btrim($3))
              )
            )
          )
        ORDER BY profile.id
        LIMIT 2
      `,
      [tenantId, referenceUuid, reference],
    );

    if (result.rows.length === 0) {
      throw new BadRequestException('The recipient is not an active staff account in this school. Use the exact staff name, staff number, email, or account ID');
    }
    if (!referenceUuid && result.rows.length > 1) {
      throw new BadRequestException('More than one active staff member matches this recipient. Use the staff number, email, or account ID');
    }

    return result.rows[0] as { staff_profile_id: string; user_id: string; staff_name: string; staff_number: string | null };
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const metrics = await this.executeSql(`
      SELECT 
        (SELECT COUNT(*)::int FROM visitors_logs WHERE tenant_id = $1 AND time_in::date = CURRENT_DATE) as "todayVisitors",
        (SELECT COUNT(*)::int FROM visitors_appointments WHERE tenant_id = $1 AND appointment_time::date = CURRENT_DATE) as "todayAppointments"
    `, [tenantId]);

    const row = metrics.rows[0] || { todayVisitors: 0, todayAppointments: 0 };
    return {
      metrics: {
        todayVisitors: row.todayVisitors || 0,
        todayAppointments: row.todayAppointments || 0,
        pendingClearances: 0,
      },
      upcomingAppointments: []
    };
  }

  async getDashboard() {
    return this.getOverview();
  }

  async getVisitors() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM visitors_logs WHERE tenant_id = $1 ORDER BY time_in DESC LIMIT 100`,
      [tenantId]
    );
    return res.rows;
  }

  async checkInVisitor(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const visitorName = this.operations.requiredText(dto?.visitor_name ?? dto?.name, 'Visitor name');
    const purpose = this.operations.requiredText(dto?.purpose, 'Visit purpose');
    const result = await this.operations.writeSql(
      `
        INSERT INTO visitors_logs (
          tenant_id, visitor_name, phone_number, purpose, host_user_id, badge_number, logged_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        tenantId,
        visitorName,
        dto?.phone_number ?? dto?.phone ?? null,
        purpose,
        dto?.host_user_id ?? dto?.hostUserId ?? null,
        dto?.badge_number ?? dto?.badgeNumber ?? null,
        userId,
      ],
    );
    const visitor = result.rows[0];
    await this.operations.recordAudit(tenantId, 'frontoffice.visitor_checked_in', 'visitor_log', visitor.id, { visitor }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `secretary-visitor-checked-in-${visitor.id}`,
      type: 'frontoffice.visitor_checked_in',
      title: `${visitorName} checked in`,
      body: `${visitorName} checked in at reception for ${purpose}.`,
      targetRoles: ['secretary', 'security', 'principal'],
      metadata: { visitor },
    });
    return { success: true, message: 'Visitor checked in and security notified', visitor };
  }

  async checkOutVisitor(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE visitors_logs
        SET time_out = NOW(), status = 'checked_out', updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'active'
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Visitor log ID')],
    );
    const visitor = result.rows[0];
    if (!visitor) throw new BadRequestException('Visitor was not found or is already checked out');
    await this.operations.recordAudit(tenantId, 'frontoffice.visitor_checked_out', 'visitor_log', visitor.id, { visitor }, userId);
    return { success: true, message: 'Visitor checked out', visitor };
  }

  async printVisitorSlip(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT id::text, visitor_name, phone_number, purpose, host_user_id, badge_number, time_in, time_out, status
        FROM visitors_logs
        WHERE tenant_id = $1 AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Visitor log ID')],
    );
    const visitor = result.rows[0];
    if (!visitor) throw new NotFoundException('Visitor was not found in this school');
    return { success: true, message: 'Visitor slip ready', slip: { type: 'visitor-slip', visitor } };
  }

  async getAppointments() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM visitors_appointments WHERE tenant_id = $1 ORDER BY appointment_time ASC LIMIT 100`,
      [tenantId]
    );
    return res.rows;
  }

  async createAppointment(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const visitorName = this.operations.requiredText(dto?.visitor_name ?? dto?.name, 'Visitor name');
    const purpose = this.operations.requiredText(dto?.purpose, 'Appointment purpose');
    const appointmentTime = this.operations.requiredText(dto?.appointment_time ?? dto?.appointmentTime, 'Appointment time');
    const result = await this.operations.writeSql(
      `
        INSERT INTO visitors_appointments (
          tenant_id, visitor_name, host_user_id, purpose, appointment_time, status, created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5::timestamptz, 'scheduled', $6)
        RETURNING *
      `,
      [tenantId, visitorName, dto?.host_user_id ?? dto?.hostUserId ?? 'front-office', purpose, appointmentTime, userId],
    );
    const appointment = result.rows[0];
    await this.operations.recordAudit(tenantId, 'frontoffice.appointment_created', 'visitors_appointment', appointment.id, { appointment }, userId);
    return { success: true, message: 'Appointment scheduled', appointment };
  }

  async updateAppointmentStatus(id: string, status: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE visitors_appointments
        SET status = $3, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Appointment ID'), status],
    );
    const appointment = result.rows[0];
    if (!appointment) throw new NotFoundException('Appointment was not found in this school');
    await this.operations.recordAudit(tenantId, `frontoffice.appointment_${status}`, 'visitors_appointment', appointment.id, { appointment }, userId);
    return { success: true, message: `Appointment ${status}`, appointment };
  }

  async rescheduleAppointment(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const appointmentTime = this.operations.requiredText(dto?.appointment_time ?? dto?.appointmentTime, 'Appointment time');
    const result = await this.operations.writeSql(
      `
        UPDATE visitors_appointments
        SET appointment_time = $3::timestamptz, status = 'scheduled', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Appointment ID'), appointmentTime],
    );
    const appointment = result.rows[0];
    if (!appointment) throw new NotFoundException('Appointment was not found in this school');
    await this.operations.recordAudit(tenantId, 'frontoffice.appointment_rescheduled', 'visitors_appointment', appointment.id, { appointment }, userId);
    return { success: true, message: 'Appointment rescheduled', appointment };
  }

  async getCallsLog() {
    const rows = await this.listWorkflowEvents('frontoffice.call_logged');
    const calls = rows.map((row: any) => {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const createdAt = String(row.created_at || '');
      const direction = this.titleCase(payload.direction, 'Incoming');
      const followUpRequired = Boolean(payload.action_required ?? payload.follow_up_required);
      const followUpDone = ['completed', 'followed_up', 'closed'].includes(String(row.status || '').toLowerCase());
      return {
        id: String(row.id),
        caller_name: String(payload.caller ?? payload.caller_name ?? row.title ?? ''),
        phone_number: String(payload.phone_number ?? payload.phone ?? ''),
        direction,
        purpose: String(payload.subject ?? payload.purpose ?? row.message ?? ''),
        person_called: String(payload.person_called ?? payload.recipient ?? ''),
        date: createdAt.slice(0, 10),
        time: createdAt.length >= 16 ? createdAt.slice(11, 16) : createdAt,
        duration_minutes: Number(payload.duration_minutes ?? payload.duration ?? 0) || 0,
        follow_up_required: followUpRequired,
        follow_up_done: followUpDone,
        notes: String(payload.notes ?? row.message ?? ''),
        status: followUpDone ? 'Followed Up' : followUpRequired ? 'Pending' : 'Logged',
        caller_recipient: String(payload.caller ?? payload.recipient ?? row.title ?? ''),
        number: String(payload.phone_number ?? payload.phone ?? ''),
        subject: String(payload.subject ?? row.message ?? ''),
        duration: payload.duration_minutes ? `${payload.duration_minutes} min` : '',
        action_required: followUpRequired ? 'Yes' : 'No',
        created_at: createdAt,
      };
    });
    const todayCalls = rows.filter((row: any) => Boolean(row.is_today));
    return {
      metrics: {
        total_today: todayCalls.length,
        incoming: todayCalls.filter((row: any) => String(row.payload?.direction || 'incoming').toLowerCase() === 'incoming').length,
        outgoing: todayCalls.filter((row: any) => String(row.payload?.direction || '').toLowerCase() === 'outgoing').length,
        missed: todayCalls.filter((row: any) => String(row.payload?.direction || '').toLowerCase() === 'missed').length,
        pending_follow_up: calls.filter((call: any) => call.follow_up_required && !call.follow_up_done).length,
      },
      calls,
    };
  }

  async logCall(dto: any) {
    const caller = this.operations.requiredText(dto?.caller ?? dto?.caller_name ?? dto?.phone_number, 'Caller');
    const message = this.operations.requiredText(dto?.message ?? dto?.notes ?? dto?.summary, 'Call notes');
    const direction = String(dto?.direction || 'incoming').trim().toLowerCase();
    if (!['incoming', 'outgoing', 'missed'].includes(direction)) {
      throw new BadRequestException('Call direction must be incoming, outgoing, or missed');
    }
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.call_logged',
      entityType: 'frontoffice_call',
      title: `Call from ${caller}`,
      message,
      payload: {
        caller,
        phone_number: String(dto?.phone_number ?? dto?.phone ?? '').trim() || null,
        direction,
        subject: String(dto?.subject ?? dto?.purpose ?? '').trim() || null,
        notes: message,
        duration_minutes: Number(dto?.duration_minutes ?? dto?.duration ?? 0) || 0,
        action_required: Boolean(dto?.action_required ?? dto?.follow_up_required),
        source_dashboard: String(dto?.source_dashboard || 'secretary-calls-log'),
      },
    });
    return { success: true, message: 'Call logged', call: event };
  }

  async getReceptionQueue() {
    return this.listWorkflowEvents('frontoffice.queue_entry');
  }

  async createQueueEntry(dto: any) {
    const visitorName = this.operations.requiredText(dto?.visitor_name ?? dto?.name, 'Visitor name');
    const purpose = this.operations.requiredText(dto?.purpose, 'Purpose');
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.queue_entry',
      entityType: 'reception_queue',
      title: visitorName,
      message: purpose,
      payload: { ...dto, visitor_name: visitorName, purpose },
    });
    return { success: true, message: 'Reception queue entry created', entry: event };
  }

  async getParentMessages() {
    const rows = await this.listWorkflowEvents('frontoffice.parent_message');
    const messages = rows.map((row: any) => {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const status = String(row.status || 'pending').toLowerCase();
      const createdAt = String(row.created_at || '');
      const priority = this.titleCase(row.priority, 'Normal');
      return {
        id: String(row.id),
        request_no: String(payload.request_no ?? `REQ-${String(row.id).slice(0, 8).toUpperCase()}`),
        parent_name: String(payload.guardian_name ?? payload.parent_name ?? ''),
        phone: String(payload.guardian_phone ?? payload.phone_number ?? ''),
        student_name: String(payload.student_name ?? ''),
        student: String(payload.student_name ?? ''),
        class: String(payload.class_name ?? ''),
        request_type: String(payload.request_type ?? payload.subject ?? row.title ?? ''),
        assigned_to: String(payload.assigned_to ?? ''),
        subject: String(payload.subject ?? row.title ?? ''),
        message_preview: String(row.message ?? '').slice(0, 180),
        channel: this.titleCase(payload.channel, 'In App'),
        received_at: createdAt,
        is_read: ['read', 'replied', 'completed', 'resolved'].includes(status),
        is_replied: ['replied', 'completed', 'resolved'].includes(status),
        priority,
        status: this.titleCase(status, 'Pending'),
        date: createdAt.slice(0, 10),
        guardian_id: payload.guardian_id ?? null,
        guardian_user_id: payload.guardian_user_id ?? null,
        student_id: payload.student_id ?? null,
      };
    });
    return {
      metrics: {
        total_messages: messages.length,
        unread: messages.filter((message: any) => !message.is_read).length,
        replied: messages.filter((message: any) => message.is_replied).length,
        high_priority: messages.filter((message: any) => ['High', 'Urgent'].includes(message.priority)).length,
      },
      messages,
      requests: messages,
    };
  }

  async sendParentMessage(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const message = this.operations.requiredText(dto?.message ?? dto?.body, 'Message');
    const recipient = await this.resolveTenantGuardianRecipient(tenantId, dto);
    const title = this.operations.requiredText(dto?.subject ?? dto?.request_type ?? 'Parent message', 'Message subject');
    const channel = String(dto?.channel || 'in_app').trim().toLowerCase();
    if (channel !== 'in_app') {
      throw new BadRequestException('This workflow currently supports verified in-app delivery only. SMS and email must use a configured delivery queue');
    }
    const requestedPriority = String(dto?.priority || '').toLowerCase();
    const priority = ['high', 'urgent'].includes(requestedPriority) ? requestedPriority : 'normal';
    const payload = {
      student_id: recipient.student_id,
      admission_number: recipient.admission_number,
      student_name: recipient.student_name,
      class_name: recipient.class_name || String(dto?.class_name ?? '').trim() || null,
      guardian_id: recipient.guardian_id,
      guardian_user_id: recipient.guardian_user_id,
      guardian_name: recipient.guardian_name,
      guardian_email: recipient.guardian_email,
      guardian_phone: recipient.guardian_phone,
      subject: title,
      request_type: String(dto?.request_type ?? '').trim() || null,
      assigned_to: String(dto?.assigned_to ?? '').trim() || null,
      follow_up_deadline: String(dto?.follow_up_deadline ?? '').trim() || null,
      channel,
      source_dashboard: String(dto?.source_dashboard || 'secretary-parent-desk'),
      recipient_scope: 'exact_linked_guardian',
    };
    const result = await this.operations.writeSql(
      `
        WITH valid_recipient AS (
          SELECT
            student.id::text AS student_id,
            guardian.id::text AS guardian_id,
            guardian.user_id::text AS guardian_user_id,
            guardian.display_name AS guardian_name
          FROM students student
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = student.tenant_id
           AND guardian.student_id = student.id
           AND guardian.id = $10::uuid
           AND guardian.user_id = $11::uuid
           AND lower(guardian.status) = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND lower(membership.status) = 'active'
          WHERE student.tenant_id = $1
            AND student.id = $5::uuid
            AND lower(student.status) = 'active'
          LIMIT 1
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, status, payload
          )
          SELECT
            $1, $2::uuid, $3, $4::jsonb, 'frontoffice.parent_message', 'parent_message',
            valid_recipient.student_id, $6, $7, $8, 'pending', $9::jsonb
          FROM valid_recipient
          RETURNING *
        ), recipient_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'secretary-parent-message-' || event.id::text || '-' || valid_recipient.guardian_id,
            valid_recipient.guardian_user_id::uuid,
            valid_recipient.guardian_id::uuid,
            'frontoffice.parent_message',
            event.title,
            event.message,
            'unread',
            event.priority,
            'secretary',
            event.id::text,
            event.payload
          FROM inserted_event event
          CROSS JOIN valid_recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            priority = EXCLUDED.priority,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING recipient_user_id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1, $2::uuid, current_setting('app.request_id', true),
            'frontoffice.parent_message_sent', 'workflow_event', event.id, $12::jsonb
          FROM inserted_event event
          RETURNING id
        )
        SELECT
          event.*,
          valid_recipient.guardian_id,
          valid_recipient.guardian_user_id,
          valid_recipient.guardian_name,
          (SELECT COUNT(*)::int FROM recipient_notification) AS notification_count
        FROM inserted_event event
        CROSS JOIN valid_recipient
      `,
      [
        tenantId,
        userId,
        this.requestContext.getStore()?.role || 'secretary',
        JSON.stringify(['secretary', 'principal']),
        recipient.student_id,
        title,
        message,
        priority,
        JSON.stringify(payload),
        recipient.guardian_id,
        recipient.guardian_user_id,
        JSON.stringify({
          student_id: recipient.student_id,
          guardian_id: recipient.guardian_id,
          guardian_user_id: recipient.guardian_user_id,
          recipient_scope: 'exact_linked_guardian',
        }),
      ],
    );
    const event = result.rows[0];
    if (!event || Number(event.notification_count || 0) < 1) {
      throw new BadRequestException('The linked guardian no longer has an active account in this school');
    }
    return {
      success: true,
      message: `Parent message recorded and delivered in-app to ${recipient.guardian_name}`,
      parentMessage: event,
      recipient: {
        guardian_id: recipient.guardian_id,
        guardian_user_id: recipient.guardian_user_id,
        guardian_name: recipient.guardian_name,
        student_id: recipient.student_id,
      },
    };
  }

  async replyToMessage(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const reply = this.operations.requiredText(dto?.message ?? dto?.reply, 'Reply');
    const result = await this.operations.writeSql(
      `
        WITH valid_message AS (
          SELECT event.*, guardian.id AS guardian_id, guardian.user_id AS guardian_user_id
          FROM workflow_events event
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = event.tenant_id
           AND guardian.id = NULLIF(event.payload->>'guardian_id', '')::uuid
           AND guardian.user_id = NULLIF(event.payload->>'guardian_user_id', '')::uuid
           AND guardian.student_id = NULLIF(event.payload->>'student_id', '')::uuid
           AND lower(guardian.status) = 'active'
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND lower(membership.status) = 'active'
          WHERE event.tenant_id = $1
            AND event.id = $2::uuid
            AND event.event_type = 'frontoffice.parent_message'
          LIMIT 1
        ), updated_message AS (
          UPDATE workflow_events event
          SET status = 'replied',
              payload = event.payload || $4::jsonb,
              updated_at = NOW()
          FROM valid_message valid
          WHERE event.tenant_id = valid.tenant_id
            AND event.id = valid.id
          RETURNING event.*
        ), recipient_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'secretary-parent-message-reply-' || message.id::text || '-' || valid.guardian_id::text,
            valid.guardian_user_id,
            valid.guardian_id,
            'frontoffice.parent_message_replied',
            'Reply: ' || message.title,
            $3,
            'unread',
            message.priority,
            'secretary',
            message.id::text,
            message.payload
          FROM updated_message message
          CROSS JOIN valid_message valid
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING recipient_user_id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1, $5::uuid, current_setting('app.request_id', true),
            'frontoffice.parent_message_replied', 'workflow_event', message.id,
            jsonb_build_object(
              'guardian_id', valid.guardian_id::text,
              'guardian_user_id', valid.guardian_user_id::text,
              'recipient_scope', 'exact_linked_guardian'
            )
          FROM updated_message message
          CROSS JOIN valid_message valid
          RETURNING id
        )
        SELECT
          message.*,
          valid.guardian_id::text,
          valid.guardian_user_id::text,
          (SELECT COUNT(*)::int FROM recipient_notification) AS notification_count
        FROM updated_message message
        CROSS JOIN valid_message valid
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Parent message ID'),
        reply,
        JSON.stringify({ reply, replied_at: new Date().toISOString(), replied_by_user_id: userId }),
        userId,
      ],
    );
    const event = result.rows[0];
    if (!event || Number(event.notification_count || 0) < 1) {
      throw new NotFoundException('Parent message or its active linked guardian was not found in this school');
    }
    return { success: true, message: 'Reply delivered to the linked guardian', event };
  }

  async assignParentMessage(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.operations.uuidOrNull(this.currentUserId());
    const assignee = await this.resolveTenantStaffRecipient(
      tenantId,
      dto?.assignee_user_id ?? dto?.assigneeUserId ?? dto?.assignee ?? dto?.assigned_to,
    );
    const result = await this.operations.writeSql(
      `
        WITH valid_assignee AS (
          SELECT profile.id, profile.user_id
          FROM staff_profiles profile
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = profile.tenant_id
           AND membership.user_id = profile.user_id
           AND lower(membership.status) = 'active'
          WHERE profile.tenant_id = $1
            AND profile.id = $5::uuid
            AND profile.user_id = $6::uuid
            AND lower(COALESCE(profile.status, 'active')) IN ('active', 'on_leave', 'reactivated')
          LIMIT 1
        ), updated_message AS (
          UPDATE workflow_events event
          SET payload = event.payload || $3::jsonb,
              updated_at = NOW()
          FROM valid_assignee assignee
          WHERE event.tenant_id = $1
            AND event.id = $2::uuid
            AND event.event_type = 'frontoffice.parent_message'
          RETURNING event.*
        ), assignee_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, type, title, body, status,
            priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'secretary-parent-message-assigned-' || message.id::text || '-' || assignee.user_id::text,
            assignee.user_id,
            'frontoffice.parent_message_assigned',
            'Parent request assigned: ' || message.title,
            message.message,
            'unread',
            message.priority,
            'secretary',
            message.id::text,
            message.payload
          FROM updated_message message
          CROSS JOIN valid_assignee assignee
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET body = EXCLUDED.body, status = 'unread', metadata = EXCLUDED.metadata, updated_at = NOW()
          RETURNING recipient_user_id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1, $4::uuid, current_setting('app.request_id', true),
            'frontoffice.parent_message_assigned', 'workflow_event', message.id,
            jsonb_build_object(
              'assignee_user_id', assignee.user_id::text,
              'assignee_staff_profile_id', assignee.id::text,
              'recipient_scope', 'exact_tenant_staff_user'
            )
          FROM updated_message message
          CROSS JOIN valid_assignee assignee
          RETURNING id
        )
        SELECT message.*, (SELECT COUNT(*)::int FROM assignee_notification) AS notification_count
        FROM updated_message message
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Parent message ID'),
        JSON.stringify({
          assigned_to: assignee.staff_name,
          assigned_to_user_id: assignee.user_id,
          assigned_to_staff_profile_id: assignee.staff_profile_id,
          assigned_at: new Date().toISOString(),
        }),
        actorUserId,
        assignee.staff_profile_id,
        assignee.user_id,
      ],
    );
    const event = result.rows[0];
    if (!event || Number(event.notification_count || 0) < 1) {
      throw new NotFoundException('Parent message or active assignee was not found in this school');
    }
    return { success: true, message: `Parent request assigned to ${assignee.staff_name}`, event, assignee };
  }

  async getLostFoundItems() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          item_name,
          description,
          found_location,
          found_at::text,
          status,
          claimant_name,
          verification_notes,
          claimed_at::text
        FROM security_lost_found
        WHERE tenant_id = $1
        ORDER BY found_at DESC, created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordLostFoundItem(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const itemName = this.operations.requiredText(dto?.item_name ?? dto?.itemName ?? dto?.name, 'Item name');
    const foundLocation = this.operations.requiredText(dto?.found_location ?? dto?.foundLocation ?? dto?.location, 'Found location');
    const description = String(dto?.description ?? dto?.notes ?? '').trim() || null;
    const result = await this.operations.writeSql(
      `
        INSERT INTO security_lost_found (
          tenant_id, item_name, description, found_location, found_by, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        itemName,
        description,
        foundLocation,
        this.operations.uuidOrNull(userId),
        JSON.stringify({
          source_dashboard: dto?.source_dashboard || 'secretary-lost-found',
          category: dto?.category ?? null,
          student_linked: dto?.student_linked ?? null,
          custody_location: dto?.custody_location ?? null,
        }),
      ],
    );
    const item = result.rows[0];
    await this.operations.recordAudit(tenantId, 'frontoffice.lost_item_recorded', 'security_lost_found', item.id, { item }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `secretary-lost-item-recorded-${item.id}`,
      type: 'frontoffice.lost_item_recorded',
      title: `Lost item recorded: ${item.item_name}`,
      body: `${item.item_name} was recorded at ${item.found_location}.`,
      targetRoles: ['secretary', 'security', 'principal'],
      metadata: { item },
    });
    return { success: true, message: 'Lost item recorded and routed', item };
  }

  async getPreferences() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql(
      `
        SELECT payload, created_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'frontoffice.preferences_updated'
          AND entity_type = 'secretary_preferences'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [tenantId],
    );
    return {
      auto_acknowledge_visitors: false,
      parent_follow_up_hours: 24,
      default_message_channel: 'in_app',
      notify_principal_on_urgent: true,
      ...(result.rows[0]?.payload || {}),
      updated_at: result.rows[0]?.created_at || null,
    };
  }

  async updatePreferences(dto: any) {
    const followUpHours = Number(dto?.parent_follow_up_hours ?? dto?.parentFollowUpHours ?? 24);
    if (!Number.isFinite(followUpHours) || followUpHours < 1 || followUpHours > 168) {
      throw new BadRequestException('Parent follow-up window must be between 1 and 168 hours');
    }

    const preferences = {
      auto_acknowledge_visitors: Boolean(dto?.auto_acknowledge_visitors ?? dto?.autoAcknowledgeVisitors),
      parent_follow_up_hours: followUpHours,
      default_message_channel: this.operations.requiredText(dto?.default_message_channel ?? dto?.defaultMessageChannel ?? 'in_app', 'Default message channel'),
      notify_principal_on_urgent: Boolean(dto?.notify_principal_on_urgent ?? dto?.notifyPrincipalOnUrgent ?? true),
    };
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.preferences_updated',
      entityType: 'secretary_preferences',
      title: 'Secretary front-office preferences updated',
      message: `Parent follow-up window set to ${followUpHours} hours.`,
      status: 'applied',
      targetRoles: ['secretary', 'principal', 'system_monitor'],
      payload: preferences,
    });
    await this.operations.notifyRoles(this.requireTenantId(), {
      key: `secretary-preferences-updated-${event.id}`,
      type: 'frontoffice.preferences_updated',
      title: event.title,
      body: event.message,
      targetRoles: ['principal', 'system_monitor'],
      metadata: { event },
    });
    return { success: true, message: 'Secretary preferences saved', preferences, event };
  }

  async getLettersDocuments() {
    const rows = await this.listWorkflowEvents('frontoffice.document_created');
    const documents = rows.map((row: any) => {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const artifact = payload.artifact && typeof payload.artifact === 'object' ? payload.artifact : {};
      const createdAt = String(row.created_at || '');
      const type = this.titleCase(payload.type, 'Letter');
      return {
        id: String(row.id),
        title: String(row.title || ''),
        type,
        category: this.titleCase(payload.category, type),
        recipient: String(payload.recipient ?? ''),
        prepared_by: String(payload.prepared_by ?? row.source_user_id ?? ''),
        date_created: createdAt,
        status: this.titleCase(row.status, 'Generated'),
        file_format: String(artifact.file_format ?? artifact.filename?.split('.').pop() ?? 'txt').toLowerCase(),
        date: createdAt.slice(0, 10),
        reference: String(payload.reference ?? `DOC-${String(row.id).slice(0, 8).toUpperCase()}`),
        recipient_sender: String(payload.recipient ?? payload.sender ?? ''),
        subject: String(row.title || ''),
        message: String(row.message || ''),
      };
    });
    return {
      metrics: {
        total_documents: documents.length,
        letters: documents.filter((document: any) => document.type === 'Letter').length,
        certificates: documents.filter((document: any) => document.type === 'Certificate').length,
        drafts: documents.filter((document: any) => document.status === 'Draft').length,
      },
      documents,
    };
  }

  async createDocument(dto: any) {
    const title = this.operations.requiredText(dto?.title ?? dto?.name, 'Document title');
    const body = this.operations.requiredText(dto?.body ?? dto?.content ?? dto?.description, 'Document content');
    const documentType = String(dto?.type || 'letter').trim().toLowerCase();
    const recipient = this.operations.requiredText(dto?.recipient, 'Document recipient');
    const generatedAt = new Date().toISOString();
    const filenameStem = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'front-office-document';
    const artifact = {
      kind: 'frontoffice-document',
      filename: `${filenameStem}-${generatedAt.replace(/\D/g, '').slice(0, 14)}.txt`,
      content_type: 'text/plain;charset=utf-8',
      encoding: 'base64',
      content_base64: Buffer.from(`${title}\n\nRecipient: ${recipient}\nGenerated: ${generatedAt}\n\n${body}\n`, 'utf8').toString('base64'),
      file_format: 'txt',
      generated_at: generatedAt,
    };
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.document_created',
      entityType: 'frontoffice_document',
      title,
      message: body.slice(0, 240),
      status: 'generated',
      payload: {
        type: documentType,
        category: String(dto?.category || documentType).trim().toLowerCase(),
        recipient,
        body,
        reference: String(dto?.reference || '').trim() || null,
        prepared_by: this.currentUserId(),
        source_dashboard: String(dto?.source_dashboard || 'secretary-letters-workspace'),
        artifact,
      },
    });
    return { success: true, message: 'Document generated and stored with a downloadable artifact', document: event, artifact };
  }

  async getMailParcels() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          event.id::text,
          event.source_user_id::text,
          event.title,
          event.message,
          event.status,
          event.payload,
          event.created_at::text,
          event.updated_at::text
        FROM workflow_events event
        WHERE event.tenant_id = $1
          AND event.event_type = 'delivery.recorded'
          AND event.payload ? 'recipient_user_id'
          AND event.payload ? 'recipient_staff_profile_id'
        ORDER BY event.created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    const items = result.rows.map((row: any) => {
      const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
      const collected = Boolean(payload.collected_at);
      return {
        id: String(row.id),
        ref_no: String(payload.reference ?? `MAIL-${String(row.id).slice(0, 8).toUpperCase()}`),
        date: String(row.created_at || '').slice(0, 10),
        sender: String(payload.sender ?? ''),
        recipient: String(payload.recipient_name ?? payload.recipient ?? ''),
        recipient_user_id: String(payload.recipient_user_id ?? ''),
        recipient_staff_profile_id: String(payload.recipient_staff_profile_id ?? ''),
        type: this.titleCase(payload.delivery_type, 'Delivery'),
        description: String(payload.description ?? row.message ?? ''),
        status: collected ? 'Collected' : this.titleCase(row.status, 'Received'),
        received_by: String(payload.received_by ?? row.source_user_id ?? ''),
        created_at: String(row.created_at || ''),
        collected_at: payload.collected_at ?? null,
      };
    });
    return {
      metrics: {
        total: items.length,
        awaiting_collection: items.filter((item: any) => item.status !== 'Collected').length,
        collected: items.filter((item: any) => item.status === 'Collected').length,
      },
      items,
    };
  }

  async recordMailParcel(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const deliveryType = this.operations.requiredText(dto?.delivery_type ?? dto?.type, 'Mail or parcel type');
    const sender = this.operations.requiredText(dto?.sender, 'Sender');
    const description = String(dto?.description ?? '').trim() || `${deliveryType} from ${sender}`;
    const recipient = await this.resolveTenantStaffRecipient(
      tenantId,
      dto?.recipient_user_id ?? dto?.recipientUserId ?? dto?.recipient,
    );
    const recordedAt = new Date().toISOString();
    const payload = {
      delivery_type: deliveryType,
      sender,
      recipient: recipient.staff_name,
      recipient_name: recipient.staff_name,
      recipient_user_id: recipient.user_id,
      recipient_staff_profile_id: recipient.staff_profile_id,
      recipient_staff_number: recipient.staff_number,
      description,
      received_by: userId,
      recorded_at: recordedAt,
      source_dashboard: 'secretary-mail-parcels',
      recipient_scope: 'exact_tenant_staff_user',
    };
    const result = await this.operations.writeSql(
      `
        WITH valid_recipient AS (
          SELECT
            profile.id::text AS staff_profile_id,
            profile.user_id::text AS user_id,
            COALESCE(NULLIF(profile.display_name, ''), NULLIF(account.full_name, ''), profile.staff_number) AS staff_name
          FROM staff_profiles profile
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = profile.tenant_id
           AND membership.user_id = profile.user_id
           AND lower(membership.status) = 'active'
          INNER JOIN users account
            ON account.id = profile.user_id
          WHERE profile.tenant_id = $1
            AND profile.id = $8::uuid
            AND profile.user_id = $9::uuid
            AND lower(COALESCE(profile.status, 'active')) IN ('active', 'on_leave', 'reactivated')
          LIMIT 1
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
            entity_id, title, message, priority, status, payload
          )
          SELECT
            $1, $2::uuid, 'secretary', $3::jsonb, 'delivery.recorded', 'staff_delivery',
            valid_recipient.staff_profile_id, $4, $5, 'normal', 'received', $6::jsonb
          FROM valid_recipient
          RETURNING *
        ), recipient_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, type, title, body, status,
            priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'secretary-delivery-recipient-' || event.id::text || '-' || valid_recipient.user_id,
            valid_recipient.user_id::uuid,
            'frontoffice.delivery_received',
            event.title,
            event.message,
            'unread',
            'normal',
            'secretary',
            event.id::text,
            event.payload
          FROM inserted_event event
          CROSS JOIN valid_recipient
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING recipient_user_id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1, $2::uuid, current_setting('app.request_id', true),
            'frontoffice.delivery_recorded', 'workflow_event', event.id, $7::jsonb
          FROM inserted_event event
          RETURNING id
        )
        SELECT
          event.*,
          valid_recipient.staff_profile_id,
          valid_recipient.user_id AS recipient_user_id,
          valid_recipient.staff_name AS recipient_name,
          (SELECT COUNT(*)::int FROM recipient_notification) AS notification_count
        FROM inserted_event event
        CROSS JOIN valid_recipient
      `,
      [
        tenantId,
        userId,
        JSON.stringify(['secretary', 'security', 'principal']),
        `Delivery for ${recipient.staff_name}`,
        `${deliveryType} from ${sender} is awaiting collection by ${recipient.staff_name}.`,
        JSON.stringify(payload),
        JSON.stringify({
          recipient_user_id: recipient.user_id,
          recipient_staff_profile_id: recipient.staff_profile_id,
          recipient_scope: 'exact_tenant_staff_user',
        }),
        recipient.staff_profile_id,
        recipient.user_id,
      ],
    );
    const delivery = result.rows[0];
    if (!delivery || Number(delivery.notification_count || 0) < 1) {
      throw new BadRequestException('The selected recipient no longer has an active staff account in this school');
    }
    return {
      success: true,
      message: `Mail or parcel recorded and ${recipient.staff_name} was notified in-app`,
      delivery,
      recipient,
    };
  }

  async notifyMailParcelRecipient(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        WITH valid_delivery AS (
          SELECT event.*, profile.user_id, COALESCE(NULLIF(profile.display_name, ''), NULLIF(account.full_name, ''), profile.staff_number) AS staff_name
          FROM workflow_events event
          INNER JOIN staff_profiles profile
            ON profile.tenant_id = event.tenant_id
           AND profile.id = NULLIF(event.payload->>'recipient_staff_profile_id', '')::uuid
           AND profile.user_id = NULLIF(event.payload->>'recipient_user_id', '')::uuid
           AND lower(COALESCE(profile.status, 'active')) IN ('active', 'on_leave', 'reactivated')
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = profile.tenant_id
           AND membership.user_id = profile.user_id
           AND lower(membership.status) = 'active'
          INNER JOIN users account
            ON account.id = profile.user_id
          WHERE event.tenant_id = $1
            AND event.id = $2::uuid
            AND event.event_type = 'delivery.recorded'
            AND NOT (event.payload ? 'collected_at')
          LIMIT 1
        ), updated_delivery AS (
          UPDATE workflow_events event
          SET payload = event.payload || $3::jsonb,
              updated_at = NOW()
          FROM valid_delivery valid
          WHERE event.tenant_id = valid.tenant_id AND event.id = valid.id
          RETURNING event.*
        ), recipient_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, type, title, body, status,
            priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'secretary-delivery-recipient-' || delivery.id::text || '-' || valid.user_id::text,
            valid.user_id,
            'frontoffice.delivery_received',
            delivery.title,
            delivery.message,
            'unread',
            'normal',
            'secretary',
            delivery.id::text,
            delivery.payload
          FROM updated_delivery delivery
          CROSS JOIN valid_delivery valid
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET body = EXCLUDED.body, status = 'unread', metadata = EXCLUDED.metadata, updated_at = NOW()
          RETURNING recipient_user_id::text
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1, $4::uuid, current_setting('app.request_id', true),
            'frontoffice.delivery_recipient_notified', 'workflow_event', delivery.id,
            jsonb_build_object('recipient_user_id', valid.user_id::text, 'recipient_scope', 'exact_tenant_staff_user')
          FROM updated_delivery delivery
          CROSS JOIN valid_delivery valid
          RETURNING id
        )
        SELECT delivery.*, valid.staff_name, (SELECT COUNT(*)::int FROM recipient_notification) AS notification_count
        FROM updated_delivery delivery
        CROSS JOIN valid_delivery valid
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Mail or parcel ID'),
        JSON.stringify({ notified_at: new Date().toISOString() }),
        userId,
      ],
    );
    const delivery = result.rows[0];
    if (!delivery || Number(delivery.notification_count || 0) < 1) {
      throw new NotFoundException('Mail or parcel, or its active recipient, was not found in this school');
    }
    return { success: true, message: `Recipient notification queued for ${delivery.staff_name}`, delivery };
  }

  async collectMailParcel(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const collectedAt = new Date().toISOString();
    const result = await this.operations.writeSql(
      `
        WITH updated_delivery AS (
          UPDATE workflow_events
          SET status = 'completed',
              payload = payload || $3::jsonb,
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND event_type = 'delivery.recorded'
            AND payload ? 'recipient_user_id'
            AND NOT (payload ? 'collected_at')
          RETURNING *
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1, $4::uuid, current_setting('app.request_id', true),
            'frontoffice.delivery_collected', 'workflow_event', delivery.id,
            jsonb_build_object('collected_at', $5::text, 'recipient_user_id', delivery.payload->>'recipient_user_id')
          FROM updated_delivery delivery
          RETURNING id
        )
        SELECT * FROM updated_delivery
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Mail or parcel ID'),
        JSON.stringify({ collected_at: collectedAt, collected_by_user_id: userId }),
        userId,
        collectedAt,
      ],
    );
    const delivery = result.rows[0];
    if (!delivery) {
      throw new NotFoundException('Mail or parcel was not found, was already collected, or belongs to another school');
    }
    return { success: true, message: 'Mail or parcel marked collected', delivery };
  }

  async getStudentClearance() {
    return this.listWorkflowEvents('frontoffice.clearance_started');
  }

  async initiateClearance(dto: any) {
    const studentId = this.operations.requiredText(dto?.student_id ?? dto?.studentId, 'Student');
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.clearance_started',
      entityType: 'student_clearance',
      entityId: studentId,
      title: `Clearance for ${studentId}`,
      message: String(dto?.reason || 'Student clearance initiated by front office'),
      payload: { ...dto, approved_steps: [] },
    });
    return { success: true, message: 'Student clearance initiated', clearance: event };
  }

  async approveClearanceStep(id: string, dto: any) {
    const step = this.operations.requiredText(dto?.step, 'Clearance step');
    return this.updateWorkflowEventStatus(id, 'pending', 'frontoffice.clearance_step_approved', { approved_step: step }, 'frontoffice.clearance_started');
  }

  async updateWorkflowEventStatus(
    id: string,
    status: string,
    auditAction: string,
    extraPayload: Record<string, unknown> = {},
    expectedEventType: string | null = null,
  ) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET status = $3,
            payload = payload || $4::jsonb,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND ($5::text IS NULL OR event_type = $5)
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Workflow ID'), status, JSON.stringify(extraPayload), expectedEventType],
    );
    const event = result.rows[0];
    if (!event) throw new NotFoundException('Workflow item was not found in this school');
    await this.operations.recordAudit(tenantId, auditAction, event.entity_type || 'workflow_event', event.id, { event }, userId);
    return { success: true, message: 'Workflow item updated', event };
  }

  async completeWorkflowEvent(id: string, auditAction: string, expectedEventType: string | null = null) {
    return this.updateWorkflowEventStatus(id, 'completed', auditAction, {}, expectedEventType);
  }

  async getDocumentArtifact(id: string, mode: 'download' | 'print') {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT id::text, title, message, payload, created_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'frontoffice.document_created'
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Document ID')],
    );
    const document = result.rows[0];
    if (!document) throw new NotFoundException('Document was not found in this school');
    const artifact = document.payload?.artifact;
    if (!artifact?.content_base64 || !artifact?.filename || !artifact?.content_type) {
      throw new NotFoundException('This document does not have a stored downloadable artifact');
    }
    await this.operations.recordAudit(
      tenantId,
      `frontoffice.document_${mode}`,
      'workflow_event',
      document.id,
      { mode, artifact_filename: artifact.filename, source_dashboard: 'secretary-letters-workspace' },
      this.currentUserId(),
    );
    return { success: true, message: `Document artifact ready to ${mode}`, document, artifact, mode };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'secretary-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || null;
    const [overview, visitors, appointments, callsLog, receptionQueue, parentMessages, lettersDocuments, studentClearance] = await Promise.all([
      this.getOverview(),
      this.getVisitors(),
      this.getAppointments(),
      this.getCallsLog(),
      this.getReceptionQueue(),
      this.getParentMessages(),
      this.getLettersDocuments(),
      this.getStudentClearance(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'secretary-command',
      reportId: 'front-office-operations',
      title: String(dto?.name || dto?.title || 'Front office operations report'),
      format: dto?.format,
      generatedByUserId: this.operations.uuidOrNull(userId),
      sections: { overview, visitors, appointments, callsLog, receptionQueue, parentMessages, lettersDocuments, studentClearance },
      filters: { requested_from: 'secretary-dashboard' },
      targetRoles: ['principal', 'secretary'],
    });
  }

  async downloadReport(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT snapshot_id AS "snapshotId", title, format, artifact, manifest, created_at::text AS "generatedDate"
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = 'secretary-command'
          AND (id::text = $2 OR snapshot_id = $2)
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Report ID')],
    );
    const report = result.rows[0];
    if (!report) throw new NotFoundException('Report was not found in this school');
    return { success: true, message: 'Report artifact ready', report };
  }

  async recordAction(dto: any) {
    const action = String(dto?.action || 'workflow_action')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'workflow_action';
    const title = String(dto?.title || `Front office ${action.replace(/_/g, ' ')}`).trim();
    const message = String(dto?.description || dto?.message || title).trim();
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.workflow_action',
      entityType: String(dto?.entityType || 'frontoffice_workflow'),
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      targetRoles: ['secretary', 'principal', 'deputy_principal'],
      payload: {
        ...dto,
        action,
        source_dashboard: 'secretary-command-center',
      },
    });
    return { success: true, message: 'Front office workflow saved and routed', event };
  }
}
