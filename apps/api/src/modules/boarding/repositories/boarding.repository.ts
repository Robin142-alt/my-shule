import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

export type BoardingLateReturnRecord = {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  owner_name: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  metric_count: number;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_by_user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
  student_name: string;
  audit_count: number;
};

export type BoardingGuardianDelivery = {
  guardian_count: number;
  notification_count: number;
};

export type BoardingReferralRecord = {
  id: string;
  tenant_id: string;
  student_id: string;
  student_name: string;
  reason: string;
  referred_to: string;
  status: string;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  event_count: number;
  audit_count: number;
};

@Injectable()
export class BoardingRepository extends SimpleOperationsRepository {
  constructor(prisma: PrismaService) {
    super(prisma, {
      mainTable: 'boarding_houses',
      auditTable: 'boarding_audit_logs',
    });
  }

  async createReferral(input: {
    tenant_id: string;
    student_id: string;
    reason: string;
    referred_to: string;
    created_by: string;
    actor_role: string;
  }): Promise<BoardingReferralRecord | null> {
    const result = await this.executeSql<BoardingReferralRecord>(
      `
        WITH selected_student AS (
          SELECT
            student.id,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              student.admission_number,
              'Learner'
            ) AS student_name
          FROM students student
          WHERE student.tenant_id = $1
            AND student.id = $2::uuid
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status::text, 'active')) IN ('active', 'enrolled')
            AND (
              EXISTS (
                SELECT 1
                FROM boarding_students boarding_student
                WHERE boarding_student.tenant_id = student.tenant_id
                  AND boarding_student.student_id = student.id
                  AND LOWER(boarding_student.status) = 'active'
              )
              OR EXISTS (
                SELECT 1
                FROM boarding_allocations allocation
                WHERE allocation.tenant_id = student.tenant_id
                  AND allocation.student_id::text = student.id::text
                  AND LOWER(allocation.status) = 'active'
              )
            )
          LIMIT 1
        ), inserted_referral AS (
          INSERT INTO boarding_referrals (
            tenant_id, student_id, reason, referred_to, status, created_by
          )
          SELECT
            $1,
            student.id,
            $3,
            $4,
            'PENDING',
            $5::uuid
          FROM selected_student student
          RETURNING
            id::text,
            tenant_id,
            student_id::text,
            reason,
            referred_to,
            status,
            created_by::text,
            created_at,
            updated_at
        ), inserted_event AS (
          INSERT INTO workflow_events (
            tenant_id, source_user_id, source_role, target_roles, event_type,
            entity_type, entity_id, title, message, priority, payload
          )
          SELECT
            $1,
            $5::uuid,
            $6,
            jsonb_build_array($4::text),
            'boarding.referral.created',
            'boarding_referral',
            referral.id,
            student.student_name || ' boarding referral created',
            referral.reason,
            'normal',
            jsonb_build_object(
              'student_id', referral.student_id,
              'referred_to', referral.referred_to,
              'status', referral.status,
              'source_dashboard', 'legacy-boarding-adapter'
            )
          FROM inserted_referral referral
          INNER JOIN selected_student student ON student.id::text = referral.student_id
          RETURNING id
        ), inserted_audit AS (
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, request_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $5::uuid,
            current_setting('app.request_id', true),
            'boarding.referral.created',
            'boarding_referral',
            referral.id::uuid,
            jsonb_build_object(
              'student_id', referral.student_id,
              'referred_to', referral.referred_to,
              'status', referral.status,
              'source_dashboard', 'legacy-boarding-adapter'
            )
          FROM inserted_referral referral
          RETURNING id
        )
        SELECT
          referral.*,
          student.student_name,
          (SELECT COUNT(*)::int FROM inserted_event) AS event_count,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count
        FROM inserted_referral referral
        INNER JOIN selected_student student ON student.id::text = referral.student_id
      `,
      [
        input.tenant_id,
        input.student_id,
        input.reason,
        input.referred_to,
        input.created_by,
        input.actor_role,
      ],
    );

    return result.rows[0] ?? null;
  }

