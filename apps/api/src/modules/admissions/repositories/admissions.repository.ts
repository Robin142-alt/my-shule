import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

export interface AdmissionApplicationRecord {
  id: string;
  school_id: string;
  application_number: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  birth_certificate_number: string;
  nationality: string;
  previous_school: string | null;
  kcpe_results: string | null;
  cbc_level: string | null;
  nemis_upi: string | null;
  class_applying: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  parent_occupation: string | null;
  relationship: string;
  allergies: string | null;
  conditions: string | null;
  emergency_contact: string | null;
  status: string;
  interview_date: string | null;
  review_notes: string | null;
  approved_at: string | null;
  admitted_student_id: string | null;
  created_at?: Date;
  updated_at?: Date;
}

@Injectable()
export class AdmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(tenantId: string, sql: string, params: any[]): Promise<T[]> {
    return this.prisma.executeWithTenant<any>(tenantId, null, async (tx: any) => {
      const rows = await tx.$queryRawUnsafe(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    });
  }


  async buildSummary(tenantId: string) {
    const [newApplications, approvedStudents, pendingReview, totalRegistered, recentApplications, pendingApprovals, missingDocuments] = await Promise.all([
      this.countByStatus(tenantId, ['pending', 'interview']),
      this.countByStatus(tenantId, ['approved']),
      this.countByStatus(tenantId, ['pending']),
      this.countByStatus(tenantId, ['registered']),
      this.executeSql(tenantId, `
          SELECT application_number, (first_name || ' ' || last_name) AS full_name, applying_for_class_id AS class_applying, application_status AS status, guardian_phone AS parent_phone, created_at
          FROM admission_applications
          WHERE school_id = $1
          ORDER BY created_at DESC
          LIMIT 6
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT application_number, (first_name || ' ' || last_name) AS full_name, application_status AS status
          FROM admission_applications
          WHERE school_id = $1
            AND status IN ('pending', 'interview')
          ORDER BY created_at DESC
          LIMIT 6
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT
            application.id::text AS application_id,
            application.application_number,
            application.full_name,
            COUNT(document.id)::int AS uploaded_documents
          FROM admission_applications application
          LEFT JOIN admission_documents document
            ON document.school_id = application.tenant_id
           AND document.application_id = application.id
          WHERE application.school_id = $1
          GROUP BY application.id
          HAVING COUNT(document.id) < 3
          ORDER BY application.created_at DESC
          LIMIT 6
        `, [tenantId],
      ),
    ]);

    return {
      new_applications: newApplications,
      approved_students: approvedStudents,
      pending_review: pendingReview,
      total_registered: totalRegistered,
      recent_applications: recentApplications,
      pending_approvals: pendingApprovals,
      missing_documents: missingDocuments,
    };
  }

  private async countByStatus(tenantId: string, statuses: string[]) {
    const result = await this.executeSql(tenantId, `
        SELECT COUNT(*)::text AS total
        FROM admission_applications
        WHERE school_id = $1
          AND status = ANY($2::text[])
      `, [tenantId, statuses],
    );

    return Number(result[0]?.total ?? '0');
  }

  async listApplications(
    tenantId: string,
    options: { search?: string; status?: string; limit: number; offset?: number },
  ): Promise<AdmissionApplicationRecord[]> {
    const conditions = ['school_id = $1'];
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;
    const search = this.normalizeSearch(options.search);

    if (search) {
      conditions.push(
        `(full_name ILIKE $${parameterIndex} OR application_number ILIKE $${parameterIndex} OR parent_phone ILIKE $${parameterIndex})`,
      );
      values.push(`%${search}%`);
      parameterIndex += 1;
    }

    if (options.status) {
      conditions.push(`status = $${parameterIndex}`);
      values.push(options.status);
      parameterIndex += 1;
    }

    const limitParameterIndex = parameterIndex;
    values.push(this.normalizeLimit(options.limit));
    parameterIndex += 1;
    const offsetParameterIndex = parameterIndex;
    values.push(this.normalizeOffset(options.offset));

    const result = await this.executeSql(values[0] as string, `
        SELECT
          id,
          school_id,
          application_number,
          (first_name || ' ' || last_name) AS full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          applying_for_class_id AS class_applying,
          guardian_name AS parent_name,
          guardian_phone AS parent_phone,
          guardian_email AS parent_email,
          guardian_occupation AS parent_occupation,
          guardian_relationship AS relationship,
          allergies,
          conditions,
          emergency_contact,
          application_status AS status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id::text,
          created_at,
          updated_at
        FROM admission_applications
        WHERE ${conditions.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${limitParameterIndex}::integer
        OFFSET $${offsetParameterIndex}::integer
      `, values,
    );

    return result;
  }

  async createApplication(input: Omit<AdmissionApplicationRecord, 'id' | 'created_at' | 'updated_at' | 'approved_at' | 'admitted_student_id'>) {
    const result = await this.executeSql(input.school_id, `
        INSERT INTO admission_applications (
          school_id,
          application_number,
          first_name,
          last_name,
          date_of_birth,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          applying_for_class_id,
          guardian_name,
          guardian_phone,
          guardian_email,
          guardian_occupation,
          guardian_relationship,
          allergies,
          conditions,
          emergency_contact,
          application_status,
          interview_date,
          review_notes
        )
        VALUES (
          $1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23::date, $24
        )
        RETURNING
          id,
          school_id,
          application_number,
          (first_name || ' ' || last_name) AS full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          applying_for_class_id AS class_applying,
          guardian_name AS parent_name,
          guardian_phone AS parent_phone,
          guardian_email AS parent_email,
          guardian_occupation AS parent_occupation,
          guardian_relationship AS relationship,
          allergies,
          conditions,
          emergency_contact,
          application_status AS status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id,
          created_at::text,
          updated_at::text
      `, [
        input.school_id,
        input.application_number,
        input.full_name,
        input.date_of_birth,
        input.gender,
        input.birth_certificate_number,
        input.nationality,
        input.previous_school,
        input.kcpe_results,
        input.cbc_level,
        input.nemis_upi,
        input.class_applying,
        input.parent_name,
        input.parent_phone,
        input.parent_email,
        input.parent_occupation,
        input.relationship,
        input.allergies,
        input.conditions,
        input.emergency_contact,
        input.status,
        input.interview_date,
        input.review_notes,
      ]
    );

    return result[0];
  }

