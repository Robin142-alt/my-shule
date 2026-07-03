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
        SELECT id::text, title, message, status, priority, payload, created_at::text, updated_at::text
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
    try {
      return await this.prisma.query<T>(query, params);
    } catch (e) {
      return { rows: [], rowCount: 0 };
    }
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
    return this.listWorkflowEvents('frontoffice.call_logged');
  }

  async logCall(dto: any) {
    const caller = this.operations.requiredText(dto?.caller ?? dto?.caller_name ?? dto?.phone_number, 'Caller');
    const message = this.operations.requiredText(dto?.message ?? dto?.notes ?? dto?.summary, 'Call notes');
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.call_logged',
      entityType: 'frontoffice_call',
      title: `Call from ${caller}`,
      message,
      payload: { ...dto, caller },
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
    return this.listWorkflowEvents('frontoffice.parent_message');
  }

  async sendParentMessage(dto: any) {
    const message = this.operations.requiredText(dto?.message ?? dto?.body, 'Message');
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.parent_message',
      entityType: 'parent_message',
      title: String(dto?.subject || 'Parent message'),
      message,
      targetRoles: ['secretary', 'principal'],
      payload: dto,
    });
    await this.operations.notifyRoles(this.requireTenantId(), {
      key: `secretary-parent-message-${event.id}`,
      type: 'frontoffice.parent_message',
      title: event.title,
      body: message,
      targetRoles: ['principal', 'secretary'],
      metadata: { event },
    });
    return { success: true, message: 'Parent message recorded and routed', parentMessage: event };
  }

  async replyToMessage(id: string, dto: any) {
    const reply = this.operations.requiredText(dto?.message ?? dto?.reply, 'Reply');
    return this.updateWorkflowEventStatus(id, 'replied', 'frontoffice.parent_message_replied', { reply });
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
    return this.listWorkflowEvents('frontoffice.document_created');
  }

  async createDocument(dto: any) {
    const title = this.operations.requiredText(dto?.title ?? dto?.name, 'Document title');
    const body = this.operations.requiredText(dto?.body ?? dto?.content ?? dto?.description, 'Document content');
    const event = await this.createWorkflowEvent({
      eventType: 'frontoffice.document_created',
      entityType: 'frontoffice_document',
      title,
      message: body.slice(0, 240),
      status: 'generated',
      payload: { ...dto, artifact: { kind: 'frontoffice-document', title, body, generated_at: new Date().toISOString() } },
    });
    return { success: true, message: 'Document generated', document: event };
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
    return this.updateWorkflowEventStatus(id, 'pending', 'frontoffice.clearance_step_approved', { approved_step: step });
  }

  async updateWorkflowEventStatus(id: string, status: string, auditAction: string, extraPayload: Record<string, unknown> = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET status = $3,
            payload = payload || $4::jsonb,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Workflow ID'), status, JSON.stringify(extraPayload)],
    );
    const event = result.rows[0];
    if (!event) throw new NotFoundException('Workflow item was not found in this school');
    await this.operations.recordAudit(tenantId, auditAction, event.entity_type || 'workflow_event', event.id, { event }, userId);
    return { success: true, message: 'Workflow item updated', event };
  }

  async completeWorkflowEvent(id: string, auditAction: string) {
    return this.updateWorkflowEventStatus(id, 'completed', auditAction);
  }

  async getDocumentArtifact(id: string, mode: 'download' | 'print') {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT id::text, title, message, payload, created_at::text
        FROM workflow_events
        WHERE tenant_id = $1 AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Document ID')],
    );
    const document = result.rows[0];
    if (!document) throw new NotFoundException('Document was not found in this school');
    return { success: true, message: `Document ready to ${mode}`, document, mode };
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
