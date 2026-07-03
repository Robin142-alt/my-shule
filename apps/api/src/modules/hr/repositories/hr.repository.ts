import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import type {
  ApproveLeaveRequestDto,
  ApproveStaffContractDto,
  ChangeStaffStatusDto,
} from '../dto/hr.dto';

@Injectable()
export class HrRepository {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(private readonly prisma: PrismaService) {}

  async createStaffProfile(input: {
    tenant_id: string;
    display_name: string;
    department_id?: string;
    job_title_id?: string;
    status: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_profiles (
          tenant_id,
          display_name,
          department_id,
          job_title_id,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3::uuid, $4::uuid, $5, NOW(), NOW())
        RETURNING id::text, display_name, status
      `,
      [
        input.tenant_id,
        input.display_name,
        input.department_id ?? null,
        input.job_title_id ?? null,
        input.status,
      ],
    );

    return result.rows[0];
  }

  async updateStaffProfile(input: {
    tenant_id: string;
    staff_profile_id: string;
    statutory_identifiers?: Record<string, string>;
    emergency_contact?: Record<string, string>;
    status?: string;
  }) {
    const params: any[] = [input.tenant_id, input.staff_profile_id];
    let query = `UPDATE staff_profiles SET updated_at = NOW()`;
    let paramIndex = 3;

    if (input.statutory_identifiers) {
      query += `, statutory_identifiers = $${paramIndex}::jsonb`;
      params.push(JSON.stringify(input.statutory_identifiers));
      paramIndex++;
    }

    if (input.emergency_contact) {
      query += `, emergency_contact = $${paramIndex}::jsonb`;
      params.push(JSON.stringify(input.emergency_contact));
      paramIndex++;
    }

    if (input.status) {
      query += `, status = $${paramIndex}`;
      params.push(input.status);
      paramIndex++;
    }

    query += ` WHERE tenant_id = $1 AND id = $2::uuid RETURNING id::text, status`;

    const result = await this.executeSql(query, params);
    return result.rows[0] ?? null;
  }

  async approveStaffProfile(input: {
    tenant_id: string;
    staff_profile_id: string;
    staff_number: string;
    status: string;
  }) {
    const result = await this.executeSql(
      `
        UPDATE staff_profiles
        SET staff_number = $3,
            status = $4,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, staff_number, status
      `,
      [input.tenant_id, input.staff_profile_id, input.staff_number, input.status],
    );

    return result.rows[0] ?? null;
  }

  async findOverlappingActiveContract(tenantId: string, input: ApproveStaffContractDto) {
    const result = await this.executeSql(
      `
        SELECT id::text
        FROM staff_contracts
        WHERE tenant_id = $1
          AND staff_profile_id = $2::uuid
          AND approval_state = 'approved'
          AND daterange(starts_on, COALESCE(ends_on, 'infinity'::date), '[]')
              && daterange($3::date, COALESCE($4::date, 'infinity'::date), '[]')
        LIMIT 1
      `,
      [tenantId, input.staff_profile_id, input.starts_on, input.ends_on ?? null],
    );

    return result.rows[0] ?? null;
  }

  async approveContract(input: ApproveStaffContractDto & {
    tenant_id: string;
    approved_by_user_id: string | null;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_contracts (
          tenant_id,
          staff_profile_id,
          role_title,
          starts_on,
          ends_on,
          employment_type,
          workload,
          approval_state,
          approved_by_user_id,
          approved_at
        )
        VALUES ($1, $2::uuid, $3, $4::date, $5::date, $6, $7, 'approved', $8, NOW())
        RETURNING *
      `,
      [
        input.tenant_id,
        input.staff_profile_id,
        input.role_title,
        input.starts_on,
        input.ends_on ?? null,
        input.employment_type,
        input.workload,
        input.approved_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async findLeaveBalance(tenantId: string, staffProfileId: string, leaveType: string) {
    const result = await this.executeSql<{ available_days: string | number }>(
      `
        SELECT available_days
        FROM staff_leave_balances
        WHERE tenant_id = $1
          AND staff_profile_id = $2::uuid
          AND leave_type = $3
        LIMIT 1
      `,
      [tenantId, staffProfileId, leaveType],
    );

    return result.rows[0] ?? { available_days: 0 };
  }

  async approveLeaveRequest(input: ApproveLeaveRequestDto & {
    tenant_id: string;
    approved_by_user_id: string | null;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_leave_requests (
          tenant_id,
          staff_profile_id,
          leave_type,
          requested_days,
          status,
          override_reason,
          approved_by_user_id,
          approved_at
        )
        VALUES ($1, $2::uuid, $3, $4, 'approved', $5, $6, NOW())
        RETURNING *
      `,
      [
        input.tenant_id,
        input.staff_profile_id,
        input.leave_type,
        input.requested_days,
        input.override_reason ?? null,
        input.approved_by_user_id,
      ],
    );

    return result.rows[0];
  }

  async changeStaffStatus(input: ChangeStaffStatusDto & {
    tenant_id: string;
  }) {
    const result = await this.executeSql(
      `
        UPDATE staff_profiles
        SET status = $3,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, status
      `,
      [input.tenant_id, input.staff_profile_id, input.status],
    );

    return result.rows[0] ?? null;
  }

  async listStaffDirectory(input: {
    tenant_id: string;
    search?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const requestedLimit = Number.isFinite(input.limit) ? Math.floor(Number(input.limit)) : 25;
    const requestedOffset = Number.isFinite(input.offset) ? Math.floor(Number(input.offset)) : 0;
    const limit = requestedLimit > 0 ? Math.min(requestedLimit, 50) : 25;
    const offset = Math.max(requestedOffset, 0);

    const result = await this.executeSql(
      `
        SELECT
          profile.id::text,
          profile.user_id::text,
          profile.staff_number,
          profile.display_name,
          profile.display_name AS full_name,
          profile.status,
          department.name AS department_name,
          job_title.title AS job_title,
          profile.created_at::text,
          profile.updated_at::text
        FROM staff_profiles profile
        LEFT JOIN staff_departments department
          ON department.tenant_id = profile.tenant_id
         AND department.id = profile.department_id
        LEFT JOIN staff_job_titles job_title
          ON job_title.tenant_id = profile.tenant_id
         AND job_title.id = profile.job_title_id
        WHERE profile.tenant_id = $1
          AND (
            $2::text IS NULL
            OR profile.display_name ILIKE '%' || $2 || '%'
            OR profile.staff_number ILIKE '%' || $2 || '%'
          )
          AND ($3::text IS NULL OR profile.status = $3)
        ORDER BY profile.display_name, profile.staff_number
        LIMIT $4::integer
        OFFSET $5::integer
      `,
      [input.tenant_id, input.search ?? null, input.status ?? null, limit, offset],
    );

    return result.rows;
  }

  async appendAuditLog(input: {
    tenant_id: string;
    staff_profile_id?: string | null;
    actor_user_id?: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.executeSql(
      `
        INSERT INTO staff_audit_logs (
          tenant_id,
          staff_profile_id,
          actor_user_id,
          action,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        input.tenant_id,
        input.staff_profile_id ?? null,
        input.actor_user_id ?? null,
        input.action,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  async getStaffAttendance(tenantId: string, date: string) {
    const result = await this.executeSql(
      `
        SELECT
          p.id as staff_profile_id,
          p.display_name,
          p.staff_number,
          p.status as profile_status,
          a.status as attendance_status,
          a.notes as attendance_notes
        FROM staff_profiles p
        LEFT JOIN staff_attendance a 
          ON a.staff_profile_id = p.id 
          AND a.tenant_id = p.tenant_id 
          AND a.date = $2::date
        WHERE p.tenant_id = $1
          AND p.status IN ('active', 'on_leave', 'suspended')
        ORDER BY p.display_name ASC
      `,
      [tenantId, date],
    );

    return result.rows;
  }

  async requestLeave(input: {
    tenant_id: string;
    staff_profile_id: string;
    leave_type: string;
    requested_days: number;
    reason?: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_leave_requests (
          tenant_id,
          staff_profile_id,
          leave_type,
          requested_days,
          status,
          override_reason,
          created_at
        )
        VALUES ($1, $2::uuid, $3, $4, 'requested', $5, NOW())
        RETURNING *
      `,
      [input.tenant_id, input.staff_profile_id, input.leave_type, input.requested_days, input.reason ?? null],
    );

    return result.rows[0];
  }

  async listLeaveRequests(tenantId: string, status?: string) {
    const result = await this.executeSql(
      `
        SELECT
          r.id,
          r.tenant_id,
          r.staff_profile_id,
          r.leave_type,
          r.requested_days,
          r.status,
          r.override_reason,
          r.created_at,
          p.display_name,
          p.staff_number
        FROM staff_leave_requests r
        JOIN staff_profiles p ON p.id = r.staff_profile_id AND p.tenant_id = r.tenant_id
        WHERE r.tenant_id = $1
          AND ($2::text IS NULL OR r.status = $2)
        ORDER BY r.created_at DESC
      `,
      [tenantId, status ?? null],
    );

    return result.rows;
  }

  async updateLeaveRequestStatus(
    tenantId: string,
    leaveRequestId: string,
    status: 'approved' | 'rejected',
    reason?: string,
    approvedByUserId?: string | null,
  ) {
    const result = await this.executeSql(
      `
        UPDATE staff_leave_requests
        SET status = $3,
            override_reason = COALESCE($4, override_reason),
            approved_by_user_id = CASE WHEN $3 = 'approved' THEN $5::uuid ELSE approved_by_user_id END,
            approved_at = CASE WHEN $3 = 'approved' THEN NOW() ELSE approved_at END
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, leaveRequestId, status, reason ?? null, approvedByUserId ?? null],
    );

    return result.rows[0] ?? null;
  }

  async getLeaveRequestById(tenantId: string, id: string) {
    const result = await this.executeSql(
      `
        SELECT *
        FROM staff_leave_requests
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, id],
    );

    return result.rows[0] ?? null;
  }

  async upsertStaffAttendance(input: {
    tenant_id: string;
    staff_profile_id: string;
    date: string;
    status: string;
    notes?: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_attendance (
          tenant_id,
          staff_profile_id,
          date,
          status,
          notes,
          created_at,
          updated_at
        )
        VALUES ($1, $2::uuid, $3::date, $4, $5, NOW(), NOW())
        ON CONFLICT (tenant_id, staff_profile_id, date)
        DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          updated_at = NOW()
        RETURNING id::text, staff_profile_id::text, date, status, notes
      `,
      [input.tenant_id, input.staff_profile_id, input.date, input.status, input.notes ?? null],
    );

    return result.rows[0];
  }

  async uploadStaffDocument(input: {
    tenant_id: string;
    staff_profile_id: string;
    document_type: string;
    stored_path: string;
    expires_on?: string;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_documents (
          tenant_id,
          staff_profile_id,
          document_type,
          stored_path,
          expires_on,
          verification_status,
          created_at,
          updated_at
        )
        VALUES ($1, $2::uuid, $3, $4, $5::date, 'pending', NOW(), NOW())
        RETURNING *
      `,
      [input.tenant_id, input.staff_profile_id, input.document_type, input.stored_path, input.expires_on ?? null],
    );

    return result.rows[0];
  }

  async listStaffDocuments(tenantId: string, staffProfileId: string) {
    const result = await this.executeSql(
      `
        SELECT *
        FROM staff_documents
        WHERE tenant_id = $1
          AND staff_profile_id = $2::uuid
        ORDER BY created_at DESC
      `,
      [tenantId, staffProfileId],
    );

    return result.rows;
  }

  async verifyStaffDocument(tenantId: string, documentId: string, status: 'verified' | 'rejected') {
    const result = await this.executeSql(
      `
        UPDATE staff_documents
        SET verification_status = $3,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, documentId, status],
    );

    return result.rows[0] ?? null;
  }

  async createDepartment(tenantId: string, name: string) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_departments (tenant_id, name, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING *
      `,
      [tenantId, name],
    );
    return result.rows[0];
  }

  async listDepartments(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT * FROM staff_departments
        WHERE tenant_id = $1
        ORDER BY name ASC
      `,
      [tenantId],
    );
    return result.rows;
  }

  async createJobTitle(tenantId: string, departmentId: string | undefined, title: string) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_job_titles (tenant_id, department_id, title, created_at, updated_at)
        VALUES ($1, $2::uuid, $3, NOW(), NOW())
        RETURNING *
      `,
      [tenantId, departmentId ?? null, title],
    );
    return result.rows[0];
  }

  async listJobTitles(tenantId: string, departmentId?: string) {
    const result = await this.executeSql(
      `
        SELECT * FROM staff_job_titles
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR department_id = $2::uuid)
        ORDER BY title ASC
      `,
      [tenantId, departmentId ?? null],
    );
    return result.rows;
  }

  async assignRole(tenantId: string, staffProfileId: string, departmentId?: string, jobTitleId?: string) {
    const result = await this.executeSql(
      `
        UPDATE staff_profiles
        SET department_id = $3::uuid,
            job_title_id = $4::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING *
      `,
      [tenantId, staffProfileId, departmentId ?? null, jobTitleId ?? null],
    );
    return result.rows[0];
  }

  async createPayrollBand(tenantId: string, name: string, baseSalary: number, currency: string) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_payroll_bands (tenant_id, name, base_salary, currency, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *
      `,
      [tenantId, name, baseSalary, currency],
    );
    return result.rows[0];
  }