  async findApplicationById(tenantId: string, applicationId: string): Promise<AdmissionApplicationRecord | null> {
    const result = await this.executeSql(tenantId, `
        SELECT
          id,
          school_id,
          application_number,
          (first_name || ' ' || last_name) AS full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          applying_for_class_id AS class_applying,
          guardian_name AS parent_name,
          guardian_phone AS parent_phone,
          guardian_email AS parent_email,
          guardian_occupation AS parent_occupation,
          guardian_relationship AS relationship,
          allergies,
          conditions,
          emergency_contact,
          application_status AS status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id::text,
          created_at,
          updated_at
        FROM admission_applications
        WHERE school_id = $1
          AND id = $2::uuid
        LIMIT 1
      `, [tenantId, applicationId],
    );

    return result[0] ?? null;
  }

  async findApplicationByIdForUpdate(
    tenantId: string,
    applicationId: string,
  ): Promise<AdmissionApplicationRecord | null> {
    const result = await this.executeSql(tenantId, `
        SELECT
          id,
          school_id,
          application_number,
          (first_name || ' ' || last_name) AS full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          applying_for_class_id AS class_applying,
          guardian_name AS parent_name,
          guardian_phone AS parent_phone,
          guardian_email AS parent_email,
          guardian_occupation AS parent_occupation,
          guardian_relationship AS relationship,
          allergies,
          conditions,
          emergency_contact,
          application_status AS status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id::text,
          created_at,
          updated_at
        FROM admission_applications
        WHERE school_id = $1
          AND id = $2::uuid
        LIMIT 1
        FOR UPDATE
      `, [tenantId, applicationId],
    );

    return result[0] ?? null;
  }

  async updateApplication(
    tenantId: string,
    applicationId: string,
    input: Partial<Pick<AdmissionApplicationRecord, 'status' | 'review_notes' | 'interview_date' | 'nemis_upi'>>,
  ) {
    const assignments: string[] = [];
    const values: unknown[] = [tenantId, applicationId];
    let parameterIndex = 3;

    if (input.status !== undefined) {
      assignments.push(`application_status = $${parameterIndex}`);
      values.push(input.status);
      parameterIndex += 1;
      if (input.status === 'approved') {
        assignments.push(`approved_at = NOW()`);
      }
    }

    if (input.review_notes !== undefined) {
      assignments.push(`review_notes = $${parameterIndex}`);
      values.push(input.review_notes);
      parameterIndex += 1;
    }

    if (input.interview_date !== undefined) {
      assignments.push(`interview_date = $${parameterIndex}::date`);
      values.push(input.interview_date);
      parameterIndex += 1;
    }

    if (input.nemis_upi !== undefined) {
      assignments.push(`nemis_upi = $${parameterIndex}`);
      values.push(input.nemis_upi);
      parameterIndex += 1;
    }

    if (assignments.length === 0) {
      return this.findApplicationById(tenantId, applicationId);
    }

    assignments.push('updated_at = NOW()');

    const result = await this.executeSql(values[0] as string, `
        UPDATE admission_applications
        SET ${assignments.join(', ')}
        WHERE school_id = $1
          AND id = $2::uuid
        RETURNING
          id,
          school_id,
          application_number,
          (first_name || ' ' || last_name) AS full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          applying_for_class_id AS class_applying,
          guardian_name AS parent_name,
          guardian_phone AS parent_phone,
          guardian_email AS parent_email,
          guardian_occupation AS parent_occupation,
          guardian_relationship AS relationship,
          allergies,
          conditions,
          emergency_contact,
          application_status AS status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id::text,
          created_at,
          updated_at
      `, values,
    );

    return result[0] ?? null;
  }

  async markApplicationRegistered(tenantId: string, applicationId: string, studentId: string) {
    const result = await this.executeSql(tenantId, `
        UPDATE admission_applications
        SET application_status = 'registered',
            admitted_student_id = $3::uuid,
            updated_at = NOW()
        WHERE school_id = $1
          AND id = $2::uuid
        RETURNING id, application_status AS status
      `, [tenantId, applicationId, studentId],
    );

    return result[0] ?? null;
  }

  async saveDocumentRecord(input: {
    school_id: string;
    application_id?: string | null;
    student_id?: string | null;
    document_type: string;
    original_file_name: string;
    stored_path: string;
    mime_type: string;
    size_bytes: number;
    verification_status: string;
    uploaded_by_user_id?: string | null;
  }) {
    const result = await this.executeSql(input.school_id, `
        INSERT INTO admission_documents (
          school_id,
          application_id,
          student_id,
          document_type,
          original_file_name,
          stored_path,
          mime_type,
          size_bytes,
          verification_status,
          uploaded_by_user_id
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10::uuid)
        RETURNING
          id,
          application_id::text,
          student_id::text,
          document_type,
          original_file_name,
          verification_status,
          created_at
      `, [
        input.school_id,
        input.application_id ?? null,
        input.student_id ?? null,
        input.document_type,
        input.original_file_name,
        input.stored_path,
        input.mime_type,
        input.size_bytes,
        input.verification_status,
        input.uploaded_by_user_id ?? null,
      ],
    );

    return result[0];
  }

