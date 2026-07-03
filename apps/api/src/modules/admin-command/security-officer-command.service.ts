import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

@Injectable()
export class SecurityOfficerCommandService {
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
        (SELECT COUNT(*)::int FROM visitors_logs WHERE tenant_id = $1 AND time_in::date = CURRENT_DATE AND status = 'active') as "activeVisitors",
        (SELECT COUNT(*)::int FROM security_incidents WHERE tenant_id = $1 AND lower(status) IN ('open', 'reported', 'active')) as "activeIncidents"
    `, [tenantId]);

    const row = metrics.rows[0] || { activeVisitors: 0, activeIncidents: 0 };
    return {
      metrics: {
        activeVisitors: row.activeVisitors || 0,
        activeIncidents: row.activeIncidents || 0,
        unauthorizedExits: 0,
      },
      gateLogs: []
    };
  }

  async getVisitors() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM visitors_logs WHERE tenant_id = $1 ORDER BY time_in DESC LIMIT 100`,
      [tenantId]
    );
    return res.rows;
  }

  async checkInExpectedVisitor(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        WITH appointment AS (
          UPDATE visitors_appointments
          SET status = 'completed', updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND lower(status) IN ('scheduled', 'pending')
          RETURNING *
        ), visitor AS (
          INSERT INTO visitors_logs (
            tenant_id, visitor_id, visitor_name, purpose, host_user_id, badge_number, logged_by_user_id
          )
          SELECT tenant_id, visitor_id, visitor_name, purpose, host_user_id,
                 'VIS-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(left(id::text, 6)), $3
          FROM appointment
          RETURNING *
        )
        SELECT row_to_json(appointment) AS appointment, row_to_json(visitor) AS visitor
        FROM appointment CROSS JOIN visitor
      `,
      [tenantId, this.operations.requiredText(id, 'Expected visitor ID'), userId || 'system'],
    );
    const record = result.rows[0] as { appointment?: any; visitor?: any } | undefined;
    if (!record?.appointment || !record.visitor) {
      throw new NotFoundException('The expected visitor was not found, was already checked in, or belongs to another school');
    }
    await this.operations.recordAudit(tenantId, 'security.expected_visitor_checked_in', 'visitor_log', record.visitor.id, record, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-expected-visitor-checked-in-${record.visitor.id}`,
      type: 'security.expected_visitor_checked_in',
      title: `${record.visitor.visitor_name} checked in`,
      body: `${record.visitor.visitor_name} arrived for ${record.visitor.purpose}.`,
      targetRoles: ['secretary', 'security', 'principal'],
      metadata: record,
    });
    return { success: true, message: 'Expected visitor checked in and appointment completed', ...record };
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
    await this.operations.recordAudit(tenantId, 'security.visitor_checked_in', 'visitor_log', visitor.id, { visitor }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-visitor-checked-in-${visitor.id}`,
      type: 'security.visitor_checked_in',
      title: `${visitorName} checked in`,
      body: `${visitorName} checked in for ${purpose}.`,
      targetRoles: ['secretary', 'security', 'principal'],
      metadata: { visitor },
    });
    return { success: true, message: 'Visitor checked in and reception notified', visitor };
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
    await this.operations.recordAudit(tenantId, 'security.visitor_checked_out', 'visitor_log', visitor.id, { visitor }, userId);
    return { success: true, message: 'Visitor checked out', visitor };
  }

  async flagVisitor(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const visitor = await this.operations.readSql(
      `SELECT * FROM visitors_logs WHERE tenant_id = $1 AND id = $2::uuid LIMIT 1`,
      [tenantId, this.operations.requiredText(id, 'Visitor log ID')],
    );
    const row = visitor.rows[0];
    if (!row) throw new NotFoundException('Visitor was not found in this school');
    const reason = this.operations.requiredText(dto?.reason, 'Flag reason');
    const incident = await this.reportIncident({
      title: `Flagged visitor: ${row.visitor_name}`,
      description: reason,
      severity: 'medium',
      location: 'School gate',
    });
    await this.operations.recordAudit(tenantId, 'security.visitor_flagged', 'visitor_log', row.id, { visitor: row, reason, incident }, userId);
    return { success: true, message: 'Visitor flagged and incident created', visitor: row, incident: incident.incident };
  }

  async printVisitorBadge(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE visitors_logs
        SET badge_number = COALESCE(NULLIF(badge_number, ''), 'VIS-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(left(id::text, 6))),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING id::text, visitor_name, purpose, host_user_id, badge_number, time_in
      `,
      [tenantId, this.operations.requiredText(id, 'Visitor log ID')],
    );
    const badge = result.rows[0];
    if (!badge) throw new NotFoundException('Visitor was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.visitor_badge_generated', 'visitor_log', badge.id, { badge }, userId);
    return { success: true, message: 'Visitor badge generated', badge };
  }

  async getLostFoundItems() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
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
    const foundLocation = this.operations.requiredText(dto?.found_location ?? dto?.foundLocation ?? dto?.location ?? 'School gate', 'Found location');
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
        JSON.stringify({ source_dashboard: 'security-officer-dashboard' }),
      ],
    );
    const item = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.lost_item_recorded', 'security_lost_found', item.id, { item }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-lost-item-recorded-${item.id}`,
      type: 'security.lost_item_recorded',
      title: `Lost item recorded: ${item.item_name}`,
      body: `${item.item_name} was recorded at ${item.found_location}.`,
      targetRoles: ['security', 'secretary', 'principal'],
      metadata: { item },
    });
    return { success: true, message: 'Lost item recorded', item };
  }

  async claimLostFoundItem(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const claimantName = this.operations.requiredText(dto?.claimant_name ?? dto?.claimantName, 'Claimant name');
    const verificationNotes = this.operations.requiredText(dto?.verification_notes ?? dto?.verificationNotes ?? dto?.notes, 'Verification notes');
    const result = await this.operations.writeSql(
      `
        UPDATE security_lost_found
        SET status = 'claimed',
            claimant_name = $3,
            verification_notes = $4,
            claimed_by = $5,
            claimed_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'found'
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Lost item ID'),
        claimantName,
        verificationNotes,
        this.operations.uuidOrNull(userId),
      ],
    );
    const item = result.rows[0];
    if (!item) throw new NotFoundException('Lost item was not found, already claimed, or belongs to another school');
    await this.operations.recordAudit(tenantId, 'security.lost_item_claimed', 'security_lost_found', item.id, { item }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-lost-item-claimed-${item.id}`,
      type: 'security.lost_item_claimed',
      title: `Lost item claimed: ${item.item_name}`,
      body: `${item.item_name} was released to ${claimantName} after verification.`,
      targetRoles: ['security', 'secretary', 'principal'],
      metadata: { item },
    });
    return { success: true, message: 'Lost item marked claimed', item };
  }

  async getGateRegister() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM visitors_logs WHERE tenant_id = $1 ORDER BY time_in DESC LIMIT 200`,
      [tenantId]
    );
    return res.rows;
  }

  async getStudentExitPasses() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM student_exits WHERE tenant_id = $1 ORDER BY exit_time DESC, created_at DESC LIMIT 100`,
      [tenantId]
    );
    return res.rows;
  }

  async flagUnauthorizedExit(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const studentRef = this.operations.requiredText(dto?.studentId ?? dto?.student_id ?? dto?.exitId ?? dto?.exit_id, 'Student or exit pass');
    const actorUserId = this.operations.uuidOrNull(userId);
    if (!actorUserId) {
      throw new UnauthorizedException('A valid user is required to flag a security incident');
    }
    const result = await this.operations.writeSql(
      `
        INSERT INTO security_incidents (tenant_id, title, description, severity, location, status, reported_by)
        VALUES ($1, 'Unauthorized Exit Attempt', $2, 'high', COALESCE($3, 'School gate'), 'Reported', $4::uuid)
        RETURNING *
      `,
      [
        tenantId,
        String(dto?.description || `Unauthorized student exit attempt recorded for ${studentRef}`),
        dto?.location || null,
        actorUserId,
      ],
    );
    const incident = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.unauthorized_exit_flagged', 'security_incident', incident.id, { incident, studentRef }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-unauthorized-exit-${incident.id}`,
      type: 'security.unauthorized_exit_flagged',
      title: 'Unauthorized exit flagged',
      body: `Security flagged an unauthorized exit attempt for ${studentRef}.`,
      targetRoles: ['principal', 'deputy_principal', 'discipline_master', 'security'],
      metadata: { incident, studentRef },
    });
    return { success: true, message: 'Unauthorized exit incident created and routed', incident };
  }

  async verifyExitPass(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE student_exits
        SET status = CASE WHEN status = 'pending' THEN 'verified' ELSE status END,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Exit pass ID')],
    );
    const exitPass = result.rows[0];
    if (!exitPass) throw new NotFoundException('Exit pass was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.exit_pass_verified', 'student_exit', exitPass.id, { exitPass }, userId);
    return { success: true, message: 'Exit pass verified', exitPass };
  }

  async logStudentExit(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE student_exits
        SET status = 'out', time_out = COALESCE(time_out, NOW()), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Exit pass ID')],
    );
    const exitPass = result.rows[0];
    if (!exitPass) throw new NotFoundException('Exit pass was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.student_exit_logged', 'student_exit', exitPass.id, { exitPass }, userId);
    return { success: true, message: 'Student exit logged', exitPass };
  }

  async logStudentReturn(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE student_exits
        SET status = 'returned', time_in = NOW(), updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Exit pass ID')],
    );
    const exitPass = result.rows[0];
    if (!exitPass) throw new NotFoundException('Exit pass was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.student_return_logged', 'student_exit', exitPass.id, { exitPass }, userId);
    return { success: true, message: 'Student return logged', exitPass };
  }

  async getBoardingMovements() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
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
          reason,
          status,
          checked_out_at::text,
          returned_at::text,
          metadata
        FROM boarding_exeats
        WHERE tenant_id = $1
          AND status IN ('approved', 'checked_out', 'returned')
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async verifyBoardingMovement(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE boarding_exeats
        SET status = CASE WHEN status = 'approved' THEN 'checked_out' ELSE status END,
            checked_out_by = COALESCE(checked_out_by, $3),
            checked_out_at = COALESCE(checked_out_at, NOW()),
            metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
              'gate_verified_at', NOW(),
              'gate_verified_by', $3
            ),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status IN ('approved', 'checked_out')
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Boarding movement ID'), this.operations.uuidOrNull(userId)],
    );
    const movement = result.rows[0];
    if (!movement) throw new NotFoundException('Boarding movement was not found, not approved, or belongs to another school');
    await this.operations.recordAudit(tenantId, 'security.boarding_pass_verified', 'boarding_exeat', movement.id, { movement }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-boarding-pass-verified-${movement.id}`,
      type: 'security.boarding_pass_verified',
      title: `Boarding pass verified: ${movement.student_name}`,
      body: `${movement.student_name} was verified at the gate for ${movement.leave_type}.`,
      targetRoles: ['boarding_master', 'security', 'deputy_principal'],
      metadata: { movement },
    });
    return { success: true, message: 'Boarding pass verified at the gate', movement };
  }

  async recordBoardingReturn(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE boarding_exeats
        SET status = 'returned',
            returned_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'checked_out'
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Boarding movement ID')],
    );
    const movement = result.rows[0];
    if (!movement) throw new NotFoundException('Checked-out boarding movement was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.boarding_return_recorded', 'boarding_exeat', movement.id, { movement }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-boarding-return-${movement.id}`,
      type: 'security.boarding_return_recorded',
      title: `Boarder returned: ${movement.student_name}`,
      body: `${movement.student_name} returned through the gate.`,
      targetRoles: ['boarding_master', 'security', 'deputy_principal'],
      metadata: { movement },
    });
    return { success: true, message: 'Boarding return recorded', movement };
  }

  async notifyBoardingMaster(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.readSql(
      `
        SELECT *
        FROM boarding_exeats
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Boarding movement ID')],
    );
    const movement = result.rows[0];
    if (!movement) throw new NotFoundException('Boarding movement was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.boarding_master_notified', 'boarding_exeat', movement.id, { movement }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-boarding-master-notified-${movement.id}`,
      type: 'security.boarding_master_notified',
      title: `Boarding gate follow-up: ${movement.student_name}`,
      body: `Security requested boarding master follow-up for ${movement.student_name}.`,
      targetRoles: ['boarding_master', 'deputy_principal', 'security'],
      metadata: { movement },
    });
    return { success: true, message: 'Boarding master notified', movement };
  }

  async getTransportClearance() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          trip.id::text,
          trip.direction,
          trip.trip_date::text,
          trip.actual_start_at::text,
          trip.actual_end_at::text,
          trip.learner_count,
          trip.status,
          route.name AS route_name,
          vehicle.registration_number AS vehicle_registration
        FROM transport_trips trip
        LEFT JOIN transport_routes route
          ON route.tenant_id = trip.tenant_id AND route.id = trip.route_id
        LEFT JOIN transport_vehicles vehicle
          ON vehicle.tenant_id = trip.tenant_id AND vehicle.id = trip.vehicle_id
        WHERE trip.tenant_id = $1
          AND trip.trip_date >= CURRENT_DATE - INTERVAL '1 day'
          AND trip.status IN ('scheduled', 'in_progress', 'completed')
        ORDER BY trip.trip_date DESC, trip.created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordTransportDeparture(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE transport_trips
        SET status = 'in_progress',
            actual_start_at = COALESCE(actual_start_at, NOW()),
            started_by_user_id = COALESCE(started_by_user_id, $3),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status IN ('scheduled', 'in_progress')
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Transport trip ID'), this.operations.uuidOrNull(userId)],
    );
    const trip = result.rows[0];
    if (!trip) throw new NotFoundException('Transport trip was not found, already completed, or belongs to another school');
    await this.operations.recordAudit(tenantId, 'security.transport_departure_recorded', 'transport_trip', trip.id, { trip }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-transport-departure-${trip.id}`,
      type: 'security.transport_departure_recorded',
      title: 'Transport departure recorded',
      body: 'Security recorded a school transport departure at the gate.',
      targetRoles: ['transport_manager', 'security', 'principal'],
      metadata: { trip },
    });
    return { success: true, message: 'Transport departure recorded', trip };
  }

  async recordTransportArrival(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE transport_trips
        SET status = 'completed',
            actual_end_at = COALESCE(actual_end_at, NOW()),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND status = 'in_progress'
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Transport trip ID')],
    );
    const trip = result.rows[0];
    if (!trip) throw new NotFoundException('In-progress transport trip was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.transport_arrival_recorded', 'transport_trip', trip.id, { trip }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-transport-arrival-${trip.id}`,
      type: 'security.transport_arrival_recorded',
      title: 'Transport arrival recorded',
      body: 'Security recorded a school transport arrival at the gate.',
      targetRoles: ['transport_manager', 'security', 'principal'],
      metadata: { trip },
    });
    return { success: true, message: 'Transport arrival recorded', trip };
  }

  async getStaffMovement() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT *
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type IN ('staff.entry_logged', 'staff.departure_logged')
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId]
    );
    return res.rows;
  }

  async logStaffEntry(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const staffId = this.operations.requiredText(dto?.staffId ?? dto?.staff_id ?? dto?.staff_name ?? dto?.staffName, 'Staff member');
    const notes = String(dto?.notes || `Staff member ${staffId} entered through the gate.`).trim();
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, 'staff.entry_logged', 'staff_profile', $5, $6, $7, 'normal', $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        this.requestContext.getStore()?.role || 'security',
        JSON.stringify(['principal', 'secretary', 'security']),
        staffId,
        'Staff entry logged',
        notes,
        JSON.stringify({ staffId, notes, logged_at: new Date().toISOString(), source_dashboard: 'security-officer' }),
      ],
    );
    const movement = result.rows[0];
    await this.operations.recordAudit(tenantId, 'staff.entry_logged', 'staff_profile', staffId, { movement, dto }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-staff-entry-${movement.id}`,
      type: 'staff.entry_logged',
      title: 'Staff entry logged',
      body: `Security logged a staff entry for ${staffId}.`,
      targetRoles: ['principal', 'secretary', 'security'],
      metadata: { movement, staffId },
    });
    return { success: true, message: 'Staff entry logged and routed', movement };
  }

  async logStaffDeparture(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const staffId = this.operations.requiredText(dto?.staffId ?? dto?.staff_id, 'Staff member');
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, $3, $4::jsonb, 'staff.departure_logged', 'staff_profile', $5, $6, $7, 'normal', $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        this.requestContext.getStore()?.role || 'security',
        JSON.stringify(['principal', 'secretary', 'security']),
        staffId,
        'Staff departure logged',
        String(dto?.notes || `Staff member ${staffId} departed through the gate.`),
        JSON.stringify({ staffId, logged_at: new Date().toISOString(), source_dashboard: 'security-officer' }),
      ],
    );
    const movement = result.rows[0];
    await this.operations.recordAudit(tenantId, 'staff.departure_logged', 'staff_profile', staffId, { movement, dto }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-staff-departure-${movement.id}`,
      type: 'staff.departure_logged',
      title: 'Staff departure logged',
      body: `Security logged a staff departure for ${staffId}.`,
      targetRoles: ['principal', 'secretary', 'security'],
      metadata: { movement, staffId },
    });
    return { success: true, message: 'Staff departure logged and routed', movement };
  }

  async logStaffReturn(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET payload = payload || $3::jsonb,
            message = message || ' Returned at ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'staff.departure_logged'
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Staff movement ID'), JSON.stringify({ returned_at: new Date().toISOString() })],
    );
    const movement = result.rows[0];
    if (!movement) throw new NotFoundException('Staff movement record was not found in this school');
    await this.operations.recordAudit(tenantId, 'staff.return_logged', 'workflow_event', movement.id, { movement }, userId);
    return { success: true, message: 'Staff return logged', movement };
  }

  async searchSecurityRecords(query: string) {
    const tenantId = this.requireTenantId();
    const term = this.operations.requiredText(query, 'Search term');
    const likeTerm = `%${term}%`;
    const result = await this.operations.readSql(
      `
        SELECT *
        FROM (
          SELECT
            'workflow_event' AS source,
            id::text,
            title,
            message,
            event_type AS type,
            created_at::text
          FROM workflow_events
          WHERE tenant_id = $1
            AND (
              title ILIKE $2
              OR message ILIKE $2
              OR entity_id ILIKE $2
              OR event_type ILIKE $2
            )
            AND (
              event_type LIKE 'security.%'
              OR event_type LIKE 'visitor.%'
              OR event_type LIKE 'vehicle.%'
              OR event_type LIKE 'delivery.%'
              OR event_type LIKE 'staff.%'
              OR event_type LIKE 'student.%'
            )
          UNION ALL
          SELECT
            'security_incident' AS source,
            id::text,
            title,
            description AS message,
            severity AS type,
            created_at::text
          FROM security_incidents
          WHERE tenant_id = $1
            AND (
              title ILIKE $2
              OR description ILIKE $2
              OR location ILIKE $2
              OR severity ILIKE $2
            )
        ) results
        ORDER BY created_at DESC
        LIMIT 25
      `,
      [tenantId, likeTerm],
    );
    return result.rows;
  }

  async getVehicleLogs() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          id::text,
          title,
          message,
          payload,
          created_at::text,
          updated_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'vehicle.entry_logged'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordVehicleEntry(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const vehicleRegistration = this.operations.requiredText(
      dto?.vehicle_registration ?? dto?.vehicleRegistration ?? dto?.registration,
      'Vehicle registration',
    );
    const driverName = String(dto?.driver_name ?? dto?.driverName ?? '').trim() || null;
    const purpose = this.operations.requiredText(dto?.purpose ?? dto?.type ?? 'Gate visit', 'Vehicle purpose');
    const payload = {
      vehicle_registration: vehicleRegistration,
      driver_name: driverName,
      purpose,
      entered_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'vehicle.entry_logged', 'vehicle_gate_log', $4, $5, $6, 'normal', $7::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'secretary', 'principal']),
        vehicleRegistration,
        `Vehicle entry: ${vehicleRegistration}`,
        `${vehicleRegistration} entered the school gate for ${purpose}.`,
        JSON.stringify(payload),
      ],
    );
    const log = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.vehicle_entry_recorded', 'workflow_event', log.id, { log }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-vehicle-entry-${log.id}`,
      type: 'security.vehicle_entry_recorded',
      title: `Vehicle entered: ${vehicleRegistration}`,
      body: `${vehicleRegistration} entered the school gate for ${purpose}.`,
      targetRoles: ['security', 'secretary', 'principal'],
      metadata: { log },
    });
    return { success: true, message: 'Vehicle entry recorded', log };
  }

  async recordVehicleExit(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const exitPayload = { exited_at: new Date().toISOString() };
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET payload = payload || $3::jsonb,
            message = message || ' Exited at ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'vehicle.entry_logged'
          AND NOT (payload ? 'exited_at')
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Vehicle log ID'), JSON.stringify(exitPayload)],
    );
    const log = result.rows[0];
    if (!log) throw new NotFoundException('Vehicle log was not found, already closed, or belongs to another school');
    await this.operations.recordAudit(tenantId, 'security.vehicle_exit_recorded', 'workflow_event', log.id, { log }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-vehicle-exit-${log.id}`,
      type: 'security.vehicle_exit_recorded',
      title: `Vehicle exited: ${log.entity_id || 'gate vehicle'}`,
      body: `${log.entity_id || 'A vehicle'} exited the school gate.`,
      targetRoles: ['security', 'secretary', 'principal'],
      metadata: { log },
    });
    return { success: true, message: 'Vehicle exit recorded', log };
  }

  async getDeliveries() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          id::text,
          title,
          message,
          payload,
          created_at::text,
          updated_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'delivery.recorded'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordDelivery(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const deliveryType = this.operations.requiredText(dto?.delivery_type ?? dto?.deliveryType ?? dto?.type, 'Delivery type');
    const recipient = this.operations.requiredText(dto?.recipient ?? dto?.recipient_role ?? dto?.recipientRole, 'Recipient');
    const sender = String(dto?.sender ?? dto?.source ?? '').trim() || null;
    const payload = {
      delivery_type: deliveryType,
      recipient,
      sender,
      recorded_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'delivery.recorded', 'security_delivery', $4, $5, $6, 'normal', $7::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'secretary', 'principal']),
        recipient,
        `Delivery for ${recipient}`,
        `${deliveryType} was recorded at the gate for ${recipient}.`,
        JSON.stringify(payload),
      ],
    );
    const delivery = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.delivery_recorded', 'workflow_event', delivery.id, { delivery }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-delivery-recorded-${delivery.id}`,
      type: 'security.delivery_recorded',
      title: `Delivery recorded for ${recipient}`,
      body: `${deliveryType} was recorded at the gate.`,
      targetRoles: ['security', 'secretary', 'principal'],
      metadata: { delivery },
    });
    return { success: true, message: 'Delivery recorded', delivery };
  }

  async notifyDeliveryRecipient(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.readSql(
      `
        SELECT *
        FROM workflow_events
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'delivery.recorded'
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Delivery ID')],
    );
    const delivery = result.rows[0];
    if (!delivery) throw new NotFoundException('Delivery was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.delivery_recipient_notified', 'workflow_event', delivery.id, { delivery }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-delivery-recipient-notified-${delivery.id}`,
      type: 'security.delivery_recipient_notified',
      title: `Delivery awaiting collection: ${delivery.payload?.recipient || delivery.entity_id || 'recipient'}`,
      body: `${delivery.payload?.delivery_type || 'Delivery'} is waiting at the gate.`,
      targetRoles: ['secretary', 'principal', 'security'],
      metadata: { delivery },
    });
    return { success: true, message: 'Delivery recipient notified', delivery };
  }

  async markDeliveryCollected(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET payload = payload || $3::jsonb,
            message = message || ' Collected at ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'delivery.recorded'
          AND NOT (payload ? 'collected_at')
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Delivery ID'), JSON.stringify({ collected_at: new Date().toISOString() })],
    );
    const delivery = result.rows[0];
    if (!delivery) throw new NotFoundException('Delivery was not found, already collected, or belongs to another school');
    await this.operations.recordAudit(tenantId, 'security.delivery_collected', 'workflow_event', delivery.id, { delivery }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-delivery-collected-${delivery.id}`,
      type: 'security.delivery_collected',
      title: `Delivery collected: ${delivery.payload?.recipient || delivery.entity_id || 'recipient'}`,
      body: `${delivery.payload?.delivery_type || 'Delivery'} was marked collected at the gate.`,
      targetRoles: ['security', 'secretary', 'principal'],
      metadata: { delivery },
    });
    return { success: true, message: 'Delivery marked collected', delivery };
  }

  async getLateArrivals() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          id::text,
          title,
          message,
          payload,
          created_at::text,
          updated_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'student.late_arrival_recorded'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordLateArrival(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const studentName = this.operations.requiredText(dto?.student_name ?? dto?.studentName ?? dto?.name, 'Student name');
    const reason = this.operations.requiredText(dto?.reason ?? dto?.late_reason ?? dto?.lateReason, 'Late arrival reason');
    const actionTaken = String(dto?.action_taken ?? dto?.actionTaken ?? 'Allowed to Class').trim() || 'Allowed to Class';
    const payload = {
      student_name: studentName,
      reason,
      action_taken: actionTaken,
      recorded_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'student.late_arrival_recorded', 'student_late_arrival', $4, $5, $6, 'normal', $7::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'class_teacher', 'principal']),
        studentName,
        `Late arrival: ${studentName}`,
        `${studentName} arrived late. Reason: ${reason}.`,
        JSON.stringify(payload),
      ],
    );
    const arrival = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.late_arrival_recorded', 'workflow_event', arrival.id, { arrival }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-late-arrival-recorded-${arrival.id}`,
      type: 'security.late_arrival_recorded',
      title: `Late arrival recorded: ${studentName}`,
      body: `${studentName} arrived late. Reason: ${reason}.`,
      targetRoles: ['security', 'class_teacher', 'principal'],
      metadata: { arrival },
    });
    return { success: true, message: 'Late arrival recorded', arrival };
  }

  async notifyLateArrivalParent(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.readSql(
      `
        SELECT *
        FROM workflow_events
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'student.late_arrival_recorded'
        LIMIT 1
      `,
      [tenantId, this.operations.requiredText(id, 'Late arrival ID')],
    );
    const arrival = result.rows[0];
    if (!arrival) throw new NotFoundException('Late arrival record was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.late_arrival_parent_notified', 'workflow_event', arrival.id, { arrival }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-late-arrival-parent-notified-${arrival.id}`,
      type: 'security.late_arrival_parent_notified',
      title: `Parent notice queued: ${arrival.payload?.student_name || arrival.entity_id || 'student'}`,
      body: `${arrival.payload?.student_name || 'A student'} arrived late. Reason: ${arrival.payload?.reason || 'Not recorded'}.`,
      targetRoles: ['parent', 'class_teacher', 'principal', 'security'],
      metadata: { arrival },
    });
    return { success: true, message: 'Late arrival parent notice queued', arrival };
  }

  async getEarlyDepartures() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          id::text,
          title,
          message,
          payload,
          created_at::text,
          updated_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'student.early_departure_recorded'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordEarlyDeparture(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const studentName = this.operations.requiredText(dto?.student_name ?? dto?.studentName ?? dto?.name, 'Student name');
    const reason = this.operations.requiredText(dto?.reason ?? dto?.departure_reason ?? dto?.departureReason, 'Early departure reason');
    const status = String(dto?.status ?? 'Awaiting Return').trim() || 'Awaiting Return';
    const payload = {
      student_name: studentName,
      reason,
      status,
      departed_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'student.early_departure_recorded', 'student_early_departure', $4, $5, $6, 'normal', $7::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'class_teacher', 'principal', 'parent']),
        studentName,
        `Early departure: ${studentName}`,
        `${studentName} left school early. Reason: ${reason}.`,
        JSON.stringify(payload),
      ],
    );
    const departure = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.early_departure_recorded', 'workflow_event', departure.id, { departure }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-early-departure-recorded-${departure.id}`,
      type: 'security.early_departure_recorded',
      title: `Early departure recorded: ${studentName}`,
      body: `${studentName} left school early. Reason: ${reason}.`,
      targetRoles: ['security', 'class_teacher', 'principal', 'parent'],
      metadata: { departure },
    });
    return { success: true, message: 'Early departure recorded', departure };
  }

  async recordEarlyDepartureReturn(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET payload = payload || $3::jsonb,
            message = message || ' Returned at ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI'),
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'student.early_departure_recorded'
          AND NOT (payload ? 'returned_at')
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Early departure ID'),
        JSON.stringify({ returned_at: new Date().toISOString(), status: 'Returned' }),
      ],
    );
    const departure = result.rows[0];
    if (!departure) throw new NotFoundException('Early departure record was not found, already returned, or belongs to another school');
    await this.operations.recordAudit(tenantId, 'security.early_departure_return_recorded', 'workflow_event', departure.id, { departure }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-early-departure-return-${departure.id}`,
      type: 'security.early_departure_return_recorded',
      title: `Early departure return recorded: ${departure.payload?.student_name || departure.entity_id || 'student'}`,
      body: `${departure.payload?.student_name || 'A student'} returned after an early departure.`,
      targetRoles: ['security', 'class_teacher', 'principal', 'parent'],
      metadata: { departure },
    });
    return { success: true, message: 'Early departure return recorded', departure };
  }

  async getWatchlistEntries() {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT
          id::text,
          title,
          message,
          payload,
          created_at::text,
          updated_at::text
        FROM workflow_events
        WHERE tenant_id = $1
          AND event_type = 'security.watchlist_entry_recorded'
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [tenantId],
    );
    return result.rows;
  }

  async recordWatchlistEntry(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const subject = this.operations.requiredText(dto?.subject ?? dto?.name ?? dto?.vehicle, 'Watchlist subject');
    const subjectType = this.operations.requiredText(dto?.subject_type ?? dto?.subjectType ?? dto?.type, 'Watchlist type');
    const instruction = this.operations.requiredText(dto?.instruction ?? dto?.action, 'Watchlist instruction');
    const riskLevel = String(dto?.risk_level ?? dto?.riskLevel ?? 'High').trim() || 'High';
    const payload = {
      subject,
      subject_type: subjectType,
      instruction,
      risk_level: riskLevel,
      recorded_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, event_type, entity_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'security.watchlist_entry_recorded', 'security_watchlist_entry', $4, $5, $6, $7, $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'principal', 'deputy_principal']),
        subject,
        `Watchlist entry: ${subject}`,
        `${subjectType} watchlist instruction: ${instruction}.`,
        riskLevel.toLowerCase() === 'critical' ? 'high' : 'normal',
        JSON.stringify(payload),
      ],
    );
    const entry = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.watchlist_entry_recorded', 'workflow_event', entry.id, { entry }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-watchlist-entry-${entry.id}`,
      type: 'security.watchlist_entry_recorded',
      title: `Watchlist entry recorded: ${subject}`,
      body: `${subjectType} watchlist instruction: ${instruction}.`,
      targetRoles: ['security', 'principal', 'deputy_principal'],
      metadata: { entry },
    });
    return { success: true, message: 'Watchlist entry recorded', entry };
  }

  async acknowledgeWatchlistEntry(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE workflow_events
        SET payload = payload || $3::jsonb,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
          AND event_type = 'security.watchlist_entry_recorded'
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Watchlist entry ID'), JSON.stringify({ acknowledged_at: new Date().toISOString() })],
    );
    const entry = result.rows[0];
    if (!entry) throw new NotFoundException('Watchlist entry was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.watchlist_entry_acknowledged', 'workflow_event', entry.id, { entry }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-watchlist-acknowledged-${entry.id}`,
      type: 'security.watchlist_entry_acknowledged',
      title: `Watchlist entry acknowledged: ${entry.payload?.subject || entry.entity_id || 'subject'}`,
      body: `Security acknowledged watchlist instructions for ${entry.payload?.subject || entry.entity_id || 'the subject'}.`,
      targetRoles: ['security', 'principal', 'deputy_principal'],
      metadata: { entry },
    });
    return { success: true, message: 'Watchlist entry acknowledged', entry };
  }

  async startShift(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const gatePoint = String(dto?.gate_point ?? dto?.gatePoint ?? 'Main Gate').trim() || 'Main Gate';
    const shiftName = String(dto?.shift_name ?? dto?.shiftName ?? 'Current Shift').trim() || 'Current Shift';
    const payload = {
      gate_point: gatePoint,
      shift_name: shiftName,
      started_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, entity_type, event_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'security_shift', $5, $4, $6, $7, 'normal', $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'principal', 'deputy_principal']),
        gatePoint,
        'security.shift_started',
        `Security shift started: ${shiftName}`,
        `${shiftName} started at ${gatePoint}.`,
        JSON.stringify(payload),
      ],
    );
    const shift = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.shift_started', 'workflow_event', shift.id, { shift }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-shift-started-${shift.id}`,
      type: 'security.shift_started',
      title: `Security shift started: ${shiftName}`,
      body: `${shiftName} started at ${gatePoint}.`,
      targetRoles: ['security', 'principal', 'deputy_principal'],
      metadata: { shift },
    });
    return { success: true, message: 'Security shift started', shift };
  }

  async endShift(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const gatePoint = String(dto?.gate_point ?? dto?.gatePoint ?? 'Main Gate').trim() || 'Main Gate';
    const notes = String(dto?.handover_notes ?? dto?.handoverNotes ?? 'Shift handed over').trim() || 'Shift handed over';
    const payload = {
      gate_point: gatePoint,
      handover_notes: notes,
      ended_at: new Date().toISOString(),
      source_dashboard: 'security-officer',
    };
    const result = await this.operations.writeSql(
      `
        INSERT INTO workflow_events (
          tenant_id, source_user_id, source_role, target_roles, entity_type, event_type, entity_id, title, message, priority, payload
        )
        VALUES ($1, $2::uuid, 'security_officer', $3::jsonb, 'security_shift', $5, $4, $6, $7, 'normal', $8::jsonb)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.uuidOrNull(userId),
        JSON.stringify(['security', 'principal', 'deputy_principal']),
        gatePoint,
        'security.shift_ended',
        `Security shift ended: ${gatePoint}`,
        `Security shift ended at ${gatePoint}. Handover: ${notes}.`,
        JSON.stringify(payload),
      ],
    );
    const shift = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.shift_ended', 'workflow_event', shift.id, { shift }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-shift-ended-${shift.id}`,
      type: 'security.shift_ended',
      title: `Security shift ended: ${gatePoint}`,
      body: `Security shift ended at ${gatePoint}. Handover: ${notes}.`,
      targetRoles: ['security', 'principal', 'deputy_principal'],
      metadata: { shift },
    });
    return { success: true, message: 'Security shift ended', shift };
  }

  async getIncidents() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `SELECT * FROM security_incidents WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId]
    );
    return res.rows;
  }

  async reportIncident(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const actorUserId = this.operations.uuidOrNull(userId);
    if (!actorUserId) {
      throw new UnauthorizedException('A valid user is required to report a security incident');
    }
    const result = await this.operations.writeSql(
      `
        INSERT INTO security_incidents (tenant_id, title, description, severity, location, status, reported_by)
        VALUES ($1, $2, $3, $4, $5, 'Reported', $6::uuid)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.title || dto?.category || 'Security incident', 'Incident title'),
        this.operations.requiredText(dto?.description || dto?.notes, 'Incident description'),
        String(dto?.severity || 'medium').toLowerCase(),
        dto?.location || 'School gate',
        actorUserId,
      ],
    );
    const incident = result.rows[0];
    await this.operations.recordAudit(tenantId, 'security.incident_reported', 'security_incident', incident.id, { incident }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-incident-${incident.id}`,
      type: 'security.incident_reported',
      title: incident.title,
      body: incident.description,
      targetRoles: ['principal', 'deputy_principal', 'security'],
      metadata: { incident },
    });
    return { success: true, message: 'Security incident reported', incident };
  }

  async escalateIncident(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const result = await this.operations.writeSql(
      `
        UPDATE security_incidents
        SET status = 'Escalated', updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Incident ID')],
    );
    const incident = result.rows[0];
    if (!incident) throw new NotFoundException('Security incident was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.incident_escalated', 'security_incident', incident.id, { incident }, userId);
    await this.operations.notifyRoles(tenantId, {
      key: `security-incident-escalated-${incident.id}`,
      type: 'security.incident_escalated',
      title: `Escalated: ${incident.title}`,
      body: incident.description,
      targetRoles: ['principal', 'deputy_principal', 'security'],
      metadata: { incident },
    });
    return { success: true, message: 'Incident escalated', incident };
  }

  async resolveIncident(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const note = String(dto?.resolution || dto?.notes || '').trim();
    const result = await this.operations.writeSql(
      `
        UPDATE security_incidents
        SET status = 'Resolved',
            description = CASE WHEN $3 = '' THEN description ELSE description || E'\nResolution: ' || $3 END,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, this.operations.requiredText(id, 'Incident ID'), note],
    );
    const incident = result.rows[0];
    if (!incident) throw new NotFoundException('Security incident was not found in this school');
    await this.operations.recordAudit(tenantId, 'security.incident_resolved', 'security_incident', incident.id, { incident, note }, userId);
    return { success: true, message: 'Incident resolved', incident };
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    return this.operations.listReportSnapshots(tenantId, 'security-officer-command');
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.requestContext.getStore()?.user_id || null;
    const [overview, visitors, gateRegister, studentExitPasses, staffMovement, incidents] = await Promise.all([
      this.getOverview(),
      this.getVisitors(),
      this.getGateRegister(),
      this.getStudentExitPasses(),
      this.getStaffMovement(),
      this.getIncidents(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'security-officer-command',
      reportId: 'security-operations',
      title: String(dto?.name || dto?.title || 'Security operations report'),
      format: dto?.format,
      generatedByUserId: this.operations.uuidOrNull(userId),
      sections: { overview, visitors, gateRegister, studentExitPasses, staffMovement, incidents },
      filters: { requested_from: 'security-officer-dashboard' },
      targetRoles: ['principal', 'security'],
    });
  }

  async downloadReport(id: string) {
    const tenantId = this.requireTenantId();
    const result = await this.operations.readSql(
      `
        SELECT snapshot_id AS "snapshotId", title, format, artifact, manifest, created_at::text AS "generatedDate"
        FROM report_snapshots
        WHERE tenant_id = $1
          AND module = 'security-officer-command'
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
    const tenantId = this.requireTenantId();
    const action = this.operations.requiredText(dto?.action, 'Security action');
    const title = String(dto?.title || `Security: ${action.replace(/[-_.]+/g, ' ')}`).trim();
    const message = String(dto?.description || dto?.message || title).trim();
    return this.operations.recordWorkflowAction({
      tenantId,
      actorUserId: this.currentUserId(),
      sourceRole: 'security_officer',
      targetRoles: ['security', 'secretary', 'principal', 'deputy_principal'],
      eventType: `security.${action}`,
      entityType: String(dto?.entityType || 'security_workflow'),
      entityId: dto?.entityId ?? dto?.entity_id ?? null,
      title,
      message,
      priority: dto?.priority === 'high' || dto?.priority === 'urgent' ? 'high' : 'normal',
      payload: {
        ...dto,
        source_dashboard: 'security-officer-dashboard',
      },
    });
  }
}