  async listPayrollBands(tenantId: string) {
    const result = await this.executeSql(
      `
        SELECT * FROM staff_payroll_bands
        WHERE tenant_id = $1
        ORDER BY base_salary ASC
      `,
      [tenantId],
    );
    return result.rows;
  }

  async setStaffSalary(tenantId: string, staffProfileId: string, bandId?: string, customSalary?: number) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_salaries (tenant_id, staff_profile_id, payroll_band_id, custom_base_salary, created_at, updated_at)
        VALUES ($1, $2::uuid, $3::uuid, $4, NOW(), NOW())
        ON CONFLICT (tenant_id, staff_profile_id)
        DO UPDATE SET
          payroll_band_id = EXCLUDED.payroll_band_id,
          custom_base_salary = EXCLUDED.custom_base_salary,
          updated_at = NOW()
        RETURNING *
      `,
      [tenantId, staffProfileId, bandId ?? null, customSalary ?? null],
    );
    return result.rows[0];
  }

  async getStaffSalary(tenantId: string, staffProfileId: string) {
    const result = await this.executeSql(
      `
        SELECT s.*, b.base_salary as band_base_salary, b.currency as band_currency
        FROM staff_salaries s
        LEFT JOIN staff_payroll_bands b ON b.id = s.payroll_band_id AND b.tenant_id = s.tenant_id
        WHERE s.tenant_id = $1
          AND s.staff_profile_id = $2::uuid
        LIMIT 1
      `,
      [tenantId, staffProfileId],
    );
    return result.rows[0] ?? null;
  }

  async generatePayslip(tenantId: string, staffProfileId: string, month: number, year: number, base: number, deductions: number, bonuses: number, net: number) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_payslips (tenant_id, staff_profile_id, month, year, base_amount, deductions, bonuses, net_pay, status, created_at, updated_at)
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, 'draft', NOW(), NOW())
        ON CONFLICT (tenant_id, staff_profile_id, month, year)
        DO UPDATE SET
          base_amount = EXCLUDED.base_amount,
          deductions = EXCLUDED.deductions,
          bonuses = EXCLUDED.bonuses,
          net_pay = EXCLUDED.net_pay,
          updated_at = NOW()
        RETURNING *
      `,
      [tenantId, staffProfileId, month, year, base, deductions, bonuses, net],
    );
    return result.rows[0];
  }

  async listPayslips(tenantId: string, month: number, year: number) {
    const result = await this.executeSql(
      `
        SELECT p.*, s.display_name, s.staff_number
        FROM staff_payslips p
        JOIN staff_profiles s ON s.id = p.staff_profile_id AND s.tenant_id = p.tenant_id
        WHERE p.tenant_id = $1
          AND p.month = $2
          AND p.year = $3
        ORDER BY s.display_name ASC
      `,
      [tenantId, month, year],
    );
    return result.rows;
  }

  async createPerformanceReview(tenantId: string, staffProfileId: string, reviewerId: string, reviewDate: string, score: number, comments: string, goals?: string) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_performance_reviews (tenant_id, staff_profile_id, reviewer_id, review_date, score, comments, goals_for_next_period, created_at, updated_at)
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `,
      [tenantId, staffProfileId, reviewerId, reviewDate, score, comments, goals ?? null],
    );
    return result.rows[0];
  }

  async listPerformanceReviews(tenantId: string, staffProfileId?: string) {
    const result = await this.executeSql(
      `
        SELECT r.*, s.display_name, s.staff_number
        FROM staff_performance_reviews r
        JOIN staff_profiles s ON s.id = r.staff_profile_id AND s.tenant_id = r.tenant_id
        WHERE r.tenant_id = $1
          AND ($2::text IS NULL OR r.staff_profile_id = $2::uuid)
        ORDER BY r.review_date DESC
      `,
      [tenantId, staffProfileId ?? null],
    );
    return result.rows;
  }

  async createDisciplinaryRecord(tenantId: string, staffProfileId: string, incidentDate: string, severity: string, description: string, actionTaken?: string) {
    const result = await this.executeSql(
      `
        INSERT INTO staff_disciplinary_records (tenant_id, staff_profile_id, incident_date, severity, description, action_taken, status, created_at, updated_at)
        VALUES ($1, $2::uuid, $3, $4, $5, $6, 'open', NOW(), NOW())
        RETURNING *
      `,
      [tenantId, staffProfileId, incidentDate, severity, description, actionTaken ?? null],
    );
    return result.rows[0];
  }

  async listDisciplinaryRecords(tenantId: string, staffProfileId?: string) {
    const result = await this.executeSql(
      `
        SELECT d.*, s.display_name, s.staff_number
        FROM staff_disciplinary_records d
        JOIN staff_profiles s ON s.id = d.staff_profile_id AND s.tenant_id = d.tenant_id
        WHERE d.tenant_id = $1
          AND ($2::text IS NULL OR d.staff_profile_id = $2::uuid)
        ORDER BY d.incident_date DESC
      `,
      [tenantId, staffProfileId ?? null],
    );
    return result.rows;
  }
}