  async attachApplicationDocumentsToStudent(
    tenantId: string,
    applicationId: string,
    studentId: string,
  ) {
    const result = await this.executeSql(tenantId, `
        UPDATE admission_documents
        SET student_id = $3::uuid,
            updated_at = NOW()
        WHERE school_id = $1
          AND application_id = $2::uuid
          AND student_id IS NULL
        RETURNING id
      `, [tenantId, applicationId, studentId],
    );

    return result;
  }

  async listDocuments(
    tenantId: string,
    options: { search?: string; status?: string; limit?: number; offset?: number } = {},
  ) {
    const conditions = ['document.school_id = $1'];
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;
    const search = this.normalizeSearch(options.search);

    if (search) {
      conditions.push(
        `(document.document_type ILIKE $${parameterIndex} OR document.original_file_name ILIKE $${parameterIndex} OR application.full_name ILIKE $${parameterIndex} OR student.admission_number ILIKE $${parameterIndex})`,
      );
      values.push(`%${search}%`);
      parameterIndex += 1;
    }

    if (options.status) {
      conditions.push(`document.verification_status = $${parameterIndex}`);
      values.push(options.status);
      parameterIndex += 1;
    }

    const limitParameterIndex = parameterIndex;
    values.push(this.normalizeLimit(options.limit));
    parameterIndex += 1;
    const offsetParameterIndex = parameterIndex;
    values.push(this.normalizeOffset(options.offset));

    const result = await this.executeSql(values[0] as string, `
        SELECT
          document.id,
          document.application_id::text,
          document.student_id::text,
          document.document_type,
          document.original_file_name,
          document.verification_status,
          document.created_at,
          application.application_number,
          application.full_name AS applicant_name,
          student.admission_number,
          CONCAT(student.first_name, ' ', student.last_name) AS student_name
        FROM admission_documents document
        LEFT JOIN admission_applications application
          ON application.school_id = document.tenant_id
         AND application.id = document.application_id
        LEFT JOIN students student
          ON student.school_id = document.tenant_id
         AND student.id = document.student_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY document.created_at DESC
        LIMIT $${limitParameterIndex}::integer
        OFFSET $${offsetParameterIndex}::integer
      `, values,
    );

    return result;
  }

  async updateDocumentVerificationStatus(
    tenantId: string,
    documentId: string,
    verificationStatus: string,
  ) {
    const result = await this.executeSql(tenantId, `
        UPDATE admission_documents
        SET verification_status = $3,
            updated_at = NOW()
        WHERE school_id = $1
          AND id = $2::uuid
        RETURNING
          id,
          application_id::text,
          student_id::text,
          document_type,
          original_file_name,
          verification_status,
          created_at
      `, [tenantId, documentId, verificationStatus],
    );

    return result[0] ?? null;
  }

  async createAllocation(input: {
    school_id: string;
    student_id: string;
    class_name: string;
    stream_name: string;
    dormitory_name?: string | null;
    transport_route?: string | null;
    effective_from: string;
    notes?: string | null;
  }) {
    await this.executeSql(input.school_id, `
        UPDATE student_allocations
        SET is_current = FALSE,
            updated_at = NOW()
        WHERE school_id = $1
          AND student_id = $2::uuid
          AND is_current = TRUE
      `, [input.school_id, input.student_id],
    );

    const result = await this.executeSql(input.school_id, `
        INSERT INTO student_allocations (
          school_id,
          student_id,
          class_name,
          stream_name,
          dormitory_name,
          transport_route,
          effective_from,
          is_current,
          notes
        )
        VALUES ($1, $2::uuid, $3, $4, $5, $6, $7::date, TRUE, $8)
        RETURNING id, class_name, stream_name, dormitory_name, transport_route
      `, [
        input.school_id,
        input.student_id,
        input.class_name,
        input.stream_name,
        input.dormitory_name ?? null,
        input.transport_route ?? null,
        input.effective_from,
        input.notes ?? null,
      ],
    );

    return result[0];
  }

  async findCurrentAllocationByStudentId(tenantId: string, studentId: string) {
    const result = await this.executeSql(tenantId, `
        SELECT id, class_name, stream_name, dormitory_name, transport_route, effective_from
        FROM student_allocations
        WHERE school_id = $1
          AND student_id = $2::uuid
          AND is_current = TRUE
        ORDER BY effective_from DESC
        LIMIT 1
      `, [tenantId, studentId],
    );

    return result[0] ?? null;
  }

