import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class BoardingMasterCommandService {
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
        (SELECT COUNT(*)::int FROM boarding_hostels WHERE tenant_id = $1) as "totalHostels",
        (SELECT COUNT(*)::int FROM boarding_rooms WHERE tenant_id = $1) as "totalRooms",
        (SELECT COUNT(*)::int FROM boarding_allocations WHERE tenant_id = $1) as "totalAllocated",
        (SELECT COUNT(*)::int FROM boarding_incidents WHERE tenant_id = $1 AND status = 'open') as "activeIncidents"
    `, [tenantId]);

    const row = metrics.rows[0] || { totalHostels: 0, totalRooms: 0, totalAllocated: 0, activeIncidents: 0 };
    return {
      metrics: {
        totalHostels: row.totalHostels || 0,
        totalRooms: row.totalRooms || 0,
        totalAllocated: row.totalAllocated || 0,
        activeIncidents: row.activeIncidents || 0,
      },
      hostelSummary: []
    };
  }

  async getHostels() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM boarding_hostels WHERE tenant_id = $1 ORDER BY name ASC`,
      [tenantId]
    );
    return res.rows;
  }

  async createHostel(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        INSERT INTO boarding_hostels (tenant_id, hostel_name, capacity, gender_allowed, warden_id, status)
        VALUES ($1::uuid, $2, $3, $4, $5::uuid, 'ACTIVE')
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.hostel_name ?? dto?.name, 'Hostel name'),
        Math.max(1, Number(dto?.capacity || 1)),
        dto?.gender_allowed ?? dto?.gender ?? 'mixed',
        this.operations.uuidOrNull(dto?.warden_id ?? dto?.wardenId),
      ],
    );
    const hostel = result.rows[0];
    await this.operations.recordAudit(tenantId, 'boarding.hostel_created', 'boarding_hostel', hostel.id, { hostel }, userId);
    return { success: true, message: 'Hostel created', hostel };
  }

  async updateHostel(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE boarding_hostels
        SET hostel_name = COALESCE(NULLIF($3, ''), hostel_name),
            capacity = COALESCE($4, capacity),
            gender_allowed = COALESCE(NULLIF($5, ''), gender_allowed),
            warden_id = COALESCE($6::uuid, warden_id),
            status = COALESCE(NULLIF($7, ''), status),
            updated_at = NOW()
        WHERE tenant_id::text = $1 AND id = $2::uuid
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Hostel ID'),
        dto?.hostel_name ?? dto?.name ?? null,
        dto?.capacity ?? null,
        dto?.gender_allowed ?? dto?.gender ?? null,
        this.operations.uuidOrNull(dto?.warden_id ?? dto?.wardenId),
        dto?.status ?? null,
      ],
    );
    const hostel = result.rows[0];
    if (!hostel) throw new NotFoundException('Hostel was not found in this school');
    await this.operations.recordAudit(tenantId, 'boarding.hostel_updated', 'boarding_hostel', hostel.id, { hostel, changes: dto }, userId);
    return { success: true, message: 'Hostel updated', hostel };
  }

  async getRoomsBeds() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          MIN(b.id)::text AS id,
          COALESCE(h.hostel_name, 'Unassigned Hostel') AS hostel,
          b.room_number,
          COUNT(b.id)::int AS capacity,
          COUNT(b.id) FILTER (WHERE b.assigned_student_id IS NOT NULL OR b.status = 'OCCUPIED')::int AS occupied,
          CASE
            WHEN COUNT(b.id) FILTER (WHERE b.status = 'AVAILABLE') > 0 THEN 'Available'
            ELSE 'Active'
          END AS status
        FROM boarding_beds b
        LEFT JOIN boarding_hostels h ON h.id = b.hostel_id AND h.tenant_id::text = b.tenant_id::text
        WHERE b.tenant_id::text = $1
        GROUP BY h.hostel_name, b.room_number
        ORDER BY h.hostel_name ASC, b.room_number ASC
      `,
      [tenantId]
    );
    const roomsbedsList = res.rows;
    return {
      metrics: {
        total_rooms: roomsbedsList.length,
        total_beds: roomsbedsList.reduce((sum: number, room: any) => sum + Number(room.capacity || 0), 0),
        available_beds: roomsbedsList.reduce((sum: number, room: any) => sum + Math.max(0, Number(room.capacity || 0) - Number(room.occupied || 0)), 0),
      },
      roomsbedsList,
    };
  }

  async createRoom(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const hostelId = this.operations.requiredText(dto?.hostel_id ?? dto?.hostelId, 'Hostel');
    const roomNumber = this.operations.requiredText(dto?.room_number ?? dto?.roomNumber, 'Room number');
    const capacity = Math.max(1, Number(dto?.capacity || dto?.beds || 1));
    const values = Array.from({ length: capacity }, (_, index) => `($1::uuid, $2::uuid, $3, $${index + 4}, 'AVAILABLE')`).join(', ');
    const params = [tenantId, hostelId, roomNumber, ...Array.from({ length: capacity }, (_, index) => String(dto?.bed_prefix || 'B') + String(index + 1).padStart(2, '0'))];
    const result = await this.operations.writeSql(
      `
        INSERT INTO boarding_beds (tenant_id, hostel_id, room_number, bed_number, status)
        VALUES ${values}
        RETURNING *
      `,
      params,
    );
    await this.operations.recordAudit(tenantId, 'boarding.room_created', 'boarding_bed', result.rows[0]?.id ?? null, { roomNumber, capacity }, userId);
    return { success: true, message: 'Room beds created', beds: result.rows };
  }

  async updateBedStatus(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const status = this.operations.requiredText(dto?.status, 'Bed status').toUpperCase();
    const result = await this.operations.writeSql(
      `
        UPDATE boarding_beds
        SET status = $3, updated_at = NOW()
        WHERE tenant_id::text = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Bed ID'), status],
    );
    const bed = result.rows[0];
    if (!bed) throw new NotFoundException('Bed was not found in this school');
    await this.operations.recordAudit(tenantId, 'boarding.bed_status_updated', 'boarding_bed', bed.id, { bed }, userId);
    return { success: true, message: 'Bed status updated', bed };
  }

  async getAllocation() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM boarding_allocations WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async createAllocation(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.requestContext.getStore()?.user_id);
    const studentId = this.operations.requiredText(dto?.studentId ?? dto?.student_id, 'Student');
    const bedId = this.operations.requiredText(dto?.bedId ?? dto?.bed_id, 'Bed');
    const result = await this.operations.writeSql(
      `
        WITH target_student AS (
          SELECT id
          FROM students
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND status IN ('active', 'enrolled')
          LIMIT 1
        ),
        target_bed AS (
          SELECT id
          FROM boarding_beds
          WHERE tenant_id::text = $1
            AND id = $3::uuid
            AND COALESCE(status, 'AVAILABLE') IN ('AVAILABLE', 'active', 'ACTIVE')
          LIMIT 1
        ),
        inserted AS (
          INSERT INTO boarding_allocations (tenant_id, student_id, bed_id, created_by)
          SELECT $1, target_student.id, target_bed.id, $4::uuid
          FROM target_student, target_bed
          RETURNING *
        ),
        updated_bed AS (
          UPDATE boarding_beds
          SET assigned_student_id = $2::uuid,
              status = 'OCCUPIED',
              updated_at = NOW()
          WHERE tenant_id::text = $1
            AND id = $3::uuid
            AND EXISTS (SELECT 1 FROM inserted)
          RETURNING id::text
        )
        SELECT inserted.*, updated_bed.id AS "updatedBedId"
        FROM inserted
        LEFT JOIN updated_bed ON TRUE
      `,
      [tenantId, studentId, bedId, userId],
    );
    const allocation = result.rows[0];
    if (!allocation) {
      throw new InternalServerErrorException('Bed allocation could not be created. Confirm the student and bed belong to this school and are available.');
    }
    await this.operations.recordAudit(tenantId, 'boarding.bed_allocated', 'boarding_allocation', allocation.id, { allocation }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `boarding-bed-allocated-${allocation.id}`,
      type: 'boarding.bed_allocated',
      title: 'Boarding bed allocated',
      body: `A boarding bed was allocated to student ${studentId}.`,
      targetRoles: ['principal', 'boarding_master', 'class_teacher'],
      metadata: { allocation },
    });
    return { success: true, message: 'Bed allocated and occupancy updated', allocation };
  }

  async deallocateStudent(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const result = await this.operations.writeSql(
      `
        WITH released AS (
          UPDATE boarding_allocations
          SET status = 'released',
              released_by = $3::uuid,
              released_at = NOW(),
              release_reason = 'Released from boarding master dashboard',
              updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid AND status = 'active'
          RETURNING *
        ),
        bed_update AS (
          UPDATE boarding_beds
          SET assigned_student_id = NULL,
              status = 'AVAILABLE',
              updated_at = NOW()
          WHERE tenant_id::text = $1
            AND id IN (SELECT bed_id FROM released)
          RETURNING id::text
        )
        SELECT released.*, bed_update.id AS "updatedBedId"
        FROM released
        LEFT JOIN bed_update ON TRUE
      `,
      [tenantId, this.operations.requiredText(id, 'Allocation ID'), userId],
    );
    const allocation = result.rows[0];
    if (!allocation) throw new BadRequestException('Allocation was not found or is already released');
    await this.operations.recordAudit(tenantId, 'boarding.bed_released', 'boarding_allocation', allocation.id, { allocation }, userId);
    return { success: true, message: 'Student deallocated and bed released', allocation };
  }

  async getBoardingAttendance() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM boarding_attendance_logs WHERE tenant_id = $1 ORDER BY log_date DESC, created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async submitRollCall(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        INSERT INTO boarding_dormitory_checks (tenant_id, house_id, checked_by_user_id, check_status, notes, checked_at)
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, NOW())
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(dto?.house_id ?? dto?.houseId),
        this.operations.uuidOrNull(userId),
        dto?.status || dto?.check_status || 'clear',
        JSON.stringify(dto),
      ],
    );
    const rollCall = result.rows[0];
    await this.operations.recordAudit(tenantId, 'boarding.roll_call_submitted', 'boarding_dormitory_check', rollCall.id, { rollCall }, userId);
    return { success: true, message: 'Roll call submitted', rollCall };
  }

  async getLeaveExit() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          id::text,
          student_id::text,
          student_name,
          hostel,
          leave_type,
          from_date::text,
          to_date::text,
          guardian_name,
          guardian_phone,
          reason,
          status,
          approved_by::text,
          rejected_by::text,
          decision_reason,
          checked_out_by::text,
          checked_out_at::text,
          returned_at::text,
          created_at::text,
          updated_at::text
        FROM boarding_exeats
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId]
    );
    const rows = res.rows.map((row: any) => this.formatLeaveExitRow(row));
    const today = new Date().toISOString().slice(0, 10);
    return {
      metrics: {
        pending_requests: rows.filter((row: any) => row.status === 'Pending').length,
        approved: rows.filter((row: any) => row.status === 'Approved').length,
        on_leave_now: rows.filter((row: any) => (
          row.status === 'Checked Out' ||
          (row.status === 'Approved' && String(row.from_date || '') <= today && String(row.to_date || '') >= today)
        )).length,
      },
      leaveexitList: rows,
    };
  }

  async createLeaveRequest(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const studentName = this.operations.requiredText(dto?.student_name ?? dto?.studentName ?? dto?.student, 'Student name');
    const leaveType = this.operations.requiredText(dto?.leave_type ?? dto?.leaveType, 'Leave type');
    const fromDate = this.operations.requiredText(dto?.from_date ?? dto?.fromDate, 'From date');
    const toDate = this.operations.requiredText(dto?.to_date ?? dto?.toDate ?? dto?.expected_return ?? dto?.expectedReturn, 'To date');
    const reason = this.operations.requiredText(dto?.reason, 'Reason');
    const result = await this.operations.writeSql(
      `
        INSERT INTO boarding_exeats (
          tenant_id, student_id, student_name, hostel, leave_type, from_date, to_date,
          guardian_name, guardian_phone, reason, requested_by, metadata
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6::date, $7::date, $8, $9, $10, $11::uuid, $12::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(dto?.student_id ?? dto?.studentId),
        studentName,
        dto?.hostel ?? dto?.dorm ?? null,
        leaveType,
        fromDate,
        toDate,
        dto?.guardian_name ?? dto?.guardianName ?? dto?.parent ?? null,
        dto?.guardian_phone ?? dto?.guardianPhone ?? dto?.parentPhone ?? null,
        reason,
        this.operations.uuidOrNull(userId),
        JSON.stringify(dto),
      ],
    );
    const leave = this.formatLeaveExitRow(result.rows[0]);
    await this.operations.recordAudit(tenantId, 'boarding.exeat_requested', 'boarding_exeat', leave.id, { leave }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `boarding-exeat-${leave.id}`,
      type: 'boarding.exeat_requested',
      title: `${studentName} leave request created`,
      body: `${studentName} requested ${leaveType} from ${fromDate} to ${toDate}.`,
      targetRoles: ['boarding_master', 'deputy_principal', 'principal'],
      metadata: { leaveId: leave.id, student_id: dto?.student_id ?? dto?.studentId ?? null },
    });
    return { success: true, message: 'Leave request created', leave };
  }

  async actionLeaveRequest(id: string, action: 'approved' | 'rejected' | 'checked_out', dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const leaveRequestId = this.operations.requiredText(id, 'Leave request ID');
    const decisionReason = action === 'rejected'
      ? this.operations.requiredText(dto?.reason, 'Rejection reason')
      : (dto?.reason ? String(dto.reason).trim() : null);
    const actionSql = action === 'approved'
      ? `
        UPDATE boarding_exeats
        SET status = $3,
            approved_by = $4::uuid,
            decision_reason = COALESCE($5, decision_reason),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `
      : action === 'rejected'
        ? `
        UPDATE boarding_exeats
        SET status = $3,
            rejected_by = $4::uuid,
            decision_reason = $5,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `
        : `
        UPDATE boarding_exeats
        SET status = $3,
            checked_out_by = $4::uuid,
            decision_reason = COALESCE($5, decision_reason),
            checked_out_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status IN ('approved', 'checked_out')
        RETURNING *
      `;
    const result = await this.operations.writeSql(
      actionSql,
      [tenantId, leaveRequestId, action, this.operations.uuidOrNull(userId), decisionReason],
    );
    const leave = this.formatLeaveExitRow(result.rows[0]);
    if (!leave) throw new NotFoundException('Leave request was not found in this school');
    await this.operations.recordAudit(tenantId, `boarding.exeat_${action}`, 'boarding_exeat', leave.id, { leave }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `boarding-exeat-${action}-${leave.id}`,
      type: `boarding.exeat_${action}`,
      title: `${leave.student_name || 'Boarder'} leave request ${action.replace('_', ' ')}`,
      body: `${leave.student_name || 'Boarder'} leave request is now ${action.replace('_', ' ')}.`,
      targetRoles: action === 'checked_out' ? ['boarding_master', 'security_officer', 'principal'] : ['boarding_master', 'deputy_principal', 'principal'],
      metadata: { leaveId: leave.id, status: action },
    });
    return { success: true, message: `Leave request ${action}`, leave };
  }

  private formatLeaveExitRow(row: any) {
    if (!row) return row;
    const status = this.titleCaseStatus(row.status);
    return {
      ...row,
      status,
      student_name: row.student_name ?? row.student ?? 'Boarder not linked',
      hostel: row.hostel ?? row.dorm ?? 'Unassigned hostel',
      leave_type: row.leave_type ?? row.leaveType ?? 'Leave',
      from_date: row.from_date ?? row.fromDate ?? '',
      to_date: row.to_date ?? row.toDate ?? row.expected_return ?? '',
      guardian_name: row.guardian_name ?? row.parent ?? '',
      approved_by: row.approved_by ?? '',
    };
  }

  private titleCaseStatus(status: unknown) {
    const normalized = String(status || 'pending').replace(/_/g, ' ').trim();
    return normalized
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || 'Pending';
  }

  async getIncidents() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM boarding_incidents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async reportIncident(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        INSERT INTO boarding_incidents (tenant_id, house_id, student_id, title, severity, status)
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, 'open')
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(dto?.house_id ?? dto?.houseId),
        this.operations.uuidOrNull(dto?.student_id ?? dto?.studentId),
        this.operations.requiredText(dto?.title ?? dto?.description ?? dto?.reason, 'Incident title'),
        dto?.severity || 'warning',
      ],
    );
    const incident = result.rows[0];
    await this.operations.recordAudit(tenantId, 'boarding.incident_reported', 'boarding_incident', incident.id, { incident, dto }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `boarding-incident-${incident.id}`,
      type: 'boarding.incident_reported',
      title: incident.title,
      body: `Boarding incident reported with severity ${incident.severity}.`,
      targetRoles: ['principal', 'boarding_master'],
      metadata: { incident },
    });
    return { success: true, message: 'Boarding incident reported', incident };
  }

  async updateIncidentStatus(id: string, status: 'escalated' | 'resolved', dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE boarding_incidents
        SET status = $3,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Incident ID'), status],
    );
    const incident = result.rows[0];
    if (!incident) throw new NotFoundException('Boarding incident was not found in this school');
    await this.operations.recordAudit(tenantId, `boarding.incident_${status}`, 'boarding_incident', incident.id, { incident, dto }, userId);
    return { success: true, message: `Incident ${status}`, incident };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM boarding_reports WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || 'system';
    const reportType = String(dto?.report_type || dto?.type || 'boarding_report').trim().slice(0, 120);
    const generatedFrom = String(dto?.generated_from || 'boarding-master-command').trim().slice(0, 120);
    const result = await this.executeSql(
      `
        INSERT INTO boarding_reports (
          tenant_id, report_type, status, generated_by_user_id, generated_from, metadata
        )
        VALUES ($1, $2, 'queued', $3, $4, $5::jsonb)
        RETURNING id::text, tenant_id, report_type, status, generated_by_user_id, generated_from, created_at
      `,
      [
        tenantId,
        reportType || 'boarding_report',
        userId,
        generatedFrom,
        JSON.stringify({
          requested_at: new Date().toISOString(),
          source_dashboard: 'boarding_master',
        }),
      ],
    );

    const report = result.rows[0];
    if (!report) {
      throw new InternalServerErrorException('Boarding report could not be queued for generation');
    }

    await this.executeSql(
      `
        INSERT INTO boarding_audit_logs (
          tenant_id, actor_user_id, action, resource_type, resource_id, metadata
        )
        VALUES ($1, $2, 'boarding.report_queued', 'boarding_report', $3::uuid, $4::jsonb)
      `,
      [
        tenantId,
        userId,
        report.id,
        JSON.stringify({ report_type: report.report_type, status: report.status }),
      ],
    );

    return { success: true, message: 'Boarding report queued for generation', report };
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const action = this.operations.requiredText(dto?.action ?? 'boarding_action', 'Action');
    const title = this.operations.requiredText(dto?.title ?? 'Boarding action', 'Action title');
    const message = String(dto?.message || dto?.body || `${title} recorded from boarding dashboard`);
    const targetRoles = Array.isArray(dto?.targetRoles) && dto.targetRoles.length > 0
      ? dto.targetRoles.map((role: unknown) => String(role))
      : ['boarding_master', 'principal'];
    const event = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type,
          entity_id, title, message, priority, status, payload
        )
        VALUES ($1, $2::uuid, 'boarding_master', $3::jsonb, $4, 'boarding_action',
          NULL, $5, $6, $7, 'pending', $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(targetRoles),
        `boarding.${action}`,
        title,
        message,
        dto?.priority ?? 'normal',
        JSON.stringify({
          ...(dto?.payload && typeof dto.payload === 'object' ? dto.payload : {}),
          action,
          source_dashboard: 'boarding-master-command',
        }),
      ],
    );
    const record = event.rows[0];
    await this.operations.notifyRoles(tenantId, {
      key: `boarding-action-${action}-${record?.id ?? Date.now()}`,
      type: `boarding.${action}`,
      title,
      body: message,
      targetRoles,
      metadata: { event_id: record?.id, action },
    });
    await this.operations.recordAudit(tenantId, `boarding.${action}`, 'workflow_event', record?.id ?? null, { dto }, userId);
    return { success: true, event: record };
  }
}
