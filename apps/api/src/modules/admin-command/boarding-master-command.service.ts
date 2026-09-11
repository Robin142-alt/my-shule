import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { AdminCommandOperationsService } from './admin-command-operations.service';

const BOARDING_WORKFLOW_TARGET_ROLES = new Set([
  'boarding_master',
  'principal',
  'deputy_principal',
  'security_officer',
  'class_teacher',
]);

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

  private optionalUuid(value: unknown, label: string): string | null {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const uuid = this.operations.uuidOrNull(value);
    if (!uuid) throw new BadRequestException(`${label} must be a valid record ID`);
    return uuid;
  }

  private requiredUuid(value: unknown, label: string): string {
    const uuid = this.optionalUuid(value, label);
    if (!uuid) throw new BadRequestException(`${label} is required`);
    return uuid;
  }

  private uuidArray(value: unknown, label: string): string[] {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) throw new BadRequestException(`${label} must be a list of record IDs`);
    const unique = new Set<string>();
    for (const entry of value) {
      unique.add(this.requiredUuid(entry, label));
    }
    return [...unique];
  }

  private requiredDate(value: unknown, label: string): string {
    const date = this.operations.requiredText(value, label);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      throw new BadRequestException(`${label} must be a valid date`);
    }
    return date;
  }

  private positiveInteger(value: unknown, label: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new BadRequestException(`${label} must be a positive whole number`);
    }
    return parsed;
  }

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.query<T>(query, params);
  }

  async getReferences() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      houses: Array<{ id: string; title: string }>;
      students: Array<{
        id: string;
        admission_number: string;
        student_name: string;
        house_id: string | null;
        house_name: string | null;
        hostel_name: string | null;
      }>;
      guardians: Array<{ id: string; student_id: string; display_name: string; phone: string | null }>;
      wardens: Array<{ id: string; display_name: string }>;
    }>(
      `
        WITH active_boarders AS (
          SELECT DISTINCT
            student.id,
            student.admission_number,
            TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            boarding_student.house_id,
            house.title AS house_name,
            hostel.hostel_name
          FROM students student
          LEFT JOIN boarding_students boarding_student
            ON boarding_student.tenant_id = student.tenant_id
           AND boarding_student.student_id::text = student.id::text
           AND lower(boarding_student.status) = 'active'
          LEFT JOIN boarding_houses house
            ON house.tenant_id = boarding_student.tenant_id
           AND house.id::text = boarding_student.house_id::text
          LEFT JOIN boarding_allocations allocation
            ON allocation.tenant_id = student.tenant_id
           AND allocation.student_id::text = student.id::text
           AND allocation.status = 'active'
          LEFT JOIN boarding_beds bed
            ON bed.tenant_id::text = allocation.tenant_id
           AND bed.id::text = allocation.bed_id::text
          LEFT JOIN boarding_hostels hostel
            ON hostel.tenant_id::text = bed.tenant_id::text
           AND hostel.id::text = bed.hostel_id::text
          WHERE student.tenant_id = $1
            AND student.deleted_at IS NULL
            AND lower(COALESCE(student.status::text, 'active')) IN ('active', 'enrolled')
            AND (boarding_student.id IS NOT NULL OR allocation.id IS NOT NULL)
        )
        SELECT
          COALESCE((
            SELECT jsonb_agg(jsonb_build_object('id', house.id::text, 'title', house.title) ORDER BY house.title)
            FROM boarding_houses house
            WHERE house.tenant_id = $1
              AND lower(house.status) IN ('active', 'open')
              AND COALESCE(lower(NULLIF(house.category, '')), 'house') IN ('house', 'hostel', 'dormitory')
          ), '[]'::jsonb) AS houses,
          COALESCE((
            SELECT jsonb_agg(to_jsonb(boarder) ORDER BY boarder.student_name, boarder.admission_number)
            FROM active_boarders boarder
          ), '[]'::jsonb) AS students,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', guardian.id::text,
                'student_id', guardian.student_id::text,
                'display_name', guardian.display_name,
                'phone', guardian.phone
              ) ORDER BY guardian.is_primary DESC, guardian.display_name
            )
            FROM student_guardians guardian
            INNER JOIN active_boarders boarder
              ON boarder.id::text = guardian.student_id::text
            WHERE guardian.tenant_id = $1
              AND lower(guardian.status) = 'active'
          ), '[]'::jsonb) AS guardians,
          COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('id', membership.user_id::text, 'display_name', user_account.display_name)
              ORDER BY user_account.display_name
            )
            FROM tenant_memberships membership
            INNER JOIN users user_account
              ON user_account.id::text = membership.user_id::text
            WHERE membership.tenant_id::text = $1
              AND lower(membership.status::text) = 'active'
          ), '[]'::jsonb) AS wardens
      `,
      [tenantId],
    );
    return result.rows[0] ?? { houses: [], students: [], guardians: [], wardens: [] };
  }

  async getOverview() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      total_boarders: number;
      hostels: number;
      incidents_open: number;
      on_leave: number;
    }>(
      `
        SELECT
          (
            SELECT COUNT(*)::int
            FROM students student
            WHERE student.tenant_id = $1
              AND student.deleted_at IS NULL
              AND lower(COALESCE(student.status::text, 'active')) IN ('active', 'enrolled')
              AND (
                EXISTS (
                  SELECT 1
                  FROM boarding_students boarding_student
                  WHERE boarding_student.tenant_id = student.tenant_id
                    AND boarding_student.student_id::text = student.id::text
                    AND lower(boarding_student.status) = 'active'
                )
                OR EXISTS (
                  SELECT 1
                  FROM boarding_allocations allocation
                  WHERE allocation.tenant_id = student.tenant_id
                    AND allocation.student_id::text = student.id::text
                    AND lower(allocation.status) = 'active'
                )
              )
          ) AS total_boarders,
          (SELECT COUNT(*)::int FROM boarding_hostels hostel WHERE hostel.tenant_id::text = $1) AS hostels,
          (SELECT COUNT(*)::int FROM boarding_incidents incident WHERE incident.tenant_id = $1 AND incident.status = 'open') AS incidents_open,
          (
            SELECT COUNT(*)::int
            FROM boarding_exeats exeat
            WHERE exeat.tenant_id = $1
              AND (
                exeat.status = 'checked_out'
                OR (
                  exeat.status = 'approved'
                  AND exeat.from_date <= CURRENT_DATE
                  AND exeat.to_date >= CURRENT_DATE
                )
              )
          ) AS on_leave
      `,
      [tenantId],
    );
    const row = result.rows[0] ?? {
      total_boarders: 0,
      hostels: 0,
      incidents_open: 0,
      on_leave: 0,
    };
    const metrics = {
      total_boarders: Number(row.total_boarders || 0),
      hostels: Number(row.hostels || 0),
      incidents_open: Number(row.incidents_open || 0),
      on_leave: Number(row.on_leave || 0),
    };
    return {
      metrics,
      overviewList: [
        { id: 'total-boarders', metric: 'Total boarders', value: String(metrics.total_boarders) },
        { id: 'hostels', metric: 'Hostels', value: String(metrics.hostels) },
        { id: 'incidents-open', metric: 'Open incidents', value: String(metrics.incidents_open) },
        { id: 'on-leave', metric: 'On leave', value: String(metrics.on_leave) },
      ],
      data: [],
    };
  }

  async getHostels() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      hostel_name: string;
      type: string;
      capacity: number;
      occupied: number;
      warden: string;
      status: string;
    }>(
      `
        SELECT
          hostel.id::text,
          hostel.hostel_name,
          INITCAP(REPLACE(hostel.gender_allowed, '_', ' ')) AS type,
          hostel.capacity::int,
          COALESCE(occupancy.occupied, 0)::int AS occupied,
          COALESCE(warden.display_name, '') AS warden,
          INITCAP(REPLACE(hostel.status, '_', ' ')) AS status
        FROM boarding_hostels hostel
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS occupied
          FROM boarding_beds bed
          WHERE bed.tenant_id::text = hostel.tenant_id::text
            AND bed.hostel_id = hostel.id
            AND (bed.assigned_student_id IS NOT NULL OR UPPER(COALESCE(bed.status, '')) = 'OCCUPIED')
        ) occupancy ON TRUE
        LEFT JOIN LATERAL (
          SELECT user_account.display_name
          FROM tenant_memberships membership
          INNER JOIN users user_account
            ON user_account.id = membership.user_id
          WHERE membership.tenant_id::text = hostel.tenant_id::text
            AND membership.user_id = hostel.warden_id
          ORDER BY membership.created_at DESC
          LIMIT 1
        ) warden ON TRUE
        WHERE hostel.tenant_id::text = $1
        ORDER BY hostel.hostel_name ASC
      `,
      [tenantId],
    );
    const totalCapacity = result.rows.reduce((sum, hostel) => sum + Number(hostel.capacity || 0), 0);
    const totalOccupied = result.rows.reduce((sum, hostel) => sum + Number(hostel.occupied || 0), 0);
    return {
      metrics: {
        total_hostels: result.rows.length,
        total_capacity: totalCapacity,
        occupancy_rate: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      },
      hostelsList: result.rows,
      data: result.rows,
    };
  }

  async createHostel(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const wardenId = this.optionalUuid(dto?.warden_id ?? dto?.wardenId, 'Warden');
    const result = await this.operations.writeSql(
      `
        WITH selected_warden AS (
          SELECT membership.user_id
          FROM tenant_memberships membership
          WHERE membership.tenant_id::text = $1
            AND membership.user_id = $5::uuid
            AND lower(membership.status::text) = 'active'
          LIMIT 1
        )
        INSERT INTO boarding_hostels (tenant_id, hostel_name, capacity, gender_allowed, warden_id, status)
        SELECT $1, $2, $3, $4, $5::uuid, 'ACTIVE'
        WHERE $5::uuid IS NULL OR EXISTS (SELECT 1 FROM selected_warden)
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(dto?.hostel_name ?? dto?.name, 'Hostel name'),
        this.positiveInteger(dto?.capacity ?? 1, 'Capacity'),
        dto?.gender_allowed ?? dto?.gender ?? 'mixed',
        wardenId,
      ],
    );
    const hostel = result.rows[0];
    if (!hostel) {
      throw new BadRequestException('The selected warden is not an active member of this school');
    }
    await this.operations.recordAudit(tenantId, 'boarding.hostel_created', 'boarding_hostel', hostel.id, { hostel }, userId);
    return { success: true, message: 'Hostel created', hostel };
  }

  async updateHostel(id: string, dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const hasWardenChange = Object.prototype.hasOwnProperty.call(dto ?? {}, 'warden_id')
      || Object.prototype.hasOwnProperty.call(dto ?? {}, 'wardenId');
    const wardenId = hasWardenChange
      ? this.optionalUuid(dto?.warden_id ?? dto?.wardenId, 'Warden')
      : null;
    const capacity = dto?.capacity === undefined || dto?.capacity === null
      ? null
      : this.positiveInteger(dto.capacity, 'Capacity');
    const result = await this.operations.writeSql(
      `
        WITH selected_warden AS (
          SELECT membership.user_id
          FROM tenant_memberships membership
          WHERE membership.tenant_id::text = $1
            AND membership.user_id = $6::uuid
            AND lower(membership.status::text) = 'active'
          LIMIT 1
        )
        UPDATE boarding_hostels hostel
        SET hostel_name = COALESCE(NULLIF($3, ''), hostel.hostel_name),
            capacity = COALESCE($4, hostel.capacity),
            gender_allowed = COALESCE(NULLIF($5, ''), hostel.gender_allowed),
            warden_id = CASE WHEN $8::boolean THEN $6::uuid ELSE hostel.warden_id END,
            status = COALESCE(NULLIF($7, ''), hostel.status),
            updated_at = NOW()
        WHERE hostel.tenant_id::text = $1
          AND hostel.id = $2::uuid
          AND (
            NOT $8::boolean
            OR $6::uuid IS NULL
            OR EXISTS (SELECT 1 FROM selected_warden)
          )
        RETURNING *
      `,
      [
        tenantId,
        this.operations.requiredText(id, 'Hostel ID'),
        dto?.hostel_name ?? dto?.name ?? null,
        capacity,
        dto?.gender_allowed ?? dto?.gender ?? null,
        wardenId,
        dto?.status ?? null,
        hasWardenChange,
      ],
    );
    const hostel = result.rows[0];
    if (!hostel) throw new BadRequestException('The hostel or selected active school warden was not found in this school');
    await this.operations.recordAudit(tenantId, 'boarding.hostel_updated', 'boarding_hostel', hostel.id, { hostel, changes: dto }, userId);
    return { success: true, message: 'Hostel updated', hostel };
  }

  async getRoomsBeds() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          MIN(b.id::text) AS id,
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
      data: roomsbedsList,
    };
  }

  async createRoom(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const hostelId = this.requiredUuid(dto?.hostel_id ?? dto?.hostelId, 'Hostel');
    const roomNumber = this.operations.requiredText(dto?.room_number ?? dto?.roomNumber, 'Room number');
    const capacity = this.positiveInteger(dto?.capacity ?? dto?.beds ?? 1, 'Room capacity');
    const bedNumbers = Array.from(
      { length: capacity },
      (_, index) => String(dto?.bed_prefix || 'B') + String(index + 1).padStart(2, '0'),
    );
    const result = await this.operations.writeSql(
      `
        WITH selected_hostel AS (
          SELECT hostel.id
          FROM boarding_hostels hostel
          WHERE hostel.tenant_id::text = $1
            AND hostel.id = $2::uuid
            AND lower(hostel.status) = 'active'
          LIMIT 1
        ), bed_numbers AS (
          SELECT bed_number
          FROM unnest($4::text[]) AS bed_number
        )
        INSERT INTO boarding_beds (tenant_id, hostel_id, room_number, bed_number, status)
        SELECT $1, hostel.id, $3, bed_number.bed_number, 'AVAILABLE'
        FROM selected_hostel hostel
        CROSS JOIN bed_numbers bed_number
        RETURNING *
      `,
      [tenantId, hostelId, roomNumber, bedNumbers],
    );
    if (result.rows.length !== capacity) {
      throw new BadRequestException('The selected active hostel was not found in this school');
    }
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
    const [summary, allocations] = await Promise.all([
      this.executeSql<{ allocated: number; unallocated: number; capacity: number }>(
        `
          SELECT
            (SELECT COUNT(*)::int FROM boarding_allocations allocation WHERE allocation.tenant_id = $1 AND allocation.status = 'active') AS allocated,
            (
              SELECT COUNT(*)::int
              FROM student_allocations planned_boarder
              WHERE planned_boarder.tenant_id = $1
                AND planned_boarder.is_current = TRUE
                AND NULLIF(TRIM(planned_boarder.dormitory_name), '') IS NOT NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM boarding_allocations allocation
                  WHERE allocation.tenant_id = planned_boarder.tenant_id
                    AND allocation.student_id::text = planned_boarder.student_id
                    AND allocation.status = 'active'
                )
            ) AS unallocated,
            (SELECT COUNT(*)::int FROM boarding_beds bed WHERE bed.tenant_id::text = $1) AS capacity
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        student_name: string;
        class: string;
        hostel: string;
        room: string;
        bed: string;
        status: string;
      }>(
        `
          SELECT
            allocation.id::text,
            TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(current_class.class_name, student.current_class_id, '') AS class,
            hostel.hostel_name AS hostel,
            bed.room_number AS room,
            bed.bed_number AS bed,
            INITCAP(REPLACE(allocation.status, '_', ' ')) AS status
          FROM boarding_allocations allocation
          INNER JOIN students student
            ON student.tenant_id = allocation.tenant_id
           AND student.id::text = allocation.student_id::text
          INNER JOIN boarding_beds bed
            ON bed.tenant_id::text = allocation.tenant_id
           AND bed.id::text = allocation.bed_id::text
          INNER JOIN boarding_hostels hostel
            ON hostel.tenant_id::text = bed.tenant_id::text
           AND hostel.id = bed.hostel_id
          LEFT JOIN LATERAL (
            SELECT student_allocation.class_name
            FROM student_allocations student_allocation
            WHERE student_allocation.tenant_id = student.tenant_id
              AND student_allocation.student_id = student.id::text
              AND student_allocation.is_current = TRUE
            ORDER BY student_allocation.effective_from DESC, student_allocation.created_at DESC
            LIMIT 1
          ) current_class ON TRUE
          WHERE allocation.tenant_id = $1
          ORDER BY allocation.created_at DESC, allocation.id DESC
          LIMIT 500
        `,
        [tenantId],
      ),
    ]);
    const row = summary.rows[0] ?? { allocated: 0, unallocated: 0, capacity: 0 };
    return {
      metrics: {
        allocated: Number(row.allocated || 0),
        unallocated: Number(row.unallocated || 0),
        capacity: Number(row.capacity || 0),
      },
      allocationList: allocations.rows,
      data: allocations.rows,
    };
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
    const [summary, checks] = await Promise.all([
      this.executeSql<{
        checks_today: number;
        clear: number;
        attention_required: number;
      }>(
        `
          SELECT
            COUNT(*) FILTER (WHERE checked_at::date = CURRENT_DATE)::int AS checks_today,
            COUNT(*) FILTER (
              WHERE checked_at::date = CURRENT_DATE
                AND lower(check_status) = 'clear'
            )::int AS clear,
            COUNT(*) FILTER (
              WHERE checked_at::date = CURRENT_DATE
                AND lower(check_status) = 'attention_required'
            )::int AS attention_required
          FROM boarding_dormitory_checks
          WHERE tenant_id = $1
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        house_id: string | null;
        house_name: string;
        checked_at: string;
        status: string;
        notes: string | null;
        expected_students: number;
        missing_students: number;
      }>(
        `
          SELECT
            dormitory_check.id::text,
            dormitory_check.house_id::text,
            COALESCE(NULLIF(house.title, ''), '') AS house_name,
            dormitory_check.checked_at::text,
            dormitory_check.check_status AS status,
            dormitory_check.notes,
            COALESCE(jsonb_array_length(dormitory_check.metadata->'expected_student_ids'), 0)::int AS expected_students,
            COALESCE(jsonb_array_length(dormitory_check.metadata->'missing_student_ids'), 0)::int AS missing_students
          FROM boarding_dormitory_checks dormitory_check
          LEFT JOIN boarding_houses house
            ON house.tenant_id = dormitory_check.tenant_id
           AND house.id::text = dormitory_check.house_id::text
          WHERE dormitory_check.tenant_id = $1
          ORDER BY dormitory_check.checked_at DESC, dormitory_check.created_at DESC
          LIMIT 100
        `,
        [tenantId],
      ),
    ]);
    return {
      metrics: summary.rows[0] ?? {
        checks_today: 0,
        clear: 0,
        attention_required: 0,
      },
      boardingattendanceList: checks.rows,
    };
  }

  async submitRollCall(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const actorRole = String(this.requestContext.getStore()?.role || 'boarding_master');
    const houseId = this.requiredUuid(dto?.house_id ?? dto?.houseId, 'Boarding house');
    const status = String(dto?.status || dto?.check_status || 'clear').trim().toLowerCase();
    if (!['clear', 'attention_required'].includes(status)) {
      throw new BadRequestException('Roll-call status must be clear or attention_required');
    }
    const missingStudentIds = this.uuidArray(
      dto?.missing_student_ids ?? dto?.missingStudentIds ?? [],
      'Missing students',
    );
    if (status === 'clear' && missingStudentIds.length > 0) {
      throw new BadRequestException('A clear roll call cannot contain missing students');
    }
    if (status === 'attention_required' && missingStudentIds.length === 0) {
      throw new BadRequestException('Select at least one missing student when attention is required');
    }
    const notes = String(dto?.notes ?? '').trim();
    if (status === 'attention_required' && !notes) {
      throw new BadRequestException('Roll-call notes are required when attention is needed');
    }
    const result = await this.operations.writeSql<{
      id: string;
      expected_students: number;
      missing_students: number;
      guardian_notifications_created: number;
      event_count: number;
      audit_count: number;
    }>(
      `
        WITH selected_house AS (
          SELECT house.id, house.title
          FROM boarding_houses house
          WHERE house.tenant_id = $1
            AND house.id = $2::uuid
            AND lower(house.status) IN ('active', 'open')
            AND COALESCE(lower(NULLIF(house.category, '')), 'house') IN ('house', 'hostel', 'dormitory')
          LIMIT 1
        ), expected_students AS (
          SELECT DISTINCT boarding_student.student_id
          FROM boarding_students boarding_student
          INNER JOIN selected_house house
            ON house.id = boarding_student.house_id
          INNER JOIN students student
            ON student.tenant_id = boarding_student.tenant_id
           AND student.id = boarding_student.student_id
           AND student.deleted_at IS NULL
           AND lower(student.status) IN ('active', 'enrolled')
          WHERE boarding_student.tenant_id = $1
            AND lower(boarding_student.status) = 'active'
        ), requested_missing AS (
          SELECT missing_id AS student_id
          FROM unnest($6::uuid[]) AS missing_id
        ), validated_missing AS (
          SELECT requested.student_id
          FROM requested_missing requested
          INNER JOIN expected_students expected
            ON expected.student_id = requested.student_id
        ), validation AS (
          SELECT
            house.id AS house_id,
            house.title AS house_name,
            (SELECT COUNT(*)::int FROM expected_students) AS expected_count,
            (SELECT COUNT(*)::int FROM requested_missing) AS requested_missing_count,
            (SELECT COUNT(*)::int FROM validated_missing) AS validated_missing_count
          FROM selected_house house
        ), inserted_check AS (
          INSERT INTO boarding_dormitory_checks (
            tenant_id, house_id, checked_by_user_id, check_status, notes, checked_at, metadata
          )
          SELECT
            $1,
            validation.house_id,
            $3::uuid,
            $4,
            NULLIF($5, ''),
            NOW(),
            jsonb_build_object(
              'house_name', validation.house_name,
              'expected_student_ids', COALESCE((SELECT jsonb_agg(student_id) FROM expected_students), '[]'::jsonb),
              'missing_student_ids', to_jsonb($6::uuid[]),
              'source_dashboard', 'boarding-master-command'
            )
          FROM validation
          WHERE validation.expected_count > 0
            AND validation.requested_missing_count = validation.validated_missing_count
          RETURNING *
        ), guardian_recipients AS (
          SELECT DISTINCT
            guardian.id AS guardian_id,
            guardian.user_id,
            missing.student_id
          FROM validated_missing missing
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = $1
           AND guardian.student_id = missing.student_id
           AND lower(guardian.status) = 'active'
          LEFT JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND lower(membership.status::text) = 'active'
          WHERE guardian.user_id IS NULL OR membership.user_id IS NOT NULL
        ), guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'boarding-roll-call-missing-' || checked.id::text || '-' || recipient.guardian_id::text,
            recipient.user_id,
            recipient.guardian_id,
            'boarding.roll_call_missing',
            'Boarding roll call requires attention',
            'A linked learner was recorded as missing during the boarding roll call. Contact the school boarding office for verified details.',
            'unread',
            'high',
            'boarding',
            checked.id::text,
            jsonb_build_object('student_id', recipient.student_id, 'house_id', checked.house_id)
          FROM inserted_check checked
          INNER JOIN guardian_recipients recipient ON TRUE
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $3::uuid,
            $7,
            CASE
              WHEN $4 = 'attention_required'
                THEN '["boarding_master", "deputy_principal", "principal", "security_officer"]'::jsonb
              ELSE '["boarding_master"]'::jsonb
            END,
            'boarding.roll_call_submitted',
            'boarding_dormitory_check',
            checked.id::text,
            'Boarding roll call submitted',
            CASE
              WHEN $4 = 'attention_required'
                THEN validation.validated_missing_count::text || ' active boarder(s) require follow-up.'
              ELSE 'All active boarders assigned to the house were accounted for.'
            END,
            CASE WHEN $4 = 'attention_required' THEN 'high' ELSE 'normal' END,
            jsonb_build_object(
              'house_id', checked.house_id,
              'status', checked.check_status,
              'expected_students', validation.expected_count,
              'missing_students', validation.validated_missing_count,
              'source_dashboard', 'boarding-master-command'
            )
          FROM inserted_check checked
          INNER JOIN validation ON validation.house_id = checked.house_id
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $3::uuid,
            current_setting('app.request_id', true),
            'boarding.roll_call_submitted',
            'boarding_dormitory_check',
            checked.id,
            jsonb_build_object(
              'house_id', checked.house_id,
              'status', checked.check_status,
              'expected_students', validation.expected_count,
              'missing_students', validation.validated_missing_count,
              'source_dashboard', 'boarding-master-command'
            )
          FROM inserted_check checked
          INNER JOIN validation ON validation.house_id = checked.house_id
          RETURNING id
        )
        SELECT
          checked.*,
          validation.expected_count AS expected_students,
          validation.validated_missing_count AS missing_students,
          (SELECT COUNT(*)::int FROM guardian_notifications) AS guardian_notifications_created,
          (SELECT COUNT(*)::int FROM inserted_event) AS event_count,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count
        FROM inserted_check checked
        INNER JOIN validation ON validation.house_id = checked.house_id
      `,
      [
        tenantId,
        houseId,
        this.operations.uuidOrNull(userId),
        status,
        notes,
        missingStudentIds,
        actorRole,
      ],
    );
    const rollCall = result.rows[0];
    if (!rollCall) {
      throw new BadRequestException('The boarding house or one of the selected students was not found in this school');
    }
    return {
      success: true,
      message: missingStudentIds.length > 0
        ? `Roll call submitted and ${rollCall.guardian_notifications_created} linked guardian notification(s) created`
        : 'Roll call submitted with all active house boarders accounted for',
      rollCall,
    };
  }

  async getLeaveExit() {
    const tenantId = this.requireTenantId();
    const res = await this.executeSql(
      `
        SELECT
          id::text,
          student_id::text,
          guardian_id::text,
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
          metadata->>'forwarded_at' AS forwarded_at,
          metadata->>'forwarded_by' AS forwarded_by,
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
      data: rows,
    };
  }

  async createLeaveRequest(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const actorRole = String(this.requestContext.getStore()?.role || 'boarding_master');
    const studentId = this.requiredUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const guardianId = this.requiredUuid(dto?.guardian_id ?? dto?.guardianId, 'Guardian');
    const leaveType = this.operations.requiredText(dto?.leave_type ?? dto?.leaveType, 'Leave type');
    const fromDate = this.requiredDate(dto?.from_date ?? dto?.fromDate, 'From date');
    const toDate = this.requiredDate(dto?.to_date ?? dto?.toDate ?? dto?.expected_return ?? dto?.expectedReturn, 'To date');
    if (toDate < fromDate) throw new BadRequestException('To date cannot be before from date');
    const reason = this.operations.requiredText(dto?.reason, 'Reason');
    const result = await this.operations.writeSql<{
      id: string;
      student_name: string;
      leave_type: string;
      guardian_notifications_created: number;
      event_count: number;
      audit_count: number;
    }>(
      `
        WITH selected_student AS (
          SELECT
            student.id,
            TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)) AS student_name,
            COALESCE(
              (
                SELECT hostel.hostel_name
                FROM boarding_allocations allocation
                INNER JOIN boarding_beds bed
                  ON bed.tenant_id::text = allocation.tenant_id
                 AND bed.id::text = allocation.bed_id::text
                INNER JOIN boarding_hostels hostel
                  ON hostel.tenant_id::text = bed.tenant_id::text
                 AND hostel.id = bed.hostel_id
                WHERE allocation.tenant_id = student.tenant_id
                  AND allocation.student_id::text = student.id::text
                  AND lower(allocation.status) = 'active'
                ORDER BY allocation.created_at DESC, allocation.id DESC
                LIMIT 1
              ),
              (
                SELECT house.title
                FROM boarding_students boarding_student
                LEFT JOIN boarding_houses house
                  ON house.tenant_id = boarding_student.tenant_id
                 AND house.id = boarding_student.house_id
                WHERE boarding_student.tenant_id = student.tenant_id
                  AND boarding_student.student_id = student.id
                  AND lower(boarding_student.status) = 'active'
                ORDER BY boarding_student.created_at DESC, boarding_student.id DESC
                LIMIT 1
              ),
              'Unassigned hostel'
            ) AS hostel_name
          FROM students student
          WHERE student.tenant_id = $1
            AND student.id = $2::uuid
            AND student.deleted_at IS NULL
            AND lower(COALESCE(student.status::text, 'active')) IN ('active', 'enrolled')
            AND (
              EXISTS (
                SELECT 1
                FROM boarding_students boarding_student
                WHERE boarding_student.tenant_id = student.tenant_id
                  AND boarding_student.student_id = student.id
                  AND lower(boarding_student.status) = 'active'
              )
              OR EXISTS (
                SELECT 1
                FROM boarding_allocations allocation
                WHERE allocation.tenant_id = student.tenant_id
                  AND allocation.student_id::text = student.id::text
                  AND lower(allocation.status) = 'active'
              )
            )
          LIMIT 1
        ), selected_guardian AS (
          SELECT guardian.id, guardian.user_id, guardian.display_name, guardian.phone
          FROM student_guardians guardian
          INNER JOIN selected_student student
            ON student.id = guardian.student_id
          WHERE guardian.tenant_id = $1
            AND guardian.id = $3::uuid
            AND lower(guardian.status) = 'active'
          LIMIT 1
        ), inserted_leave AS (
          INSERT INTO boarding_exeats (
            tenant_id, student_id, guardian_id, student_name, hostel, leave_type, from_date, to_date,
            guardian_name, guardian_phone, reason, requested_by, metadata
          )
          SELECT
            $1,
            student.id,
            guardian.id,
            student.student_name,
            student.hostel_name,
            $4,
            $5::date,
            $6::date,
            guardian.display_name,
            guardian.phone,
            $7,
            $8::uuid,
            jsonb_build_object(
              'source_dashboard', 'boarding-master-command',
              'guardian_id', guardian.id,
              'student_id', student.id
            )
          FROM selected_student student
          INNER JOIN selected_guardian guardian ON TRUE
          RETURNING *
        ), guardian_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'boarding-exeat-requested-' || leave.id::text || '-' || guardian.id::text,
            guardian.user_id,
            guardian.id,
            'boarding.exeat_requested',
            leave.student_name || ' leave request created',
            leave.student_name || ' has a boarding leave request from ' || leave.from_date::text || ' to ' || leave.to_date::text || '.',
            'unread',
            'normal',
            'boarding',
            leave.id::text,
            jsonb_build_object('leave_id', leave.id, 'student_id', leave.student_id)
          FROM inserted_leave leave
          INNER JOIN selected_guardian guardian ON guardian.id = leave.guardian_id
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            status = 'unread',
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $8::uuid,
            $9,
            '["boarding_master", "deputy_principal", "principal"]'::jsonb,
            'boarding.exeat_requested',
            'boarding_exeat',
            leave.id::text,
            leave.student_name || ' leave request created',
            leave.student_name || ' requested ' || leave.leave_type || ' from ' || leave.from_date::text || ' to ' || leave.to_date::text || '.',
            'normal',
            jsonb_build_object(
              'leave_id', leave.id,
              'student_id', leave.student_id,
              'guardian_id', leave.guardian_id,
              'status', leave.status,
              'source_dashboard', 'boarding-master-command'
            )
          FROM inserted_leave leave
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $8::uuid,
            current_setting('app.request_id', true),
            'boarding.exeat_requested',
            'boarding_exeat',
            leave.id,
            jsonb_build_object(
              'student_id', leave.student_id,
              'guardian_id', leave.guardian_id,
              'status', leave.status,
              'source_dashboard', 'boarding-master-command'
            )
          FROM inserted_leave leave
          RETURNING id
        )
        SELECT
          leave.*,
          (SELECT COUNT(*)::int FROM guardian_notification) AS guardian_notifications_created,
          (SELECT COUNT(*)::int FROM inserted_event) AS event_count,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count
        FROM inserted_leave leave
      `,
      [
        tenantId,
        studentId,
        guardianId,
        leaveType,
        fromDate,
        toDate,
        reason,
        this.operations.uuidOrNull(userId),
        actorRole,
      ],
    );
    if (!result.rows[0]) {
      throw new BadRequestException('The active boarder and linked guardian were not found in this school');
    }
    const leave = this.formatLeaveExitRow(result.rows[0]);
    let roleNotificationStatus: 'recorded' | 'degraded' = 'recorded';
    const deliveryReasons: string[] = [];
    try {
      await this.operations.notifyRoles(tenantId, {
        key: `boarding-exeat-${leave.id}`,
        type: 'boarding.exeat_requested',
        title: `${leave.student_name} leave request created`,
        body: `${leave.student_name} requested ${leaveType} from ${fromDate} to ${toDate}.`,
        targetRoles: ['boarding_master', 'deputy_principal', 'principal'],
        metadata: { leaveId: leave.id, student_id: leave.student_id },
      });
    } catch {
      roleNotificationStatus = 'degraded';
      deliveryReasons.push('leadership_notification_failed');
    }
    return {
      success: true,
      message: roleNotificationStatus === 'recorded'
        ? `Leave request created and ${leave.guardian_notifications_created} linked guardian notification(s) recorded`
        : `Leave request created, audited, and ${leave.guardian_notifications_created} linked guardian notification(s) recorded; the leadership notification is degraded`,
      leave,
      delivery: {
        status: roleNotificationStatus,
        guardian_notifications_created: Number(leave.guardian_notifications_created || 0),
        reasons: deliveryReasons,
      },
    };
  }

  async actionLeaveRequest(id: string, action: 'approved' | 'rejected' | 'checked_out', dto: any = {}) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const actorRole = String(this.requestContext.getStore()?.role || 'boarding_master');
    const leaveRequestId = this.requiredUuid(id, 'Leave request ID');
    const decisionReason = action === 'rejected'
      ? this.operations.requiredText(dto?.reason, 'Rejection reason')
      : (dto?.reason ? String(dto.reason).trim() : null);
    const updateSql = action === 'approved'
      ? `
        UPDATE boarding_exeats
        SET status = $3,
            approved_by = $4::uuid,
            decision_reason = COALESCE($5, decision_reason),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status = 'pending'
        RETURNING *
      `
      : action === 'rejected'
        ? `
        UPDATE boarding_exeats
        SET status = $3,
            rejected_by = $4::uuid,
            decision_reason = $5,
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status = 'pending'
        RETURNING *
      `
        : `
        UPDATE boarding_exeats
        SET status = $3,
            checked_out_by = $4::uuid,
            decision_reason = COALESCE($5, decision_reason),
            checked_out_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2::uuid AND status = 'approved'
        RETURNING *
      `;
    const result = await this.operations.writeSql(
      `
        WITH updated_leave AS (
          ${updateSql}
        ), guardian_recipient AS (
          SELECT guardian.id, guardian.user_id
          FROM student_guardians guardian
          INNER JOIN updated_leave leave
            ON leave.tenant_id = guardian.tenant_id
           AND leave.student_id = guardian.student_id
           AND leave.guardian_id = guardian.id
          WHERE lower(guardian.status) = 'active'
        ), guardian_notification AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'boarding-exeat-' || $3 || '-' || leave.id::text || '-' || guardian.id::text,
            guardian.user_id,
            guardian.id,
            'boarding.exeat_' || $3,
            leave.student_name || ' leave request ' || REPLACE($3, '_', ' '),
            leave.student_name || ' leave request is now ' || REPLACE($3, '_', ' ') || '.',
            'unread',
            CASE WHEN $3 = 'checked_out' THEN 'high' ELSE 'normal' END,
            'boarding',
            leave.id::text,
            jsonb_build_object('leave_id', leave.id, 'student_id', leave.student_id, 'status', $3)
          FROM updated_leave leave
          INNER JOIN guardian_recipient guardian ON TRUE
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
          RETURNING id
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $4::uuid,
            $6,
            CASE
              WHEN $3 = 'checked_out'
                THEN '["boarding_master", "security_officer", "principal"]'::jsonb
              ELSE '["boarding_master", "deputy_principal", "principal"]'::jsonb
            END,
            'boarding.exeat_' || $3,
            'boarding_exeat',
            leave.id::text,
            leave.student_name || ' leave request ' || REPLACE($3, '_', ' '),
            leave.student_name || ' leave request is now ' || REPLACE($3, '_', ' ') || '.',
            CASE WHEN $3 = 'checked_out' THEN 'high' ELSE 'normal' END,
            jsonb_build_object(
              'leave_id', leave.id,
              'student_id', leave.student_id,
              'status', $3,
              'source_dashboard', 'boarding-master-command'
            )
          FROM updated_leave leave
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $4::uuid,
            current_setting('app.request_id', true),
            'boarding.exeat_' || $3,
            'boarding_exeat',
            leave.id,
            jsonb_build_object(
              'student_id', leave.student_id,
              'status', $3,
              'source_dashboard', 'boarding-master-command'
            )
          FROM updated_leave leave
          RETURNING id
        )
        SELECT
          leave.*,
          (SELECT COUNT(*)::int FROM guardian_notification) AS guardian_notifications_created,
          (SELECT COUNT(*)::int FROM inserted_event) AS event_count,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count
        FROM updated_leave leave
      `,
      [tenantId, leaveRequestId, action, this.operations.uuidOrNull(userId), decisionReason, actorRole],
    );
    const leave = this.formatLeaveExitRow(result.rows[0]);
    if (!leave) throw new NotFoundException('Leave request was not found in this school or is not awaiting this action');
    let roleNotificationStatus: 'recorded' | 'degraded' = 'recorded';
    const deliveryReasons: string[] = [];
    try {
      await this.operations.notifyRoles(tenantId, {
        key: `boarding-exeat-${action}-${leave.id}`,
        type: `boarding.exeat_${action}`,
        title: `${leave.student_name || 'Boarder'} leave request ${action.replace('_', ' ')}`,
        body: `${leave.student_name || 'Boarder'} leave request is now ${action.replace('_', ' ')}.`,
        targetRoles: action === 'checked_out' ? ['boarding_master', 'security_officer', 'principal'] : ['boarding_master', 'deputy_principal', 'principal'],
        metadata: { leaveId: leave.id, status: action },
      });
    } catch {
      roleNotificationStatus = 'degraded';
      deliveryReasons.push('staff_notification_failed');
    }
    return {
      success: true,
      message: roleNotificationStatus === 'recorded'
        ? `Leave request ${action}; ${Number(leave.guardian_notifications_created || 0)} linked guardian notification(s) recorded`
        : `Leave request ${action} and audited; linked guardian notification(s) were recorded, but the staff notification is degraded`,
      leave,
      delivery: {
        status: roleNotificationStatus,
        guardian_notifications_created: Number(leave.guardian_notifications_created || 0),
        reasons: deliveryReasons,
      },
    };
  }

  async forwardLeaveRequest(id: string) {
    const tenantId = this.requireTenantId();
    const userId = this.operations.uuidOrNull(this.currentUserId());
    const actorRole = String(this.requestContext.getStore()?.role || 'boarding_master');
    const leaveRequestId = this.requiredUuid(id, 'Leave request ID');
    const result = await this.operations.writeSql<{
      id: string;
      student_name: string;
      status: string;
      metadata: Record<string, unknown> | null;
      forwarded_at: string;
      event_count: number;
      audit_count: number;
      outcome: 'forwarded' | 'already_forwarded' | 'invalid_state';
    }>(
      `
        WITH target_leave AS (
          SELECT *
          FROM boarding_exeats
          WHERE tenant_id = $1
            AND id = $2::uuid
          LIMIT 1
        ), forwarded_leave AS (
          UPDATE boarding_exeats
          SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
                'forwarded_at', NOW(),
                'forwarded_by', $3::text,
                'source_dashboard', 'legacy-boarding-adapter'
              ),
              updated_at = NOW()
          WHERE tenant_id = $1
            AND id = $2::uuid
            AND status = 'pending'
            AND metadata->>'forwarded_at' IS NULL
          RETURNING *
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $3::uuid,
            $4,
            '["deputy_principal", "principal"]'::jsonb,
            'boarding.exeat_forwarded',
            'boarding_exeat',
            leave.id::text,
            leave.student_name || ' leave request forwarded',
            leave.student_name || ' leave request requires leadership review.',
            'high',
            jsonb_build_object(
              'leave_id', leave.id,
              'student_id', leave.student_id,
              'status', leave.status,
              'source_dashboard', 'legacy-boarding-adapter'
            )
          FROM forwarded_leave leave
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $3::uuid,
            current_setting('app.request_id', true),
            'boarding.exeat_forwarded',
            'boarding_exeat',
            leave.id,
            jsonb_build_object(
              'student_id', leave.student_id,
              'status', leave.status,
              'source_dashboard', 'legacy-boarding-adapter'
            )
          FROM forwarded_leave leave
          RETURNING id
        )
        SELECT
          leave.*,
          leave.metadata->>'forwarded_at' AS forwarded_at,
          (SELECT COUNT(*)::int FROM inserted_event) AS event_count,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count,
          'forwarded'::text AS outcome
        FROM forwarded_leave leave
        UNION ALL
        SELECT
          leave.*,
          leave.metadata->>'forwarded_at' AS forwarded_at,
          0::int AS event_count,
          0::int AS audit_count,
          CASE
            WHEN leave.metadata->>'forwarded_at' IS NOT NULL THEN 'already_forwarded'
            ELSE 'invalid_state'
          END AS outcome
        FROM target_leave leave
        WHERE NOT EXISTS (SELECT 1 FROM forwarded_leave)
      `,
      [tenantId, leaveRequestId, userId, actorRole],
    );
    const forwarded = result.rows[0];
    if (!forwarded) {
      throw new NotFoundException('Leave request was not found in this school');
    }
    if (forwarded.outcome === 'already_forwarded') {
      throw new ConflictException('Leave request has already been forwarded for leadership review');
    }
    if (forwarded.outcome === 'invalid_state') {
      throw new ConflictException('Only a pending leave request can be forwarded for leadership review');
    }

    let notificationStatus: 'recorded' | 'degraded' = 'recorded';
    const deliveryReasons: string[] = [];
    try {
      await this.operations.notifyRoles(tenantId, {
        key: `boarding-exeat-forwarded-${forwarded.id}`,
        type: 'boarding.exeat_forwarded',
        title: `${forwarded.student_name || 'Boarder'} leave request forwarded`,
        body: `${forwarded.student_name || 'A boarder'} leave request requires leadership review.`,
        targetRoles: ['deputy_principal', 'principal'],
        metadata: { leaveId: forwarded.id, forwarded_at: forwarded.forwarded_at },
      });
    } catch {
      notificationStatus = 'degraded';
      deliveryReasons.push('leadership_notification_failed');
    }

    return {
      success: true,
      message: notificationStatus === 'recorded'
        ? 'Leave request forwarded to school leadership for review'
        : 'Leave request was forwarded and audited, but the leadership notification could not be recorded',
      leave: {
        ...this.formatLeaveExitRow(forwarded),
        status: 'Forwarded',
        forwarded_at: forwarded.forwarded_at,
      },
      delivery: {
        status: notificationStatus,
        reasons: deliveryReasons,
      },
    };
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
    const [summary, incidents] = await Promise.all([
      this.executeSql<{ open_incidents: number; resolved_this_week: number }>(
        `
          SELECT
            COUNT(*) FILTER (WHERE incident.status = 'open')::int AS open_incidents,
            COUNT(*) FILTER (
              WHERE incident.status = 'resolved'
                AND incident.updated_at >= CURRENT_DATE - INTERVAL '7 days'
            )::int AS resolved_this_week
          FROM boarding_incidents incident
          WHERE incident.tenant_id = $1
        `,
        [tenantId],
      ),
      this.executeSql<{
        id: string;
        date: string;
        student_name: string;
        hostel: string;
        description: string;
        severity: string;
        status: string;
      }>(
        `
          SELECT
            incident.id::text,
            incident.created_at::text AS date,
            incident.title,
            COALESCE(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), '') AS student_name,
            COALESCE(house.title, '') AS hostel,
            incident.title AS description,
            INITCAP(REPLACE(incident.severity, '_', ' ')) AS severity,
            INITCAP(REPLACE(incident.status, '_', ' ')) AS status
          FROM boarding_incidents incident
          LEFT JOIN students student
            ON student.tenant_id = incident.tenant_id
           AND student.id::text = incident.student_id::text
          LEFT JOIN boarding_houses house
            ON house.tenant_id = incident.tenant_id
           AND house.id::text = incident.house_id::text
          WHERE incident.tenant_id = $1
          ORDER BY incident.created_at DESC, incident.id DESC
          LIMIT 200
        `,
        [tenantId],
      ),
    ]);
    const row = summary.rows[0] ?? { open_incidents: 0, resolved_this_week: 0 };
    return {
      metrics: {
        open_incidents: Number(row.open_incidents || 0),
        resolved_this_week: Number(row.resolved_this_week || 0),
      },
      incidentsList: incidents.rows,
      data: incidents.rows,
    };
  }

  async reportIncident(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const houseId = this.optionalUuid(dto?.house_id ?? dto?.houseId, 'Boarding house');
    const studentId = this.optionalUuid(dto?.student_id ?? dto?.studentId, 'Student');
    const result = await this.operations.writeSql(
      `
        WITH selected_house AS (
          SELECT house.id
          FROM boarding_houses house
          WHERE house.tenant_id = $1
            AND house.id = $2::uuid
            AND lower(house.status) IN ('active', 'open')
            AND COALESCE(lower(NULLIF(house.category, '')), 'house') IN ('house', 'hostel', 'dormitory')
          LIMIT 1
        ), selected_student AS (
          SELECT student.id
          FROM students student
          WHERE student.tenant_id = $1
            AND student.id = $3::uuid
            AND student.deleted_at IS NULL
            AND lower(student.status) IN ('active', 'enrolled')
            AND (
              EXISTS (
                SELECT 1
                FROM boarding_students boarding_student
                WHERE boarding_student.tenant_id = student.tenant_id
                  AND boarding_student.student_id = student.id
                  AND lower(boarding_student.status) = 'active'
                  AND ($2::uuid IS NULL OR boarding_student.house_id = $2::uuid)
              )
              OR (
                $2::uuid IS NULL
                AND EXISTS (
                  SELECT 1
                  FROM boarding_allocations allocation
                  WHERE allocation.tenant_id = student.tenant_id
                    AND allocation.student_id::text = student.id::text
                    AND allocation.status = 'active'
                )
              )
            )
          LIMIT 1
        ), inserted_incident AS (
          INSERT INTO boarding_incidents (tenant_id, house_id, student_id, title, severity, status)
          SELECT $1, $2::uuid, $3::uuid, $4, $5, 'open'
          WHERE ($2::uuid IS NULL OR EXISTS (SELECT 1 FROM selected_house))
            AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM selected_student))
          RETURNING *
        ), guardian_recipients AS (
          SELECT guardian.id, guardian.user_id
          FROM inserted_incident incident
          INNER JOIN student_guardians guardian
            ON guardian.tenant_id = incident.tenant_id
           AND guardian.student_id = incident.student_id
           AND lower(guardian.status) = 'active'
        ), guardian_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'boarding-incident-' || incident.id::text || '-' || guardian.id::text,
            guardian.user_id,
            guardian.id,
            'boarding.incident_reported',
            'Boarding incident recorded',
            'A boarding incident linked to a learner in your care was recorded. Contact the school for verified details.',
            'unread',
            CASE WHEN lower(incident.severity) IN ('critical', 'high') THEN 'high' ELSE 'normal' END,
            'boarding',
            incident.id::text,
            jsonb_build_object('incident_id', incident.id, 'student_id', incident.student_id)
          FROM inserted_incident incident
          INNER JOIN guardian_recipients guardian ON TRUE
          ON CONFLICT (tenant_id, notification_key)
          DO UPDATE SET
            recipient_user_id = EXCLUDED.recipient_user_id,
            recipient_guardian_id = EXCLUDED.recipient_guardian_id,
            body = EXCLUDED.body,
            status = 'unread',
            priority = EXCLUDED.priority,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
          RETURNING id
        )
        SELECT
          incident.*,
          (SELECT COUNT(*)::int FROM guardian_notifications) AS guardian_notifications_created
        FROM inserted_incident incident
      `,
      [
        tenantId,
        houseId,
        studentId,
        this.operations.requiredText(dto?.title ?? dto?.description ?? dto?.reason, 'Incident title'),
        dto?.severity || 'warning',
      ],
    );
    const incident = result.rows[0];
    if (!incident) {
      throw new BadRequestException('The selected boarding house or student was not found in this school');
    }
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

  private reportArtifactStatus(formatValue: unknown, artifactValue: unknown): 'Ready' | 'Failed' {
    const format = String(formatValue ?? '').trim().toLowerCase();
    if (!['csv', 'xlsx', 'pdf'].includes(format)) return 'Failed';
    let artifact: Record<string, unknown> | null = null;
    try {
      artifact = typeof artifactValue === 'string'
        ? JSON.parse(artifactValue) as Record<string, unknown>
        : artifactValue && typeof artifactValue === 'object' && !Array.isArray(artifactValue)
          ? artifactValue as Record<string, unknown>
          : null;
    } catch {
      return 'Failed';
    }
    if (!artifact) return 'Failed';
    const expectedContentTypes: Record<string, string> = {
      csv: 'text/csv; charset=utf-8',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      pdf: 'application/pdf',
    };
    if (artifact.kind !== 'generated-report' || artifact.encoding !== 'base64') return 'Failed';
    if (artifact.content_type !== expectedContentTypes[format]) return 'Failed';
    if (!String(artifact.filename ?? '').toLowerCase().endsWith(`.${format}`)) return 'Failed';
    const base64 = typeof artifact.content_base64 === 'string'
      ? artifact.content_base64.replace(/\s+/g, '')
      : '';
    if (!base64) return 'Failed';
    const content = Buffer.from(base64, 'base64');
    const normalizedDecoded = content.toString('base64').replace(/=+$/g, '');
    if (!content.length || normalizedDecoded !== base64.replace(/=+$/g, '')) return 'Failed';
    if (Number(artifact.byte_length) !== content.length) return 'Failed';
    if (artifact.checksum_sha256 !== createHash('sha256').update(content).digest('hex')) return 'Failed';
    return 'Ready';
  }

  async getReports() {
    const tenantId = this.requireTenantId();
    const result = await this.executeSql<{
      id: string;
      title: string;
      generated_at: string;
      type: string;
      artifact: unknown;
    }>(
      `
        SELECT
          snapshot.snapshot_id AS id,
          snapshot.title,
          snapshot.created_at::text AS generated_at,
          snapshot.format AS type,
          snapshot.artifact
        FROM report_snapshots snapshot
        WHERE snapshot.tenant_id = $1
          AND snapshot.module = 'boarding-master-command'
        ORDER BY snapshot.created_at DESC, snapshot.id DESC
        LIMIT 100
      `,
      [tenantId],
    );
    const reports = result.rows.map((report) => ({
      id: report.id,
      title: report.title,
      generated_at: report.generated_at,
      type: report.type,
      status: this.reportArtifactStatus(report.type, report.artifact),
    }));
    return {
      metrics: {
        reports_generated: reports.filter((report) => report.status === 'Ready').length,
        reports_failed: reports.filter((report) => report.status === 'Failed').length,
      },
      reportsList: reports,
      data: reports,
    };
  }

  async generateReport(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const [overview, hostels, roomsBeds, allocation, attendance, leaveExit, incidents] = await Promise.all([
      this.getOverview(),
      this.getHostels(),
      this.getRoomsBeds(),
      this.getAllocation(),
      this.getBoardingAttendance(),
      this.getLeaveExit(),
      this.getIncidents(),
    ]);
    return this.operations.generateReportSnapshot({
      tenantId,
      module: 'boarding-master-command',
      reportId: 'boarding-operations',
      title: String(dto?.name || dto?.title || dto?.report_type || 'Boarding operations report').trim().slice(0, 180),
      format: dto?.format,
      generatedByUserId: this.operations.uuidOrNull(userId),
      sections: { overview, hostels, roomsBeds, allocation, attendance, leaveExit, incidents },
      filters: { requested_from: 'boarding-master-dashboard' },
      targetRoles: ['principal', 'boarding_master'],
    });
  }

  async downloadReport(id: string) {
    const tenantId = this.requireTenantId();
    const reportId = this.operations.requiredText(id, 'Report ID');
    const result = await this.operations.readSql<{
      id: string;
      snapshotId: string;
      title: string;
      format: string;
      artifact: unknown;
      manifest: unknown;
      generatedDate: string;
    }>(
      `
        SELECT
          snapshot.id::text,
          snapshot.snapshot_id AS "snapshotId",
          snapshot.title,
          snapshot.format,
          snapshot.artifact,
          snapshot.manifest,
          snapshot.created_at::text AS "generatedDate"
        FROM report_snapshots snapshot
        WHERE snapshot.tenant_id = $1
          AND snapshot.module = 'boarding-master-command'
          AND (snapshot.id::text = $2 OR snapshot.snapshot_id = $2)
        LIMIT 1
      `,
      [tenantId, reportId],
    );
    const report = result.rows[0];
    if (!report) throw new NotFoundException('Boarding report was not found in this school');
    if (this.reportArtifactStatus(report.format, report.artifact) !== 'Ready') {
      throw new ConflictException('The stored boarding report artifact failed integrity verification');
    }

    const actorUserId = this.operations.uuidOrNull(this.currentUserId());
    await this.operations.writeSql(
      `
        WITH selected_report AS (
          SELECT id, tenant_id, snapshot_id, artifact
          FROM report_snapshots
          WHERE tenant_id = $1
            AND module = 'boarding-master-command'
            AND (id::text = $2 OR snapshot_id = $2)
          LIMIT 1
        ), snapshot_audit AS (
          INSERT INTO report_snapshot_audit_logs (
            tenant_id, snapshot_id, action, actor_user_id, request_id, metadata
          )
          SELECT
            tenant_id,
            snapshot_id,
            'report.snapshot.downloaded',
            $3::text,
            current_setting('app.request_id', true),
            jsonb_build_object('artifact_checksum_sha256', artifact->>'checksum_sha256')
          FROM selected_report
          RETURNING id
        ), general_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            tenant_id,
            $3::uuid,
            current_setting('app.request_id', true),
            'boarding-master-command.report.downloaded',
            'report_snapshot',
            id,
            jsonb_build_object(
              'snapshot_id', snapshot_id,
              'artifact_checksum_sha256', artifact->>'checksum_sha256'
            )
          FROM selected_report
          RETURNING id
        )
        SELECT snapshot_id FROM selected_report
      `,
      [tenantId, reportId, actorUserId],
    );
    return { success: true, message: 'Verified boarding report artifact is ready', report };
  }

  async recordAction(dto: any) {
    const tenantId = this.requireTenantId();
    const userId = this.currentUserId();
    const action = this.operations.requiredText(dto?.action ?? 'boarding_action', 'Action');
    const title = this.operations.requiredText(dto?.title ?? 'Boarding action', 'Action title');
    const message = String(dto?.message || dto?.body || `${title} recorded from boarding dashboard`);
    const targetRoles = Array.isArray(dto?.targetRoles) && dto.targetRoles.length > 0
      ? [...new Set<string>(dto.targetRoles.map((role: unknown): string => String(role).trim().toLowerCase()))]
      : ['boarding_master', 'principal'];
    if (targetRoles.length === 0 || targetRoles.some((role) => !BOARDING_WORKFLOW_TARGET_ROLES.has(role))) {
      throw new BadRequestException('Boarding workflow recipients must be authorized boarding, safeguarding, or school leadership roles');
    }
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