  async upsertStudentGuardianLink(input: {
    school_id: string;
    student_id: string;
    invitation_id?: string | null;
    display_name: string;
    email: string;
    phone: string;
    relationship: string;
  }) {
    const result = await this.executeSql(input.school_id, `
        WITH updated AS (
          UPDATE student_guardians
          SET
            invitation_id = $3::uuid,
            display_name = $4,
            phone = $6,
            relationship = $7,
            is_primary = TRUE,
            status = CASE WHEN user_id IS NULL THEN 'invited' ELSE 'active' END,
            updated_at = NOW()
          WHERE school_id = $1
            AND student_id = $2::uuid
            AND lower(email) = lower($5)
          RETURNING
            id,
            student_id::text,
            user_id::text,
            invitation_id::text,
            display_name,
            lower(email) AS email,
            phone,
            guardian_relationship AS relationship,
            is_primary,
            application_status AS status,
            accepted_at,
            created_at,
            updated_at
        ),
        inserted AS (
          INSERT INTO student_guardians (
            school_id,
            student_id,
            invitation_id,
            display_name,
            email,
            phone,
            guardian_relationship AS relationship,
            is_primary,
            application_status AS status
          )
          SELECT $1, $2::uuid, $3::uuid, $4, lower($5), $6, $7, TRUE, 'invited'
          WHERE NOT EXISTS (SELECT 1 FROM updated)
          RETURNING
            id,
            student_id::text,
            user_id::text,
            invitation_id::text,
            display_name,
            lower(email) AS email,
            phone,
            guardian_relationship AS relationship,
            is_primary,
            application_status AS status,
            accepted_at,
            created_at,
            updated_at
        )
        SELECT * FROM updated
        UNION ALL
        SELECT * FROM inserted
        LIMIT 1
      `, [
        input.school_id,
        input.student_id,
        input.invitation_id ?? null,
        input.display_name,
        input.email,
        input.phone,
        input.relationship,
      ],
    );

    return result[0] ?? null;
  }

  async findAcademicClassSectionForUpdate(
    tenantId: string,
    className: string,
    streamName: string,
  ) {
    const result = await this.executeSql(tenantId, `
        WITH selected_section AS (
          SELECT
            id,
            school_id,
            class_name,
            stream_name,
            academic_year,
            capacity
          FROM academic_class_sections
          WHERE school_id = $1
            AND lower(class_name) = lower($2)
            AND lower(stream_name) = lower($3)
            AND is_active = TRUE
          ORDER BY academic_year DESC, created_at DESC
          LIMIT 1
          FOR UPDATE
        )
        SELECT
          selected_section.id,
          selected_section.class_name,
          selected_section.stream_name,
          selected_section.academic_year,
          selected_section.capacity,
          (
            SELECT COUNT(*)::int
            FROM student_academic_enrollments enrollment
            WHERE enrollment.school_id = selected_section.tenant_id
              AND enrollment.class_section_id = selected_section.id
              AND enrollment.status = 'active'
          ) AS current_enrollments
        FROM selected_section
      `, [tenantId, className, streamName],
    );

    return result[0] ?? null;
  }

  async createStudentAcademicEnrollment(input: {
    school_id: string;
    student_id: string;
    application_id: string;
    class_section_id?: string | null;
    class_name: string;
    stream_name: string;
    academic_year: string;
  }) {
    const result = await this.executeSql(input.school_id, `
        INSERT INTO student_academic_enrollments (
          school_id,
          student_id,
          application_id,
          class_section_id,
          class_name,
          stream_name,
          academic_year,
          application_status AS status
        )
        VALUES ($1, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, 'active')
        ON CONFLICT (tenant_id, student_id, academic_year)
        DO UPDATE SET
          application_id = EXCLUDED.application_id,
          class_section_id = EXCLUDED.class_section_id,
          class_name = EXCLUDED.class_name,
          stream_name = EXCLUDED.stream_name,
          status = 'active',
          updated_at = NOW()
        RETURNING
          id,
          student_id::text,
          application_id::text,
          class_section_id::text,
          class_name,
          stream_name,
          academic_year,
          application_status AS status,
          enrolled_at,
          created_at,
          updated_at
      `, [
        input.school_id,
        input.student_id,
        input.application_id,
        input.class_section_id ?? null,
        input.class_name,
        input.stream_name,
        input.academic_year,
      ],
    );

    return result[0] ?? null;
  }

  async findActiveAcademicEnrollmentForUpdate(tenantId: string, studentId: string) {
    const result = await this.executeSql(tenantId, `
        SELECT
          id,
          student_id::text,
          application_id::text,
          class_section_id::text,
          class_name,
          stream_name,
          academic_year,
          application_status AS status,
          enrolled_at,
          created_at,
          updated_at
        FROM student_academic_enrollments
        WHERE school_id = $1
          AND student_id = $2::uuid
          AND status = 'active'
        ORDER BY enrolled_at DESC, created_at DESC
        LIMIT 1
        FOR UPDATE
      `, [tenantId, studentId],
    );

    return result[0] ?? null;
  }

  async completeStudentAcademicEnrollment(
    tenantId: string,
    enrollmentId: string,
    status: 'completed' | 'withdrawn',
  ) {
    const result = await this.executeSql(tenantId, `
        UPDATE student_academic_enrollments
        SET application_status = $3,
            updated_at = NOW()
        WHERE school_id = $1
          AND id = $2::uuid
          AND status = 'active'
        RETURNING
          id,
          student_id::text,
          application_id::text,
          class_section_id::text,
          class_name,
          stream_name,
          academic_year,
          application_status AS status,
          enrolled_at,
          created_at,
          updated_at
      `, [tenantId, enrollmentId, status],
    );

    return result[0] ?? null;
  }

