import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';
import { SimpleOperationsRepository } from '../../implementation100/simple-operations';

@Injectable()
export class LmsRepository extends SimpleOperationsRepository {
  constructor(prisma: PrismaService) {
    super(prisma, {
      mainTable: 'lms_courses',
      auditTable: 'lms_audit_logs',
    });
  }

  async findAssignment(tenantId: string, assignmentId: string) {
    const result = await this.executeSql(
      `
        SELECT
          id::text,
          tenant_id,
          course_id::text,
          title,
          due_at::text,
          status,
          metadata,
          created_at::text,
          updated_at::text
        FROM lms_assignments
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `,
      [tenantId, assignmentId],
    );

    return result.rows[0] ?? null;
  }

  async createAssignmentSubmission(input: {
    tenant_id: string;
    assignment_id: string;
    student_id: string;
    status: string;
    submitted_by_user_id: string | null;
    metadata: Record<string, unknown>;
  }) {
    const result = await this.executeSql(
      `
        INSERT INTO lms_submissions (
          tenant_id,
          assignment_id,
          student_id,
          status,
          submitted_by_user_id,
          metadata
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5::uuid, $6::jsonb)
        RETURNING
          id::text,
          tenant_id,
          assignment_id::text,
          student_id::text,
          status,
          score,
          metadata,
          submitted_by_user_id::text,
          submitted_at::text,
          created_at::text,
          updated_at::text
      `,
      [
        input.tenant_id,
        input.assignment_id,
        input.student_id,
        input.status,
        input.submitted_by_user_id,
        JSON.stringify(input.metadata),
      ],
    );

    return result.rows[0];
  }
}