  async createLateReturnRecord(input: {
    tenant_id: string;
    student_id: string;
    title: string;
    owner_name: string | null;
    status: string;
    priority: string;
    due_date: string | null;
    metric_count: number;
    notes: string | null;
    metadata: Record<string, unknown>;
    created_by_user_id: string;
  }): Promise<BoardingLateReturnRecord | null> {
    const result = await this.executeSql<BoardingLateReturnRecord>(
      `
        WITH selected_student AS (
          SELECT
            student.id::text AS student_id,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', student.first_name, student.middle_name, student.last_name)), ''),
              student.admission_number,
              'Learner'
            ) AS student_name
          FROM students student
          WHERE student.tenant_id = $1
            AND student.id::text = $2
            AND student.deleted_at IS NULL
            AND LOWER(COALESCE(student.status::text, 'active')) IN ('active', 'enrolled')
            AND (
              EXISTS (
                SELECT 1
                FROM boarding_students boarding_student
                WHERE boarding_student.tenant_id = student.tenant_id
                  AND boarding_student.student_id = student.id
                  AND LOWER(boarding_student.status) = 'active'
              )
              OR EXISTS (
                SELECT 1
                FROM boarding_allocations allocation
                WHERE allocation.tenant_id = student.tenant_id
                  AND allocation.student_id::text = student.id::text
                  AND LOWER(allocation.status) = 'active'
              )
            )
          LIMIT 1
        ), inserted_record AS (
          INSERT INTO boarding_houses (
            tenant_id, title, category, owner_name, status, priority, due_date,
            metric_count, notes, metadata, created_by_user_id
          )
          SELECT
            $1,
            $3,
            'late_return',
            $4,
            $5,
            $6,
            $7::date,
            $8,
            $9,
            $10::jsonb,
            $11::uuid
          FROM selected_student
          RETURNING
            id::text,
            tenant_id,
            title,
            category,
            owner_name,
            status,
            priority,
            due_date::text,
            metric_count,
            notes,
            metadata,
            created_by_user_id::text,
            created_at,
            updated_at
        ), inserted_audit AS (
          INSERT INTO boarding_audit_logs (
            tenant_id, actor_user_id, action, resource_type, resource_id, metadata
          )
          SELECT
            $1,
            $11::uuid,
            'boarding.record.created',
            'boarding',
            record.id::uuid,
            jsonb_build_object(
              'title', record.title,
              'category', 'late_return',
              'student_id', $2
            )
          FROM inserted_record record
          RETURNING id
        )
        SELECT
          record.*,
          student.student_name,
          (SELECT COUNT(*)::int FROM inserted_audit) AS audit_count
        FROM inserted_record record
        CROSS JOIN selected_student student
      `,
      [
        input.tenant_id,
        input.student_id,
        input.title,
        input.owner_name,
        input.status,
        input.priority,
        input.due_date,
        input.metric_count,
        input.notes,
        JSON.stringify(input.metadata),
        input.created_by_user_id,
      ],
    );

    return result.rows[0] ?? null;
  }

  async notifyLateReturnGuardians(input: {
    tenant_id: string;
    student_id: string;
    record_id: string;
    title: string;
    body: string;
  }): Promise<BoardingGuardianDelivery> {
    const result = await this.executeSql<BoardingGuardianDelivery>(
      `
        WITH guardian_recipients AS (
          SELECT DISTINCT ON (guardian.user_id)
            guardian.id AS guardian_id,
            guardian.user_id
          FROM student_guardians guardian
          INNER JOIN tenant_memberships membership
            ON membership.tenant_id = guardian.tenant_id
           AND membership.user_id = guardian.user_id
           AND LOWER(membership.status) = 'active'
          WHERE guardian.tenant_id = $1
            AND guardian.student_id::text = $2
            AND LOWER(guardian.status) = 'active'
            AND guardian.user_id IS NOT NULL
          ORDER BY guardian.user_id, guardian.is_primary DESC, guardian.created_at ASC
        ), inserted_notifications AS (
          INSERT INTO notifications (
            tenant_id, notification_key, recipient_user_id, recipient_guardian_id,
            type, title, body, status, priority, source_module, source_record_id, metadata
          )
          SELECT
            $1,
            'boarding-late-return-' || $3 || '-' || recipient.guardian_id::text,
            recipient.user_id,
            recipient.guardian_id,
            'boarding.late_return',
            $4,
            $5,
            'unread',
            'high',
            'boarding',
            $3,
            jsonb_build_object(
              'student_id', $2,
              'record_id', $3,
              'recipient_scope', 'exact_linked_guardian_user'
            )
          FROM guardian_recipients recipient
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
        )
        SELECT
          (SELECT COUNT(*)::int FROM guardian_recipients) AS guardian_count,
          (SELECT COUNT(*)::int FROM inserted_notifications) AS notification_count
      `,
      [input.tenant_id, input.student_id, input.record_id, input.title, input.body],
    );

    return result.rows[0] ?? { guardian_count: 0, notification_count: 0 };
  }

  async getOperationalMetrics(tenantId: string): Promise<{
    total_boarders: number;
    open_incidents: number;
    approved_leave: number;
  }> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx) => {
      const rows = await tx.$queryRawUnsafe<Array<{
        total_boarders: number;
        open_incidents: number;
        approved_leave: number;
      }>>(
        `
          SELECT
            (
              SELECT COUNT(*)::int
              FROM students student
              WHERE student.tenant_id = $1
                AND student.deleted_at IS NULL
                AND LOWER(COALESCE(student.status::text, 'active')) IN ('active', 'enrolled')
                AND (
                  EXISTS (
                    SELECT 1
                    FROM boarding_students boarding_student
                    WHERE boarding_student.tenant_id = student.tenant_id
                      AND boarding_student.student_id = student.id
                      AND LOWER(boarding_student.status) = 'active'
                  )
                  OR EXISTS (
                    SELECT 1
                    FROM boarding_allocations allocation
                    WHERE allocation.tenant_id = student.tenant_id
                      AND allocation.student_id::text = student.id::text
                      AND LOWER(allocation.status) = 'active'
                  )
                )
            ) AS total_boarders,
            (
              SELECT COUNT(*)::int
              FROM boarding_incidents
              WHERE tenant_id = $1 AND status = 'open'
            ) AS open_incidents,
            (
              SELECT COUNT(*)::int
              FROM boarding_exeats exeat
              WHERE exeat.tenant_id = $1
                AND LOWER(exeat.status) IN ('approved', 'checked_out')
            ) AS approved_leave
        `,
        tenantId,
      );

      return rows[0] ?? {
        total_boarders: 0,
        open_incidents: 0,
        approved_leave: 0,
      };
    });
  }
}