  async createStudentAcademicLifecycleEvent(input: {
    school_id: string;
    student_id: string;
    source_enrollment_id: string;
    target_enrollment_id?: string | null;
    event_type: 'promotion' | 'graduation' | 'archive';
    from_class_name: string;
    from_stream_name: string;
    from_academic_year: string;
    to_class_section_id?: string | null;
    to_class_name?: string | null;
    to_stream_name?: string | null;
    to_academic_year?: string | null;
    reason: string;
    notes?: string | null;
    created_by_user_id?: string | null;
  }) {
    const result = await this.executeSql(input.school_id, `
        INSERT INTO student_academic_lifecycle_events (
          school_id,
          student_id,
          source_enrollment_id,
          target_enrollment_id,
          event_type,
          from_class_name,
          from_stream_name,
          from_academic_year,
          to_class_section_id,
          to_class_name,
          to_stream_name,
          to_academic_year,
          reason,
          notes,
          created_by_user_id
        )
        VALUES (
          $1,
          $2::uuid,
          $3::uuid,
          $4::uuid,
          $5,
          $6,
          $7,
          $8,
          $9::uuid,
          $10,
          $11,
          $12,
          $13,
          $14,
          $15::uuid
        )
        RETURNING
          id,
          student_id::text,
          source_enrollment_id::text,
          target_enrollment_id::text,
          event_type,
          from_class_name,
          from_stream_name,
          from_academic_year,
          to_class_section_id::text,
          to_class_name,
          to_stream_name,
          to_academic_year,
          reason,
          notes,
          created_by_user_id::text,
          created_at
      `, [
        input.school_id,
        input.student_id,
        input.source_enrollment_id,
        input.target_enrollment_id ?? null,
        input.event_type,
        input.from_class_name,
        input.from_stream_name,
        input.from_academic_year,
        input.to_class_section_id ?? null,
        input.to_class_name ?? null,
        input.to_stream_name ?? null,
        input.to_academic_year ?? null,
        input.reason,
        input.notes ?? null,
        input.created_by_user_id ?? null,
      ],
    );

    return result[0] ?? null;
  }

  async enrollStudentSubjectsAndTimetable(input: {
    school_id: string;
    student_id: string;
    academic_enrollment_id: string;
    class_section_id: string;
  }) {
    const result = await this.executeSql(input.school_id, `
        WITH subject_rows AS (
          INSERT INTO student_subject_enrollments (
            school_id,
            student_id,
            academic_enrollment_id,
            subject_offering_id,
            subject_code,
            subject_name,
            application_status AS status
          )
          SELECT
            offering.tenant_id,
            $2::uuid,
            $3::uuid,
            offering.id,
            offering.subject_code,
            offering.subject_name,
            'active'
          FROM academic_subject_offerings offering
          WHERE offering.school_id = $1
            AND offering.class_section_id = $4::uuid
            AND offering.is_active = TRUE
          ON CONFLICT (tenant_id, student_id, subject_offering_id)
          DO UPDATE SET
            academic_enrollment_id = EXCLUDED.academic_enrollment_id,
            subject_code = EXCLUDED.subject_code,
            subject_name = EXCLUDED.subject_name,
            status = 'active',
            updated_at = NOW()
          RETURNING
            id,
            subject_offering_id::text,
            subject_code,
            subject_name,
            application_status AS status,
            enrolled_at,
            created_at,
            updated_at
        ),
        timetable_rows AS (
          INSERT INTO student_timetable_enrollments (
            school_id,
            student_id,
            academic_enrollment_id,
            timetable_slot_id,
            day_of_week,
            starts_at,
            ends_at,
            subject_name,
            room_name,
            application_status AS status
          )
          SELECT
            slot.tenant_id,
            $2::uuid,
            $3::uuid,
            slot.id,
            slot.day_of_week,
            slot.starts_at,
            slot.ends_at,
            COALESCE(offering.subject_name, slot.subject_name),
            slot.room_name,
            'active'
          FROM academic_timetable_slots slot
          LEFT JOIN academic_subject_offerings offering
            ON offering.school_id = slot.tenant_id
           AND offering.id = slot.subject_offering_id
          WHERE slot.school_id = $1
            AND slot.class_section_id = $4::uuid
            AND slot.is_active = TRUE
          ON CONFLICT (tenant_id, student_id, timetable_slot_id)
          DO UPDATE SET
            academic_enrollment_id = EXCLUDED.academic_enrollment_id,
            day_of_week = EXCLUDED.day_of_week,
            starts_at = EXCLUDED.starts_at,
            ends_at = EXCLUDED.ends_at,
            subject_name = EXCLUDED.subject_name,
            room_name = EXCLUDED.room_name,
            status = 'active',
            updated_at = NOW()
          RETURNING
            id,
            timetable_slot_id::text,
            day_of_week,
            starts_at,
            ends_at,
            subject_name,
            room_name,
            application_status AS status,
            created_at,
            updated_at
        )
        SELECT
          COALESCE((SELECT json_agg(row_to_json(subject_rows.*)) FROM subject_rows), '[]'::json) AS subject_enrollments,
          COALESCE((SELECT json_agg(row_to_json(timetable_rows.*)) FROM timetable_rows), '[]'::json) AS timetable_enrollments
      `, [
        input.school_id,
        input.student_id,
        input.academic_enrollment_id,
        input.class_section_id,
      ],
    );

    return {
      subject_enrollments: result[0]?.subject_enrollments ?? [],
      timetable_enrollments: result[0]?.timetable_enrollments ?? [],
    };
  }

  async findActiveFeeStructureForClass(tenantId: string, className: string) {
    const result = await this.executeSql(tenantId, `
        SELECT
          id,
          class_name,
          academic_year,
          term_name,
          description,
          currency_code,
          amount_minor::text,
          due_days_after_registration
        FROM student_fee_structures
        WHERE school_id = $1
          AND lower(class_name) = lower($2)
          AND is_active = TRUE
        ORDER BY academic_year DESC, term_name DESC, created_at DESC
        LIMIT 1
      `, [tenantId, className],
    );

    return result[0] ?? null;
  }

  async createStudentFeeAssignmentInvoice(input: {
    school_id: string;
    student_id: string;
    application_id: string;
    fee_structure_id: string;
    invoice_number: string;
    description: string;
    currency_code: string;
    amount_minor: string;
    due_date: string;
  }) {
    const result = await this.executeSql(input.school_id, `
        WITH assignment AS (
          INSERT INTO student_fee_assignments (
            school_id,
            student_id,
            application_id,
            fee_structure_id,
            application_status AS status,
            amount_minor,
            currency_code
          )
          VALUES ($1, $2::uuid, $3::uuid, $4::uuid, 'assigned', $8::bigint, $7)
          ON CONFLICT (tenant_id, student_id, fee_structure_id)
          DO UPDATE SET
            application_id = EXCLUDED.application_id,
            amount_minor = EXCLUDED.amount_minor,
            currency_code = EXCLUDED.currency_code,
            status = CASE
              WHEN student_fee_assignments.status = 'voided' THEN 'assigned'
              ELSE student_fee_assignments.status
            END,
            updated_at = NOW()
          RETURNING
            id,
            student_id::text,
            application_id::text,
            fee_structure_id::text,
            application_status AS status,
            amount_minor::text,
            currency_code,
            assigned_at,
            created_at,
            updated_at
        ),
        invoice AS (
          INSERT INTO student_fee_invoices (
            school_id,
            assignment_id,
            student_id,
            invoice_number,
            application_status AS status,
            description,
            currency_code,
            amount_due_minor,
            amount_paid_minor,
            issued_date,
            due_date
          )
          SELECT
            $1,
            assignment.id,
            $2::uuid,
            $5,
            'open',
            $6,
            $7,
            $8::bigint,
            0,
            CURRENT_DATE,
            $9::date
          FROM assignment
          ON CONFLICT (tenant_id, assignment_id)
          DO UPDATE SET
            description = EXCLUDED.description,
            currency_code = EXCLUDED.currency_code,
            amount_due_minor = EXCLUDED.amount_due_minor,
            due_date = EXCLUDED.due_date,
            updated_at = NOW()
          RETURNING
            id,
            assignment_id::text,
            student_id::text,
            invoice_number,
            application_status AS status,
            description,
            currency_code,
            amount_due_minor::text,
            amount_paid_minor::text,
            issued_date::text,
            due_date::text,
            created_at,
            updated_at
        )
        SELECT
          row_to_json(assignment.*) AS assignment,
          row_to_json(invoice.*) AS invoice
        FROM assignment, invoice
        LIMIT 1
      `, [
        input.school_id,
        input.student_id,
        input.application_id,
        input.fee_structure_id,
        input.invoice_number,
        input.description,
        input.currency_code,
        input.amount_minor,
        input.due_date,
      ],
    );

    return result[0] ?? null;
  }

  async listAllocations(
    tenantId: string,
    options: { search?: string; limit?: number; offset?: number } = {},
  ) {
    const conditions = ['allocation.school_id = $1', 'allocation.is_current = TRUE'];
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;
    const search = this.normalizeSearch(options.search);

    if (search) {
      conditions.push(
        `(student.admission_number ILIKE $${parameterIndex} OR student.first_name ILIKE $${parameterIndex} OR student.last_name ILIKE $${parameterIndex} OR allocation.class_name ILIKE $${parameterIndex} OR allocation.stream_name ILIKE $${parameterIndex})`,
      );
      values.push(`%${search}%`);
      parameterIndex += 1;
    }

    const limitParameterIndex = parameterIndex;
    values.push(this.normalizeLimit(options.limit));
    parameterIndex += 1;
    const offsetParameterIndex = parameterIndex;
    values.push(this.normalizeOffset(options.offset));

    const result = await this.executeSql(values[0] as string, `
        SELECT
          allocation.id,
          student.id AS student_id,
          student.admission_number,
          student.first_name,
          student.last_name,
          allocation.class_name,
          allocation.stream_name,
          allocation.dormitory_name,
          allocation.transport_route,
          allocation.effective_from
        FROM student_allocations allocation
        JOIN students student
          ON student.school_id = allocation.tenant_id
         AND student.id = allocation.student_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY allocation.effective_from DESC
        LIMIT $${limitParameterIndex}::integer
        OFFSET $${offsetParameterIndex}::integer
      `, values,
    );

    return result;
  }

  async listStudentDirectory(
    tenantId: string,
    options: { search?: string; limit: number; offset?: number },
  ) {
    const conditions = ['student.school_id = $1'];
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;
    const search = this.normalizeSearch(options.search);

    if (search) {
      conditions.push(
        `(
          CONCAT(student.first_name, ' ', student.last_name) ILIKE $${parameterIndex}
          OR student.admission_number ILIKE $${parameterIndex}
          OR COALESCE(student.primary_guardian_phone, '') ILIKE $${parameterIndex}
        )`,
      );
      values.push(`%${search}%`);
      parameterIndex += 1;
    }

    const limitParameterIndex = parameterIndex;
    values.push(this.normalizeLimit(options.limit));
    parameterIndex += 1;
    const offsetParameterIndex = parameterIndex;
    values.push(this.normalizeOffset(options.offset));

    const result = await this.executeSql(values[0] as string, `
        SELECT
          student.id,
          student.admission_number,
          student.first_name,
          student.last_name,
          student.primary_guardian_name,
          student.primary_guardian_phone,
          student.metadata,
          allocation.class_name,
          allocation.stream_name,
          allocation.dormitory_name,
          allocation.transport_route
        FROM students student
        LEFT JOIN student_allocations allocation
          ON allocation.school_id = student.tenant_id
         AND allocation.student_id = student.id
         AND allocation.is_current = TRUE
        WHERE ${conditions.join(' AND ')}
        ORDER BY student.created_at DESC
        LIMIT $${limitParameterIndex}::integer
        OFFSET $${offsetParameterIndex}::integer
      `, values,
    );

    return result;
  }

  async getStudentProfile(tenantId: string, studentId: string) {
    const [
      studentResult,
      documentsResult,
      allocationResult,
      academicEnrollmentResult,
      subjectEnrollmentsResult,
      timetableEnrollmentsResult,
      lifecycleEventsResult,
      guardianLinksResult,
      feeAssignmentResult,
      feeInvoiceResult,
    ] = await Promise.all([
      this.executeSql(tenantId, `
          SELECT
            id,
            admission_number,
            first_name,
            last_name,
            date_of_birth::text,
            gender,
            primary_guardian_name,
            primary_guardian_phone,
            metadata
          FROM students
          WHERE school_id = $1
            AND id = $2::uuid
          LIMIT 1
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT id, document_type, original_file_name, verification_status, created_at
          FROM admission_documents
          WHERE school_id = $1
            AND student_id = $2::uuid
          ORDER BY created_at DESC
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT class_name, stream_name, dormitory_name, transport_route, effective_from
          FROM student_allocations
          WHERE school_id = $1
            AND student_id = $2::uuid
            AND is_current = TRUE
          ORDER BY effective_from DESC
          LIMIT 1
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            id,
            class_name,
            stream_name,
            academic_year,
            application_status AS status,
            enrolled_at,
            updated_at
          FROM student_academic_enrollments
          WHERE school_id = $1
            AND student_id = $2::uuid
            AND status = 'active'
          ORDER BY enrolled_at DESC, created_at DESC
          LIMIT 1
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            id,
            subject_code,
            subject_name,
            application_status AS status,
            enrolled_at
          FROM student_subject_enrollments
          WHERE school_id = $1
            AND student_id = $2::uuid
            AND status = 'active'
          ORDER BY subject_name ASC
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            id,
            day_of_week,
            starts_at,
            ends_at,
            subject_name,
            room_name,
            application_status AS status
          FROM student_timetable_enrollments
          WHERE school_id = $1
            AND student_id = $2::uuid
            AND status = 'active'
          ORDER BY
            CASE day_of_week
              WHEN 'Monday' THEN 1
              WHEN 'Tuesday' THEN 2
              WHEN 'Wednesday' THEN 3
              WHEN 'Thursday' THEN 4
              WHEN 'Friday' THEN 5
              WHEN 'Saturday' THEN 6
              WHEN 'Sunday' THEN 7
              ELSE 8
            END,
            starts_at ASC
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            id,
            event_type,
            from_class_name,
            from_stream_name,
            from_academic_year,
            to_class_name,
            to_stream_name,
            to_academic_year,
            reason,
            created_at
          FROM student_academic_lifecycle_events
          WHERE school_id = $1
            AND student_id = $2::uuid
          ORDER BY created_at DESC
          LIMIT 10
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            id,
            display_name,
            email,
            phone,
            guardian_relationship AS relationship,
            application_status AS status,
            user_id::text,
            invitation_id::text,
            accepted_at,
            created_at,
            updated_at
          FROM student_guardians
          WHERE school_id = $1
            AND student_id = $2::uuid
          ORDER BY
            CASE application_status AS status
              WHEN 'active' THEN 1
              WHEN 'invited' THEN 2
              ELSE 3
            END,
            created_at DESC
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            assignment.id,
            assignment.status,
            assignment.amount_minor::text,
            assignment.currency_code,
            assignment.assigned_at,
            assignment.created_at,
            structure.description,
            structure.term_name,
            structure.academic_year
          FROM student_fee_assignments assignment
          LEFT JOIN student_fee_structures structure
            ON structure.school_id = assignment.tenant_id
           AND structure.id = assignment.fee_structure_id
          WHERE assignment.school_id = $1
            AND assignment.student_id = $2::uuid
            AND assignment.status <> 'voided'
          ORDER BY assignment.assigned_at DESC, assignment.created_at DESC
          LIMIT 1
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT
            invoice.id,
            invoice.assignment_id::text,
            invoice.invoice_number,
            invoice.status,
            invoice.description,
            invoice.currency_code,
            invoice.amount_due_minor::text,
            invoice.amount_paid_minor::text,
            invoice.issued_date::text,
            invoice.due_date::text,
            invoice.created_at
          FROM student_fee_invoices invoice
          WHERE invoice.school_id = $1
            AND invoice.student_id = $2::uuid
            AND invoice.status <> 'voided'
          ORDER BY invoice.due_date DESC, invoice.created_at DESC
          LIMIT 1
        `, [tenantId, studentId],
      ),
    ]);

    if (!studentResult[0]) {
      return null;
    }

    return {
      student: studentResult[0],
      allocation: allocationResult[0] ?? null,
      documents: documentsResult,
      academic_enrollment: academicEnrollmentResult[0] ?? null,
      subject_enrollments: subjectEnrollmentsResult,
      timetable_enrollments: timetableEnrollmentsResult,
      lifecycle_events: lifecycleEventsResult,
      guardian_links: guardianLinksResult,
      fee_assignment: feeAssignmentResult[0] ?? null,
      fee_invoice: feeInvoiceResult[0] ?? null,
    };
  }

  async listParents(
    tenantId: string,
    options: { search?: string; limit?: number; offset?: number } = {},
  ) {
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;
    const search = this.normalizeSearch(options.search);
    const searchCondition = search
      ? `AND (
          COALESCE(primary_guardian_name, parent_name) ILIKE $${parameterIndex}
          OR COALESCE(primary_guardian_phone, parent_phone) ILIKE $${parameterIndex}
        )`
      : '';

    if (search) {
      values.push(`%${search}%`);
      parameterIndex += 1;
    }

    const limitParameterIndex = parameterIndex;
    values.push(this.normalizeLimit(options.limit));
    parameterIndex += 1;
    const offsetParameterIndex = parameterIndex;
    values.push(this.normalizeOffset(options.offset));

    const result = await this.executeSql(values[0] as string, `
        SELECT
          COALESCE(primary_guardian_name, parent_name) AS guardian_name AS parent_name,
          COALESCE(primary_guardian_phone, parent_phone) AS guardian_phone AS parent_phone,
          guardian_email AS parent_email,
          guardian_occupation AS parent_occupation,
          guardian_relationship AS relationship
        FROM (
          SELECT
            student.primary_guardian_name,
            student.primary_guardian_phone,
            NULL::text AS guardian_name AS parent_name,
            NULL::text AS guardian_phone AS parent_phone,
            NULL::text AS guardian_email AS parent_email,
            NULL::text AS guardian_occupation AS parent_occupation,
            NULL::text AS guardian_relationship AS relationship
          FROM students student
          WHERE student.school_id = $1

          UNION ALL

          SELECT
            NULL::text AS primary_guardian_name,
            NULL::text AS primary_guardian_phone,
            application.parent_name,
            application.parent_phone,
            application.parent_email,
            application.parent_occupation,
            application.relationship
          FROM admission_applications application
          WHERE application.school_id = $1
        ) parents
        WHERE COALESCE(primary_guardian_name, parent_name) IS NOT NULL
          ${searchCondition}
        ORDER BY COALESCE(primary_guardian_name, parent_name) ASC
        LIMIT $${limitParameterIndex}::integer
        OFFSET $${offsetParameterIndex}::integer
      `, values,
    );

    return result;
  }

  async createTransferRecord(input: {
    school_id: string;
    student_id?: string | null;
    application_id?: string | null;
    transfer_type: string;
    school_name: string;
    reason: string;
    requested_on: string;
    status: string;
    notes?: string | null;
  }) {
    const result = await this.executeSql(input.school_id, `
        INSERT INTO student_transfer_records (
          school_id,
          student_id,
          application_id,
          transfer_type,
          school_name,
          reason,
          requested_on,
          application_status AS status,
          notes
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::date, $8, $9)
        RETURNING id, transfer_type, school_name, application_status AS status
      `, [
        input.school_id,
        input.student_id ?? null,
        input.application_id ?? null,
        input.transfer_type,
        input.school_name,
        input.reason,
        input.requested_on,
        input.status,
        input.notes ?? null,
      ],
    );

    return result[0];
  }

  async listTransfers(
    tenantId: string,
    options: { search?: string; status?: string; limit?: number; offset?: number } = {},
  ) {
    const conditions = ['school_id = $1'];
    const values: unknown[] = [tenantId];
    let parameterIndex = 2;
    const search = this.normalizeSearch(options.search);

    if (search) {
      conditions.push(
        `(school_name ILIKE $${parameterIndex} OR reason ILIKE $${parameterIndex} OR transfer_type ILIKE $${parameterIndex})`,
      );
      values.push(`%${search}%`);
      parameterIndex += 1;
    }

    if (options.status) {
      conditions.push(`status = $${parameterIndex}`);
      values.push(options.status);
      parameterIndex += 1;
    }

    const limitParameterIndex = parameterIndex;
    values.push(this.normalizeLimit(options.limit));
    parameterIndex += 1;
    const offsetParameterIndex = parameterIndex;
    values.push(this.normalizeOffset(options.offset));

    const result = await this.executeSql(values[0] as string, `
        SELECT id, student_id, application_id, transfer_type, school_name, reason, requested_on, application_status AS status, notes
        FROM student_transfer_records
        WHERE ${conditions.join(' AND ')}
        ORDER BY requested_on DESC, created_at DESC
        LIMIT $${limitParameterIndex}::integer
        OFFSET $${offsetParameterIndex}::integer
      `, values,
    );

    return result;
  }

  async buildReports(tenantId: string) {
    const [statusBreakdown, allocationBreakdown, documentVerification] = await Promise.all([
      this.executeSql(tenantId, `
          SELECT application_status AS status, COUNT(*)::int AS total
          FROM admission_applications
          WHERE school_id = $1
          GROUP BY application_status AS status
          ORDER BY total DESC, status ASC
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT class_name, COUNT(*)::int AS total
          FROM student_allocations
          WHERE school_id = $1
            AND is_current = TRUE
          GROUP BY class_name
          ORDER BY total DESC, class_name ASC
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT verification_status, COUNT(*)::int AS total
          FROM admission_documents
          WHERE school_id = $1
          GROUP BY verification_status
          ORDER BY total DESC, verification_status ASC
        `, [tenantId],
      ),
    ]);

    return {
      application_status_breakdown: statusBreakdown,
      class_allocation_breakdown: allocationBreakdown,
      document_verification_breakdown: documentVerification,
    };
  }

  private normalizeLimit(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 1) {
      return 25;
    }

    return Math.min(candidate, 50);
  }

  private normalizeOffset(value: number | undefined): number {
    const candidate = Number(value);

    if (!Number.isInteger(candidate) || candidate < 0) {
      return 0;
    }

    return candidate;
  }

  private normalizeSearch(value: string | undefined): string | undefined {
    const search = value?.trim();

    return search && search.length >= 2 ? search : undefined;
  }
}
