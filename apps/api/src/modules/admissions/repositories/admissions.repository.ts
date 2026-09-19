import { BadRequestException } from '@nestjs/common';
import { ensureCohortMigration, ensureCohortContexts, lockCohortSchool } from '../../academics/cohort-configuration';
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

function normalizeAcademicSystemType(value: unknown) {
  const normalized = String(value ?? '').trim().toLowerCase();

  if (normalized === 'cbc') return 'CBC';
  if (normalized === 'cbe') return 'CBE';
  if (normalized === '8-4-4' || normalized === '844') return '8-4-4';
  if (normalized === 'international') return 'International';
  if (normalized === 'hybrid') return 'Hybrid';
  return 'Custom';
}

export interface AdmissionApplicationRecord {
  id: string;
  school_id: string;
  application_number: string;
  full_name: string;
  date_of_birth: string | null;
  gender: string;
  birth_certificate_number: string | null;
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

export interface AdmissionsClassOptionRecord {
  id: string;
  name: string;
  grade_level: string | null;
  stream: string | null;
  capacity: number | null;
  student_count: number;
  available_seats: number | null;
  label: string;
  value: string;
}

export interface CanonicalAdmissionInput {
  tenant_id: string;
  actor_user_id: string | null;
  admission_number: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  gender: string;
  date_of_birth: string | null;
  admission_date: string;
  academic_year_id: string;
  curriculum: string;
  class_section_id: string;
  stream_id: string | null;
  subject_ids: string[];
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_phone_hash: string;
  guardian_phone_last4: string;
  guardian_internal_email: string;
  guardian_password_hash: string;
  student_password_hash: string;
  dormitory_name: string | null;
  transport_route: string | null;
}

export interface AdmissionSettingsRecord {
  admission_number_mode: 'manual' | 'automatic' | 'suggested';
  admission_number_prefix: string;
  admission_number_separator: '-' | '/' | '.' | '_';
  admission_number_padding: number;
  include_academic_year: boolean;
  next_sequence: number;
  strict_capacity: boolean;
  strict_age_rules: boolean;
  minimum_age: number | null;
  maximum_age: number | null;
  minimum_subjects: number | null;
  maximum_subjects: number | null;
}

export type CanonicalAdmissionTransactionHook = (input: {
  tx: any;
  result: any;
}) => Promise<void>;

const DEFAULT_ADMISSION_SETTINGS: AdmissionSettingsRecord = {
  admission_number_mode: 'suggested',
  admission_number_prefix: 'ADM',
  admission_number_separator: '-',
  admission_number_padding: 5,
  include_academic_year: false,
  next_sequence: 1,
  strict_capacity: false,
  strict_age_rules: false,
  minimum_age: null,
  maximum_age: null,
  minimum_subjects: null,
  maximum_subjects: null,
};

function configuredAdmissionNumber(
  settings: AdmissionSettingsRecord,
  sequence: number,
  academicYearName?: string | null,
) {
  const year = settings.include_academic_year
    ? academicYearName?.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? String(new Date().getUTCFullYear())
    : null;
  const serial = String(sequence).padStart(settings.admission_number_padding, '0');
  return [settings.admission_number_prefix || null, year, serial]
    .filter(Boolean)
    .join(settings.admission_number_separator)
    .toUpperCase();
}

@Injectable()
export class AdmissionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(tenantId: string, sql: string, params: any[], transaction?: any): Promise<T[]> {
    if (transaction) {
      const rows = await transaction.$queryRawUnsafe(sql, ...params);
      return Array.isArray(rows) ? rows : [rows];
    }
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
          SELECT application_number, full_name, class_applying, status, parent_phone, created_at
          FROM admission_applications
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 6
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT application_number, full_name, status
          FROM admission_applications
          WHERE tenant_id = $1
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
            ON document.tenant_id = application.tenant_id
           AND document.application_id = application.id
          WHERE application.tenant_id = $1
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
        WHERE tenant_id = $1
          AND status = ANY($2::text[])
      `, [tenantId, statuses],
    );

    return Number(result[0]?.total ?? '0');
  }

  async listClassOptions(tenantId: string): Promise<AdmissionsClassOptionRecord[]> {
    const result = await this.executeSql<AdmissionsClassOptionRecord>(tenantId, `
        SELECT
          section.id::text,
          section.name,
          NULLIF(section.grade_level, '') AS grade_level,
          NULLIF(section.stream, '') AS stream,
          section.capacity,
          COALESCE(student_counts.student_count, 0)::int AS student_count,
          CASE
            WHEN section.capacity IS NULL THEN NULL
            ELSE GREATEST(section.capacity - COALESCE(student_counts.student_count, 0), 0)::int
          END AS available_seats,
          btrim(concat_ws(' ', section.name, NULLIF(section.stream, ''))) AS label,
          section.name AS value
        FROM class_sections section
        JOIN academic_years year
          ON year.tenant_id = section.tenant_id
         AND year.id::text = section.academic_year_id::text
        LEFT JOIN (
          SELECT tenant_id, class_section_id, COUNT(*)::int AS student_count
          FROM (
            SELECT assignment.tenant_id, assignment.class_section_id::text, assignment.student_id::text
            FROM student_class_assignments assignment
            WHERE assignment.tenant_id = $1
              AND assignment.status = 'active'
            UNION
            SELECT enrollment.tenant_id, enrollment.class_section_id::text, enrollment.student_id::text
            FROM student_academic_enrollments enrollment
            WHERE enrollment.tenant_id = $1
              AND enrollment.status = 'active'
              AND enrollment.class_section_id IS NOT NULL
          ) active_students
          GROUP BY tenant_id, class_section_id
        ) student_counts
          ON student_counts.tenant_id = section.tenant_id
         AND student_counts.class_section_id = section.id
        WHERE section.tenant_id = $1
          AND section.is_active = TRUE
          AND lower(COALESCE(section.status, 'active')) = 'active'
          AND section.archived_at IS NULL
          AND section.enrolment_open = TRUE
          AND lower(COALESCE(year.status, 'active')) = 'active'
          AND year.archived_at IS NULL
        ORDER BY NULLIF(section.grade_level, '') ASC NULLS LAST, section.name ASC, NULLIF(section.stream, '') ASC NULLS LAST
      `, [tenantId],
    );

    return result;
  }

  async getAdmissionFoundation(tenantId: string) {
    await this.prisma.executeWithTenant(tenantId,null,(tx:any)=>ensureCohortMigration(tx,tenantId));
    const result = await this.executeSql<{ foundation: Record<string, unknown> }>(tenantId, `
      SELECT jsonb_build_object(
        'academic_years', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', year.id,
            'name', year.name,
            'starts_on', year.starts_on,
            'ends_on', year.ends_on,
            'status', year.status,
            'is_current', year.is_current
          ) ORDER BY year.is_current DESC, year.starts_on DESC)
          FROM academic_years year
          WHERE year.tenant_id = $1
            AND lower(COALESCE(year.status, 'active')) IN ('active', 'draft')
            AND year.archived_at IS NULL
        ), '[]'::jsonb),
        'classes', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', section.id,
            'academic_year_id', section.academic_year_id,
            'academic_level_id', section.academic_level_id,
            'name', section.name,
            'grade_level', section.grade_level,
            'curriculum', section.curriculum_model,
            'capacity', section.capacity,
            'enrolment_open', section.enrolment_open,
            'student_count', COALESCE(counts.student_count, 0)
          ) ORDER BY section.grade_level, section.name)
          FROM class_sections section
          LEFT JOIN (
            SELECT class_section_id, COUNT(*)::int AS student_count
            FROM student_class_assignments
            WHERE tenant_id = $1 AND status = 'active'
            GROUP BY class_section_id
          ) counts ON counts.class_section_id = section.id
          WHERE section.tenant_id = $1
            AND section.is_active = TRUE
            AND lower(COALESCE(section.status, 'active')) = 'active'
            AND section.archived_at IS NULL
        ), '[]'::jsonb),
        'streams', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', stream.id,
            'class_section_id', stream.class_section_id,
            'name', stream.name,
            'capacity', stream.capacity,
            'student_count', COALESCE(counts.student_count, 0)
          ) ORDER BY stream.name)
          FROM class_streams stream
          LEFT JOIN (
            SELECT stream_id, COUNT(*)::int AS student_count
            FROM student_class_assignments
            WHERE tenant_id = $1 AND status = 'active' AND stream_id IS NOT NULL
            GROUP BY stream_id
          ) counts ON counts.stream_id = stream.id
          WHERE stream.tenant_id = $1
            AND stream.is_active = TRUE
            AND lower(COALESCE(stream.status, 'active')) = 'active'
            AND stream.archived_at IS NULL
        ), '[]'::jsonb),
        'subjects', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', subject.id,
            'code', subject.code,
            'name', subject.name,
            'curriculum', subject.curriculum_model,
            'subject_type', subject.subject_type,
            'is_compulsory', subject.is_compulsory,
            'is_examinable', subject.is_examinable
          ) ORDER BY subject.name)
          FROM subjects subject
          WHERE subject.tenant_id = $1
            AND lower(COALESCE(subject.status, 'active')) = 'active'
            AND subject.deleted_at IS NULL
            AND subject.archived_at IS NULL
        ), '[]'::jsonb),
        'class_subject_assignments', COALESCE((
          SELECT jsonb_agg(jsonb_build_object('academic_term_id',NULL,'academic_year_id',placement.academic_year_id,
            'class_section_id',assignment.class_section_id,'stream_id',assignment.stream_id,'cohort_id',assignment.cohort_id,
            'cohort_placement_id',placement.id,'subject_id',assignment.subject_id,'is_compulsory',assignment.is_compulsory,
            'is_examinable',assignment.is_examinable) ORDER BY assignment.class_section_id,assignment.stream_id,assignment.subject_id)
          FROM class_subject_assignments assignment JOIN academic_cohort_placements placement
            ON placement.tenant_id=assignment.tenant_id AND placement.id=assignment.cohort_placement_id AND placement.status='active'
          WHERE assignment.tenant_id=$1 AND assignment.status='active'
            AND (assignment.effective_from IS NULL OR assignment.effective_from<=CURRENT_DATE)
            AND (assignment.effective_to IS NULL OR assignment.effective_to>=CURRENT_DATE)
        ), '[]'::jsonb)
      ) AS foundation
    `, [tenantId]);

    const foundation = result[0]?.foundation ?? {
      academic_years: [],
      classes: [],
      streams: [],
      subjects: [],
      class_subject_assignments: [],
    };
    const settings = await this.getAdmissionSettings(tenantId);
    const years = Array.isArray((foundation as any).academic_years)
      ? (foundation as any).academic_years
      : [];
    const currentYear = years.find((year: any) => year?.is_current) ?? years[0] ?? null;

    return {
      ...foundation,
      admission_settings: {
        ...settings,
        suggested_admission_number: configuredAdmissionNumber(
          settings,
          settings.next_sequence,
          currentYear?.name,
        ),
      },
    };
  }

  async getAdmissionSettings(tenantId: string): Promise<AdmissionSettingsRecord> {
    const rows = await this.executeSql<any>(tenantId, `
      SELECT
        admission_number_mode,
        admission_number_prefix,
        admission_number_separator,
        admission_number_padding,
        include_academic_year,
        next_sequence::int,
        strict_capacity,
        strict_age_rules,
        minimum_age,
        maximum_age,
        minimum_subjects,
        maximum_subjects
      FROM admission_settings
      WHERE tenant_id = $1
      LIMIT 1
    `, [tenantId]);

    return rows[0] ?? { ...DEFAULT_ADMISSION_SETTINGS };
  }

  async updateAdmissionSettings(
    tenantId: string,
    actorUserId: string | null,
    input: Omit<AdmissionSettingsRecord, 'next_sequence'>,
  ) {
    const rows = await this.executeSql<any>(tenantId, `
      INSERT INTO admission_settings (
        tenant_id, admission_number_mode, admission_number_prefix,
        admission_number_separator, admission_number_padding, include_academic_year,
        strict_capacity, strict_age_rules, minimum_age, maximum_age,
        minimum_subjects, maximum_subjects, updated_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::uuid)
      ON CONFLICT (tenant_id) DO UPDATE SET
        admission_number_mode = EXCLUDED.admission_number_mode,
        admission_number_prefix = EXCLUDED.admission_number_prefix,
        admission_number_separator = EXCLUDED.admission_number_separator,
        admission_number_padding = EXCLUDED.admission_number_padding,
        include_academic_year = EXCLUDED.include_academic_year,
        strict_capacity = EXCLUDED.strict_capacity,
        strict_age_rules = EXCLUDED.strict_age_rules,
        minimum_age = EXCLUDED.minimum_age,
        maximum_age = EXCLUDED.maximum_age,
        minimum_subjects = EXCLUDED.minimum_subjects,
        maximum_subjects = EXCLUDED.maximum_subjects,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = NOW()
      RETURNING *
    `, [
      tenantId,
      input.admission_number_mode,
      input.admission_number_prefix,
      input.admission_number_separator,
      input.admission_number_padding,
      input.include_academic_year,
      input.strict_capacity,
      input.strict_age_rules,
      input.minimum_age,
      input.maximum_age,
      input.minimum_subjects,
      input.maximum_subjects,
      actorUserId,
    ]);
    return rows[0];
  }

  async getAdmissionDraft(tenantId: string, actorUserId: string) {
    const rows = await this.executeSql<any>(tenantId, `
      SELECT id::text, payload, status, updated_at
      FROM admission_drafts
      WHERE tenant_id = $1 AND created_by_user_id = $2::uuid AND status = 'draft'
      LIMIT 1
    `, [tenantId, actorUserId]);
    return rows[0] ?? null;
  }

  async saveAdmissionDraft(
    tenantId: string,
    actorUserId: string,
    payload: Record<string, unknown>,
  ) {
    const rows = await this.executeSql<any>(tenantId, `
      INSERT INTO admission_drafts (tenant_id, created_by_user_id, payload, status)
      VALUES ($1, $2::uuid, $3::jsonb, 'draft')
      ON CONFLICT (tenant_id, created_by_user_id) DO UPDATE SET
        payload = EXCLUDED.payload,
        status = 'draft',
        updated_at = NOW()
      RETURNING id::text, payload, status, updated_at
    `, [tenantId, actorUserId, JSON.stringify(payload)]);
    return rows[0];
  }

  async discardAdmissionDraft(tenantId: string, actorUserId: string) {
    const rows = await this.executeSql<any>(tenantId, `
      UPDATE admission_drafts
      SET status = 'discarded', updated_at = NOW()
      WHERE tenant_id = $1 AND created_by_user_id = $2::uuid AND status = 'draft'
      RETURNING id::text
    `, [tenantId, actorUserId]);
    return { discarded: rows.length > 0 };
  }

  async findAdmissionPreflight(
    tenantId: string,
    input: {
      admission_number: string;
      full_name: string;
      date_of_birth: string | null;
      guardian_phone: string;
      class_section_id: string;
      stream_id: string | null;
    },
  ) {
    const [duplicates, guardians, placement] = await Promise.all([
      this.executeSql<any>(tenantId, `
        SELECT
          student.id::text,
          student.admission_number,
          btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)) AS full_name,
          student.date_of_birth::text,
          student.status,
          CASE
            WHEN upper(student.admission_number) = upper($2) THEN 'admission_number'
            ELSE 'identity_match'
          END AS match_reason
        FROM students student
        WHERE student.tenant_id = $1
          AND (
            upper(student.admission_number) = upper($2)
            OR (
              $4::date IS NOT NULL
              AND lower(btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name))) = lower($3)
              AND student.date_of_birth = $4::date
            )
          )
        ORDER BY CASE WHEN upper(student.admission_number) = upper($2) THEN 0 ELSE 1 END
        LIMIT 10
      `, [tenantId, input.admission_number, input.full_name, input.date_of_birth]),
      this.executeSql<any>(tenantId, `
        SELECT
          profile.id::text AS guardian_profile_id,
          profile.display_name,
          profile.normalized_phone,
          COALESCE(jsonb_agg(jsonb_build_object(
            'student_id', student.id,
            'admission_number', student.admission_number,
            'full_name', btrim(concat_ws(' ', student.first_name, student.middle_name, student.last_name)),
            'relationship', link.relationship,
            'status', student.status
          ) ORDER BY student.first_name, student.last_name)
            FILTER (WHERE student.id IS NOT NULL), '[]'::jsonb) AS children
        FROM guardian_profiles profile
        LEFT JOIN student_guardians link
          ON link.tenant_id = profile.tenant_id
         AND link.guardian_profile_id = profile.id
         AND link.status = 'active'
        LEFT JOIN students student
          ON student.tenant_id = link.tenant_id
         AND student.id::text = link.student_id::text
        WHERE profile.tenant_id = $1 AND profile.normalized_phone = $2
        GROUP BY profile.id, profile.display_name, profile.normalized_phone
        LIMIT 1
      `, [tenantId, input.guardian_phone]),
      this.executeSql<any>(tenantId, `
        SELECT
          section.name,
          section.curriculum_model,
          section.capacity,
          (SELECT COUNT(*)::int FROM student_class_assignments assignment
            WHERE assignment.tenant_id = section.tenant_id
              AND assignment.class_section_id = section.id
              AND assignment.status = 'active') AS class_student_count,
          stream.capacity AS stream_capacity,
          (SELECT COUNT(*)::int FROM student_class_assignments assignment
            WHERE assignment.tenant_id = section.tenant_id
              AND assignment.stream_id = stream.id
              AND assignment.status = 'active') AS stream_student_count
        FROM class_sections section
        LEFT JOIN class_streams stream
          ON stream.tenant_id = section.tenant_id
         AND stream.id = $3
         AND stream.class_section_id = section.id
        WHERE section.tenant_id = $1 AND section.id = $2
        LIMIT 1
      `, [tenantId, input.class_section_id, input.stream_id]),
    ]);

    return {
      possible_duplicates: duplicates,
      guardian: guardians[0] ?? null,
      placement: placement[0] ?? null,
    };
  }

  async findExistingAdmissionNumbers(tenantId: string, admissionNumbers: string[]) {
    if (admissionNumbers.length === 0) return [];

    const rows = await this.executeSql<{ admission_number: string }>(tenantId, `
      SELECT upper(admission_number) AS admission_number
      FROM students
      WHERE tenant_id = $1
        AND upper(admission_number) = ANY($2::text[])
    `, [tenantId, admissionNumbers.map((value) => value.toUpperCase())]);

    return rows.map((row) => row.admission_number);
  }

  async admitCanonicalStudent(
    input: CanonicalAdmissionInput,
    persistGovernance?: CanonicalAdmissionTransactionHook,
  ) {
    return this.prisma.executeWithTenant(input.tenant_id, input.actor_user_id, async (tx: any) => {
      await lockCohortSchool(tx, input.tenant_id);
      await ensureCohortMigration(tx, input.tenant_id);
      const query = async <T = any>(sql: string, values: unknown[] = []): Promise<T[]> => {
        const rows = await tx.$queryRawUnsafe(sql, ...values);
        return Array.isArray(rows) ? rows : [rows];
      };

      const placementRows = await query<any>(`
        SELECT
          section.id,
          section.name,
          section.grade_level,
          section.curriculum_model,
          section.capacity,
          section.enrolment_open,
          section.academic_level_id,
          year.id AS academic_year_id,
          year.name AS academic_year_name,
          year.starts_on::text AS academic_year_starts_on,
          year.ends_on::text AS academic_year_ends_on,
          stream.id AS stream_id,
          stream.name AS stream_name,
          stream.capacity AS stream_capacity,
          (SELECT COUNT(*)::int FROM student_class_assignments assignment
            WHERE assignment.tenant_id = section.tenant_id
              AND assignment.class_section_id = section.id
              AND assignment.status = 'active') AS class_student_count,
          (SELECT COUNT(*)::int FROM student_class_assignments assignment
            WHERE assignment.tenant_id = section.tenant_id
              AND assignment.stream_id = stream.id
              AND assignment.status = 'active') AS stream_student_count
        FROM class_sections section
        JOIN academic_years year
          ON year.tenant_id = section.tenant_id
         AND year.id = section.academic_year_id
        LEFT JOIN class_streams stream
          ON stream.tenant_id = section.tenant_id
         AND stream.class_section_id = section.id
         AND stream.id = $4
         AND stream.is_active = TRUE
         AND lower(COALESCE(stream.status, 'active')) = 'active'
        WHERE section.tenant_id = $1
          AND section.id = $2
          AND year.id = $3
          AND section.is_active = TRUE
          AND lower(COALESCE(section.status, 'active')) = 'active'
          AND section.archived_at IS NULL
        FOR UPDATE OF section
      `, [input.tenant_id, input.class_section_id, input.academic_year_id, input.stream_id]);
      const placement = placementRows[0];
      if (!placement) throw new Error('ADMISSION_PLACEMENT_NOT_FOUND');
      if (!placement.enrolment_open) throw new Error('ADMISSION_CLASS_CLOSED');
      if (input.stream_id && !placement.stream_id) throw new Error('ADMISSION_STREAM_NOT_FOUND');
      if (
        input.admission_date < placement.academic_year_starts_on ||
        input.admission_date > placement.academic_year_ends_on
      ) {
        throw new Error('ADMISSION_DATE_OUTSIDE_YEAR');
      }
      if (String(placement.curriculum_model ?? '').toLowerCase() !== input.curriculum.toLowerCase()) {
        throw new Error('ADMISSION_CURRICULUM_MISMATCH');
      }
      const classFormGradeName = String(placement.name);
      let academicLevelId = placement.academic_level_id
        ? String(placement.academic_level_id)
        : null;

      if (!academicLevelId) {
        await tx.$executeRawUnsafe(
          'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
          `academic-level:${input.tenant_id}`,
        );
        const existingLevelRows = await query<any>(`
          SELECT id, is_active
          FROM academic_levels
          WHERE tenant_id = $1
            AND lower(btrim(name)) = lower(btrim($2))
          ORDER BY is_active DESC, order_index ASC, id ASC
          LIMIT 1
          FOR UPDATE
        `, [input.tenant_id, classFormGradeName]);

        if (existingLevelRows[0]) {
          academicLevelId = String(existingLevelRows[0].id);
          if (!existingLevelRows[0].is_active) {
            await query(`
              UPDATE academic_levels
              SET is_active = TRUE, updated_at = NOW()
              WHERE tenant_id = $1 AND id = $2
            `, [input.tenant_id, academicLevelId]);
          }
        } else {
          const createdLevelRows = await query<any>(`
            INSERT INTO academic_levels (
              tenant_id, system_type, name, order_index, is_active
            )
            SELECT
              $1,
              $2,
              $3,
              COALESCE(MAX(order_index), 0) + 1,
              TRUE
            FROM academic_levels
            WHERE tenant_id = $1
            RETURNING id
          `, [
            input.tenant_id,
            normalizeAcademicSystemType(placement.curriculum_model),
            classFormGradeName,
          ]);
          academicLevelId = createdLevelRows[0]?.id
            ? String(createdLevelRows[0].id)
            : null;
        }

        if (!academicLevelId) {
          throw new Error('ADMISSION_ACADEMIC_LEVEL_NOT_CONFIGURED');
        }

        await query(`
          UPDATE class_sections
          SET academic_level_id = $3, updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2
        `, [input.tenant_id, input.class_section_id, academicLevelId]);
      }

      await query(`
        INSERT INTO admission_settings (tenant_id)
        VALUES ($1)
        ON CONFLICT (tenant_id) DO NOTHING
      `, [input.tenant_id]);
      const settingsRows = await query<any>(`
        SELECT
          admission_number_mode,
          admission_number_prefix,
          admission_number_separator,
          admission_number_padding,
          include_academic_year,
          next_sequence::int,
          strict_capacity,
          strict_age_rules,
          minimum_age,
          maximum_age,
          minimum_subjects,
          maximum_subjects
        FROM admission_settings
        WHERE tenant_id = $1
        FOR UPDATE
      `, [input.tenant_id]);
      const settings = settingsRows[0] as AdmissionSettingsRecord;
      const suggestedAdmissionNumber = configuredAdmissionNumber(
        settings,
        settings.next_sequence,
        placement.academic_year_name,
      );
      if (
        settings.admission_number_mode === 'automatic' &&
        input.admission_number !== suggestedAdmissionNumber
      ) {
        throw new Error(`ADMISSION_NUMBER_STALE:${suggestedAdmissionNumber}`);
      }
      if (input.admission_number === suggestedAdmissionNumber) {
        await query(`
          UPDATE admission_settings
          SET next_sequence = next_sequence + 1, updated_by_user_id = $2::uuid, updated_at = NOW()
          WHERE tenant_id = $1
        `, [input.tenant_id, input.actor_user_id]);
      }

      const classAtCapacity =
        placement.capacity != null && placement.class_student_count >= placement.capacity;
      const streamAtCapacity =
        placement.stream_capacity != null && placement.stream_student_count >= placement.stream_capacity;
      if (settings.strict_capacity && (classAtCapacity || streamAtCapacity)) {
        throw new Error(streamAtCapacity ? 'ADMISSION_STREAM_CAPACITY_REACHED' : 'ADMISSION_CLASS_CAPACITY_REACHED');
      }

      const admittedOn = new Date(`${input.admission_date}T00:00:00.000Z`);
      let age: number | null = null;
      let ageOutsideRule = false;
      if (input.date_of_birth) {
        const birthDate = new Date(`${input.date_of_birth}T00:00:00.000Z`);
        age = admittedOn.getUTCFullYear() - birthDate.getUTCFullYear();
        if (
          admittedOn.getUTCMonth() < birthDate.getUTCMonth() ||
          (admittedOn.getUTCMonth() === birthDate.getUTCMonth() && admittedOn.getUTCDate() < birthDate.getUTCDate())
        ) {
          age -= 1;
        }
        ageOutsideRule =
          (settings.minimum_age != null && age < settings.minimum_age) ||
          (settings.maximum_age != null && age > settings.maximum_age);
      }
      if (settings.strict_age_rules && ageOutsideRule) throw new Error('ADMISSION_AGE_RULE_FAILED');

      await lockCohortSchool(tx,input.tenant_id);
      await ensureCohortMigration(tx,input.tenant_id);
      const admissionContexts=await ensureCohortContexts(tx,input.tenant_id,input.class_section_id,input.stream_id);
      const admissionContext=admissionContexts.find(context=>context.stream_id===(input.stream_id??null));
      if(!admissionContext)throw new Error('ADMISSION_STREAM_INVALID');
      const availableSubjects = await query<any>(`
        SELECT subject.id,subject.code,subject.name,subject.curriculum_model,subject.subject_type,
          COALESCE(assignment.is_compulsory,subject.is_compulsory,FALSE) AS is_compulsory,assignment.academic_term_id
        FROM class_subject_assignments assignment JOIN subjects subject ON subject.tenant_id=assignment.tenant_id
          AND subject.id=assignment.subject_id
        WHERE assignment.tenant_id=$1 AND assignment.cohort_placement_id=$2 AND assignment.status='active'
          AND (assignment.effective_from IS NULL OR assignment.effective_from<=CURRENT_DATE)
          AND (assignment.effective_to IS NULL OR assignment.effective_to>=CURRENT_DATE)
          AND subject.status='active' AND subject.deleted_at IS NULL AND subject.archived_at IS NULL
        ORDER BY subject.id`,[input.tenant_id,admissionContext.id]);
      if (availableSubjects.length === 0) throw new Error('ADMISSION_SUBJECTS_NOT_CONFIGURED');

      const selected = new Set(input.subject_ids);
      const availableIds = new Set(availableSubjects.map((subject) => String(subject.id)));
      if ([...selected].some((subjectId) => !availableIds.has(subjectId))) {
        throw new Error('ADMISSION_SUBJECT_INVALID');
      }
      if (availableSubjects.some((subject) => subject.is_compulsory && !selected.has(String(subject.id)))) {
        throw new Error('ADMISSION_COMPULSORY_SUBJECT_MISSING');
      }
      if (selected.size === 0) throw new Error('ADMISSION_SUBJECT_REQUIRED');
      if (settings.minimum_subjects != null && selected.size < settings.minimum_subjects) {
        throw new Error(`ADMISSION_MINIMUM_SUBJECTS:${settings.minimum_subjects}`);
      }
      if (settings.maximum_subjects != null && selected.size > settings.maximum_subjects) {
        throw new Error(`ADMISSION_MAXIMUM_SUBJECTS:${settings.maximum_subjects}`);
      }

      const duplicate = await query(`
        SELECT id FROM students
        WHERE tenant_id = $1 AND upper(admission_number) = upper($2)
        LIMIT 1
      `, [input.tenant_id, input.admission_number]);
      if (duplicate.length > 0) throw new Error('ADMISSION_NUMBER_EXISTS');

      const applicationRows = await query<any>(`
        INSERT INTO admission_applications (
          id, tenant_id, school_id, application_number, full_name, first_name, middle_name, last_name,
          date_of_birth, gender, birth_certificate_number, nationality, class_applying,
          applying_for_class_id, parent_name, parent_phone, guardian_name, guardian_phone,
          relationship, guardian_relationship, status, application_status, submitted_at,
          approved_at, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1, $1, $2, $3, $4, $5, $6, $7::date, $8,
          NULL, 'Kenyan', $9, $10, $11, $12, $11, $12, $13, $13,
          'approved', 'ACCEPTED', NOW(), NOW(), NOW()
        )
        RETURNING id
      `, [
        input.tenant_id,
        `DIRECT-${input.admission_number}`,
        [input.first_name, input.middle_name, input.last_name].filter(Boolean).join(' '),
        input.first_name,
        input.middle_name,
        input.last_name,
        input.date_of_birth,
        input.gender,
        placement.name,
        placement.id,
        input.guardian_name,
        input.guardian_phone,
        input.guardian_relationship,
      ]);
      const applicationId = String(applicationRows[0].id);

      const studentRows = await query<any>(`
        INSERT INTO students (
          id, tenant_id, school_id, admission_number, first_name, middle_name, last_name,
          status, student_status, date_of_birth, gender, nationality, admission_date,
          current_class_id, current_stream_id, boarding_status, primary_guardian_name,
          primary_guardian_phone, metadata, created_by_user_id, updated_by_user_id, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1, $1, $2, $3, $4, $5, 'active', 'ACTIVE', $6::date, $7, 'Kenyan', $8::date,
          $9::text, $10::text, 'DAY_SCHOLAR', $11, $12,
          jsonb_build_object(
            'academic_year_id', $13::text,
            'curriculum', $14::text,
            'grade_level', $15::text,
            'class_section_id', $9::text,
            'stream_id', $10::text
          ),
          $16, $16, NOW()
        )
        RETURNING id::text, admission_number, first_name, middle_name, last_name, admission_date
      `, [
        input.tenant_id,
        input.admission_number,
        input.first_name,
        input.middle_name,
        input.last_name,
        input.date_of_birth,
        input.gender,
        input.admission_date,
        input.class_section_id,
        input.stream_id,
        input.guardian_name,
        input.guardian_phone,
        input.academic_year_id,
        input.curriculum,
        classFormGradeName,
        input.actor_user_id,
      ]);
      const student = studentRows[0];

      await query(`
        UPDATE admission_applications
        SET status = 'registered', application_status = 'ADMITTED', admitted_student_id = $3, updated_at = NOW()
        WHERE tenant_id = $1 AND id = $2
      `, [input.tenant_id, applicationId, student.id]);

      const legacyEnrollmentRows = await query<any>(`
        INSERT INTO student_academic_enrollments (
          tenant_id, student_id, application_id, class_section_id,
          class_name, stream_name, academic_year, status
        ) VALUES ($1, $2, $3, NULL, $4, $5, $6, 'active')
        RETURNING id
      `, [
        input.tenant_id,
        student.id,
        applicationId,
        placement.name,
        placement.stream_name ?? 'Unstreamed',
        placement.academic_year_name,
      ]);
      const academicEnrollmentId = String(legacyEnrollmentRows[0].id);

      await query(`
        INSERT INTO student_class_assignments (
          tenant_id, school_id, student_id, class_section_id, stream_id, academic_level_id,
          academic_year_id, status, assigned_by_user_id, updated_at
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, 'active', $7::uuid, NOW())
      `, [
        input.tenant_id,
        student.id,
        input.class_section_id,
        input.stream_id,
        academicLevelId,
        input.academic_year_id,
        input.actor_user_id,
      ]);

      await query(`
        INSERT INTO student_allocations (
          tenant_id, student_id, class_name, stream_name, dormitory_name,
          transport_route, effective_from, is_current, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::date, TRUE, 'Created by direct admission')
      `, [
        input.tenant_id,
        student.id,
        placement.name,
        placement.stream_name ?? 'Unstreamed',
        input.dormitory_name,
        input.transport_route,
        input.admission_date,
      ]);

      await query(`UPDATE student_class_assignments SET cohort_id=$3,cohort_placement_id=$4
        WHERE tenant_id=$1 AND student_id=$2 AND status='active' AND class_section_id=$5 AND stream_id IS NOT DISTINCT FROM $6::text
        RETURNING id`,[input.tenant_id,student.id,admissionContext.cohort_id,admissionContext.id,input.class_section_id,input.stream_id??null]);
      await query(`UPDATE student_academic_enrollments SET cohort_id=$3,cohort_placement_id=$4,stream_id=$5
        WHERE tenant_id=$1 AND id=$2 RETURNING id`,[input.tenant_id,academicEnrollmentId,admissionContext.cohort_id,admissionContext.id,input.stream_id??null]);

      for (const subject of availableSubjects.filter((item) => selected.has(String(item.id)))) {
        await query(`
          INSERT INTO student_subject_enrollments (
            tenant_id, student_id, academic_enrollment_id, subject_offering_id,
            subject_code, subject_name, academic_year_id, academic_term_id,
            class_section_id, stream_id, subject_id, curriculum_model, subject_type,
            is_compulsory, selected_by_user_id, effective_from, status
          ) VALUES (
            $1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::uuid, $15::date, 'active'
          )
        `, [
          input.tenant_id,
          student.id,
          academicEnrollmentId,
          subject.code,
          subject.name,
          input.academic_year_id,
          subject.academic_term_id,
          input.class_section_id,
          input.stream_id,
          subject.id,
          placement.curriculum_model,
          subject.subject_type,
          subject.is_compulsory,
          input.actor_user_id,
          input.admission_date,
        ]);
      }

      const parentRoleRows = await query<any>(`
        SELECT id FROM roles
        WHERE tenant_id = $1 AND lower(code) = 'parent'
        ORDER BY is_system DESC
        LIMIT 1
      `, [input.tenant_id]);
      const parentRoleId = parentRoleRows[0]?.id ?? null;
      if (!parentRoleId) throw new Error('PARENT_ROLE_NOT_CONFIGURED');
      let parentUserId: string | null = null;
      if (parentRoleId) {
        const parentRows = await query<any>(`
          INSERT INTO users (
            tenant_id, email, password_hash, full_name, display_name, user_type,
            status, phone_number_hash, phone_number_last4
          ) VALUES ($1, $2, $3, $4, $4, 'member', 'active', $5, $6)
          ON CONFLICT (lower(email)) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            full_name = EXCLUDED.full_name,
            phone_number_hash = EXCLUDED.phone_number_hash,
            phone_number_last4 = EXCLUDED.phone_number_last4,
            status = 'active',
            updated_at = NOW()
          RETURNING id::text
        `, [
          input.tenant_id,
          input.guardian_internal_email,
          input.guardian_password_hash,
          input.guardian_name,
          input.guardian_phone_hash,
          input.guardian_phone_last4,
        ]);
        parentUserId = parentRows[0]?.id ?? null;
        await query(`
          INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
          VALUES ($1, $2::uuid, $3::uuid, 'active')
          ON CONFLICT (tenant_id, user_id) DO UPDATE SET
            role_id = EXCLUDED.role_id,
            status = 'active',
            updated_at = NOW()
        `, [input.tenant_id, parentUserId, parentRoleId]);
      }

      const studentRoleRows = await query<any>(`
        SELECT id FROM roles
        WHERE tenant_id = $1 AND lower(code) = 'student'
        ORDER BY is_system DESC
        LIMIT 1
      `, [input.tenant_id]);
      const studentRoleId = studentRoleRows[0]?.id ?? null;
      if (!studentRoleId) throw new Error('STUDENT_ROLE_NOT_CONFIGURED');

      const studentDisplayName = [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean)
        .join(' ');
      const studentInternalEmail = `student-${student.id}@access.myshule.internal`;
      await query(`
        INSERT INTO users (
          id, tenant_id, email, password_hash, full_name, display_name, user_type,
          status, phone_number_hash, phone_number_last4, email_verified_at
        ) VALUES (
          $1::uuid, $2, $3, $4, $5, $5, 'member', 'active', $6, $7, NOW()
        )
      `, [
        student.id,
        input.tenant_id,
        studentInternalEmail,
        input.student_password_hash,
        studentDisplayName,
        input.guardian_phone_hash,
        input.guardian_phone_last4,
      ]);
      await query(`
        INSERT INTO tenant_memberships (tenant_id, user_id, role_id, status)
        VALUES ($1, $2::uuid, $3::uuid, 'active')
        ON CONFLICT (tenant_id, user_id) DO UPDATE SET
          role_id = EXCLUDED.role_id,
          status = 'active',
          updated_at = NOW()
      `, [input.tenant_id, student.id, studentRoleId]);
      await query(`
        INSERT INTO student_portal_access (
          tenant_id, student_id, user_id, username, guardian_phone_hash,
          force_password_change, status
        ) VALUES ($1, $2, $3::uuid, $4, $5, TRUE, 'active')
        ON CONFLICT (tenant_id, student_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          username = EXCLUDED.username,
          guardian_phone_hash = EXCLUDED.guardian_phone_hash,
          force_password_change = TRUE,
          status = 'active',
          updated_at = NOW()
      `, [
        input.tenant_id,
        student.id,
        student.id,
        input.admission_number,
        input.guardian_phone_hash,
      ]);

      const existingGuardianRows = await query<any>(`
        SELECT
          profile.id::text,
          EXISTS (
            SELECT 1
            FROM student_guardians link
            WHERE link.tenant_id = profile.tenant_id
              AND link.guardian_profile_id = profile.id
              AND link.status = 'active'
          ) AS has_linked_student
        FROM guardian_profiles profile
        WHERE profile.tenant_id = $1
          AND profile.normalized_phone = $2
        LIMIT 1
      `, [input.tenant_id, input.guardian_phone]);
      const existingSiblingGuardian = Boolean(existingGuardianRows[0]?.has_linked_student);

      const guardianRows = await query<any>(`
        INSERT INTO guardian_profiles (
          tenant_id, display_name, normalized_phone, user_id, status
        ) VALUES ($1, $2, $3, $4::uuid, 'active')
        ON CONFLICT (tenant_id, normalized_phone) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          user_id = COALESCE(guardian_profiles.user_id, EXCLUDED.user_id),
          status = 'active',
          updated_at = NOW()
        RETURNING id::text, user_id::text
      `, [input.tenant_id, input.guardian_name, input.guardian_phone, parentUserId]);
      const guardian = guardianRows[0];
      const normalizedRelationship = input.guardian_relationship.trim().toUpperCase();
      const guardianRelationship = ['FATHER', 'MOTHER', 'GUARDIAN', 'SPONSOR', 'OTHER']
        .includes(normalizedRelationship)
        ? normalizedRelationship
        : 'OTHER';

      const canonicalGuardianRows = await query<any>(`
        INSERT INTO parent_guardians (
          id, school_id, full_name, relationship_type, phone, status, updated_at
        ) VALUES (
          gen_random_uuid()::text, $1, $2, $3::"GuardianRelationship", $4, 'ACTIVE', NOW()
        )
        ON CONFLICT (school_id, phone) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          relationship_type = EXCLUDED.relationship_type,
          status = 'ACTIVE',
          updated_at = NOW()
        RETURNING id::text
      `, [
        input.tenant_id,
        input.guardian_name,
        guardianRelationship,
        input.guardian_phone,
      ]);
      const canonicalGuardianId = String(canonicalGuardianRows[0].id);

      await query(`
        INSERT INTO student_guardians (
          tenant_id, school_id, student_id, guardian_id, relationship_type,
          is_primary_contact, can_receive_sms, can_access_parent_portal, can_pick_student,
          user_id, guardian_profile_id, display_name, email, phone, normalized_phone,
          relationship, is_primary, status, accepted_at, updated_at
        ) VALUES (
          $1, $1, $2, $3, $4::"GuardianRelationship",
          TRUE, TRUE, TRUE, FALSE,
          $5::uuid, $6::uuid, $7, NULL, $8, $8,
          $9, TRUE, 'active', NOW(), NOW()
        )
        ON CONFLICT (tenant_id, student_id, normalized_phone) WHERE normalized_phone IS NOT NULL
        DO UPDATE SET
          school_id = EXCLUDED.school_id,
          guardian_id = EXCLUDED.guardian_id,
          relationship_type = EXCLUDED.relationship_type,
          is_primary_contact = TRUE,
          can_receive_sms = TRUE,
          can_access_parent_portal = TRUE,
          user_id = EXCLUDED.user_id,
          guardian_profile_id = EXCLUDED.guardian_profile_id,
          display_name = EXCLUDED.display_name,
          relationship = EXCLUDED.relationship,
          is_primary = TRUE,
          status = 'active',
          accepted_at = NOW(),
          updated_at = NOW()
      `, [
        input.tenant_id,
        student.id,
        canonicalGuardianId,
        guardianRelationship,
        guardian.user_id ?? parentUserId,
        guardian.id,
        input.guardian_name,
        input.guardian_phone,
        input.guardian_relationship,
      ]);

      const feeRows = await query<any>(`
        SELECT
          id::text,
          description,
          currency_code,
          amount_minor::text,
          due_days_after_registration,
          term_name,
          academic_year
        FROM student_fee_structures
        WHERE tenant_id = $1
          AND is_active = TRUE
          AND (
            lower(class_name) = lower($2)
            OR lower(class_name) = lower($3)
          )
          AND lower(academic_year) = lower($4)
        ORDER BY
          CASE WHEN lower(class_name) = lower($2) THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT 1
      `, [input.tenant_id, placement.name, placement.grade_level, placement.academic_year_name]);
      let feeStatus: Record<string, unknown> = { status: 'not_configured' };
      const fee = feeRows[0];
      if (fee) {
        const invoiceNumber = `INV-${input.admission_number}-${input.academic_year_id.slice(0, 8)}`;
        const invoiceRows = await query<any>(`
          WITH assignment AS (
            INSERT INTO student_fee_assignments (
              tenant_id, student_id, application_id, fee_structure_id,
              status, amount_minor, currency_code
            ) VALUES ($1, $2, $3, $4, 'assigned', $7::bigint, $6)
            ON CONFLICT (tenant_id, student_id, fee_structure_id)
            DO UPDATE SET
              application_id = EXCLUDED.application_id,
              amount_minor = EXCLUDED.amount_minor,
              currency_code = EXCLUDED.currency_code,
              status = 'assigned',
              updated_at = NOW()
            RETURNING id
          )
          INSERT INTO student_fee_invoices (
            tenant_id, assignment_id, student_id, invoice_number, status,
            description, currency_code, amount_due_minor, amount_paid_minor,
            issued_date, due_date
          )
          SELECT
            $1, assignment.id, $2, $5, 'open',
            $8, $6, $7::bigint, 0,
            $9::date, ($9::date + $10::integer)
          FROM assignment
          ON CONFLICT (tenant_id, assignment_id)
          DO UPDATE SET
            description = EXCLUDED.description,
            currency_code = EXCLUDED.currency_code,
            amount_due_minor = EXCLUDED.amount_due_minor,
            due_date = EXCLUDED.due_date,
            updated_at = NOW()
          RETURNING
            id::text,
            invoice_number,
            amount_due_minor::text,
            amount_paid_minor::text,
            due_date::text
        `, [
          input.tenant_id,
          student.id,
          applicationId,
          fee.id,
          invoiceNumber,
          fee.currency_code,
          fee.amount_minor,
          fee.description,
          input.admission_date,
          fee.due_days_after_registration,
        ]);
        feeStatus = {
          status: 'invoiced',
          currency_code: fee.currency_code,
          description: fee.description,
          due_days: fee.due_days_after_registration,
          ...invoiceRows[0],
        };
      }

      const result = {
        application_id: applicationId,
        student,
        placement: {
          academic_enrollment_id: academicEnrollmentId,
          academic_year_id: input.academic_year_id,
          academic_year_name: placement.academic_year_name,
          class_section_id: input.class_section_id,
          class_name: placement.name,
          stream_id: input.stream_id,
          stream_name: placement.stream_name ?? null,
          capacity_warning:
            classAtCapacity || streamAtCapacity,
          age_warning: ageOutsideRule,
          age_at_admission: age,
        },
        subjects: availableSubjects
          .filter((subject) => selected.has(String(subject.id)))
          .map((subject) => ({ id: subject.id, code: subject.code, name: subject.name })),
        guardian: {
          profile_id: guardian.id,
          existing_sibling_guardian: existingSiblingGuardian,
          portal_access: parentRoleId ? 'otp_ready' : 'parent_role_not_configured',
          phone: input.guardian_phone,
        },
        student_portal: {
          username: input.admission_number,
          status: 'otp_ready',
          force_password_change: true,
        },
        fees: feeStatus,
      };

      if (input.actor_user_id) {
        await tx.$executeRawUnsafe(`
          UPDATE admission_drafts
          SET status = 'completed', updated_at = NOW()
          WHERE tenant_id = $1
            AND created_by_user_id = $2::uuid
            AND status = 'draft'
        `, input.tenant_id, input.actor_user_id);
      }

      await tx.$executeRawUnsafe(`
        INSERT INTO audit_logs (
          tenant_id, actor_user_id, action, module, entity_type, entity_id,
          resource_type, resource_id, aggregate_id, metadata
        ) VALUES (
          $1, $2::uuid, 'STUDENT_ADMITTED', 'admissions', 'student', $3::text,
          'student', $3::uuid, $3::uuid, $4::jsonb
        )
      `,
      input.tenant_id,
      input.actor_user_id,
      student.id,
      JSON.stringify({
        status: 'SUCCESS',
        admission_number: student.admission_number,
        application_id: applicationId,
        academic_year_id: input.academic_year_id,
        class_section_id: input.class_section_id,
        stream_id: input.stream_id,
      }));

      await persistGovernance?.({ tx, result });

      return result;
    });
  }

  async changeStudentAdmissionNumber(input: {
    tenant_id: string;
    actor_user_id: string;
    student_id: string;
    admission_number: string;
    temporary_password_hash: string;
    reason: string;
  }) {
    return this.prisma.executeWithTenant<any>(
      input.tenant_id,
      input.actor_user_id,
      async (tx: any) => {
        const query = async <T = any>(sql: string, params: unknown[] = []): Promise<T[]> => {
          const rows = await tx.$queryRawUnsafe(sql, ...params);
          return Array.isArray(rows) ? rows : [rows];
        };
        const studentRows = await query<any>(`
          SELECT
            student.id::text,
            student.admission_number,
            access.user_id::text AS student_user_id,
            COALESCE(access.force_password_change, FALSE) AS force_password_change,
            guardian.user_id::text AS guardian_user_id
          FROM students student
          LEFT JOIN student_portal_access access
            ON access.tenant_id = student.tenant_id
           AND access.student_id = student.id
          LEFT JOIN LATERAL (
            SELECT link.user_id
            FROM student_guardians link
            WHERE link.tenant_id = student.tenant_id
              AND link.student_id = student.id
              AND link.is_primary = TRUE
              AND link.status = 'active'
            ORDER BY link.created_at
            LIMIT 1
          ) guardian ON TRUE
          WHERE student.tenant_id = $1
            AND student.id = $2::uuid
          FOR UPDATE OF student
        `, [input.tenant_id, input.student_id]);
        const student = studentRows[0];
        if (!student) throw new Error('ADMISSION_STUDENT_NOT_FOUND');
        if (student.admission_number === input.admission_number) {
          return {
            student_id: input.student_id,
            previous_admission_number: student.admission_number,
            admission_number: input.admission_number,
            changed: false,
          };
        }

        const duplicate = await query(`
          SELECT id
          FROM students
          WHERE tenant_id = $1
            AND id <> $2::uuid
            AND upper(admission_number) = upper($3)
          LIMIT 1
        `, [input.tenant_id, input.student_id, input.admission_number]);
        if (duplicate.length > 0) throw new Error('ADMISSION_NUMBER_EXISTS');

        await query(`
          UPDATE students
          SET admission_number = $3,
              updated_by_user_id = $4::uuid,
              updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid
        `, [input.tenant_id, input.student_id, input.admission_number, input.actor_user_id]);
        await query(`
          UPDATE student_portal_access
          SET username = $3, updated_at = NOW()
          WHERE tenant_id = $1 AND student_id = $2::uuid
        `, [input.tenant_id, input.student_id, input.admission_number]);
        if (student.student_user_id && student.force_password_change) {
          await query(`
            UPDATE users
            SET password_hash = $3, updated_at = NOW()
            WHERE tenant_id = $1 AND id = $2::uuid
          `, [input.tenant_id, student.student_user_id, input.temporary_password_hash]);
        }
        await query(`
          UPDATE admission_applications
          SET application_number = $3, updated_at = NOW()
          WHERE tenant_id = $1
            AND admitted_student_id = $2::uuid
            AND application_number = $4
        `, [
          input.tenant_id,
          input.student_id,
          `DIRECT-${input.admission_number}`,
          `DIRECT-${student.admission_number}`,
        ]);
        const credentialUserIds = [student.student_user_id, student.guardian_user_id]
          .filter(Boolean);
        if (credentialUserIds.length > 0) {
          await query(`
            UPDATE parent_otp_challenges
            SET consumed_at = NOW()
            WHERE tenant_id = $1
              AND user_id = ANY($2::uuid[])
              AND consumed_at IS NULL
          `, [input.tenant_id, credentialUserIds]);
        }
        await query(`
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, action, resource_type, resource_id, metadata
          ) VALUES (
            $1, $2::uuid, 'student.admission_number.changed', 'student', $3,
            jsonb_build_object(
              'previous_admission_number', $4,
              'admission_number', $5,
              'reason', $6,
              'pending_otps_invalidated', $7::boolean
            )
          )
        `, [
          input.tenant_id,
          input.actor_user_id,
          input.student_id,
          student.admission_number,
          input.admission_number,
          input.reason,
          credentialUserIds.length > 0,
        ]);

        return {
          student_id: input.student_id,
          previous_admission_number: student.admission_number,
          admission_number: input.admission_number,
          force_password_change: Boolean(student.force_password_change),
          pending_otps_invalidated: credentialUserIds.length > 0,
          changed: true,
        };
      },
    );
  }

  async changePrimaryGuardianPhone(input: {
    tenant_id: string;
    actor_user_id: string;
    student_id: string;
    guardian_phone: string;
    guardian_phone_hash: string;
    guardian_phone_last4: string;
    reason: string;
  }) {
    return this.prisma.executeWithTenant<any>(
      input.tenant_id,
      input.actor_user_id,
      async (tx: any) => {
        const query = async <T = any>(sql: string, params: unknown[] = []): Promise<T[]> => {
          const rows = await tx.$queryRawUnsafe(sql, ...params);
          return Array.isArray(rows) ? rows : [rows];
        };
        const guardianRows = await query<any>(`
          SELECT
            student.id::text AS student_id,
            student.primary_guardian_phone,
            link.guardian_profile_id::text,
            link.user_id::text AS guardian_user_id
          FROM students student
          LEFT JOIN LATERAL (
            SELECT guardian_profile_id, user_id
            FROM student_guardians guardian_link
            WHERE guardian_link.tenant_id = student.tenant_id
              AND guardian_link.student_id = student.id
              AND guardian_link.is_primary = TRUE
              AND guardian_link.status = 'active'
            ORDER BY guardian_link.created_at
            LIMIT 1
          ) link ON TRUE
          WHERE student.tenant_id = $1
            AND student.id = $2::uuid
          FOR UPDATE OF student
        `, [input.tenant_id, input.student_id]);
        const guardian = guardianRows[0];
        if (!guardian) throw new Error('ADMISSION_STUDENT_NOT_FOUND');
        if (!guardian.guardian_profile_id) throw new Error('PRIMARY_GUARDIAN_NOT_FOUND');
        if (guardian.primary_guardian_phone === input.guardian_phone) {
          return {
            student_id: input.student_id,
            guardian_profile_id: guardian.guardian_profile_id,
            previous_phone_last4: input.guardian_phone_last4,
            phone_last4: input.guardian_phone_last4,
            affected_student_ids: [input.student_id],
            changed: false,
          };
        }

        const conflict = await query(`
          SELECT id
          FROM guardian_profiles
          WHERE tenant_id = $1
            AND normalized_phone = $2
            AND id <> $3::uuid
          LIMIT 1
        `, [input.tenant_id, input.guardian_phone, guardian.guardian_profile_id]);
        if (conflict.length > 0) throw new Error('GUARDIAN_PHONE_BELONGS_TO_ANOTHER_PROFILE');

        const linkedStudents = await query<any>(`
          SELECT DISTINCT link.student_id::text, access.user_id::text AS student_user_id
          FROM student_guardians link
          LEFT JOIN student_portal_access access
            ON access.tenant_id = link.tenant_id
           AND access.student_id = link.student_id
          WHERE link.tenant_id = $1
            AND link.guardian_profile_id = $2::uuid
            AND link.status = 'active'
        `, [input.tenant_id, guardian.guardian_profile_id]);
        const affectedStudentIds = linkedStudents.map((row) => row.student_id);
        const studentUserIds = linkedStudents
          .map((row) => row.student_user_id)
          .filter(Boolean);

        await query(`
          UPDATE guardian_profiles
          SET normalized_phone = $3,
              updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2::uuid
        `, [input.tenant_id, guardian.guardian_profile_id, input.guardian_phone]);
        await query(`
          UPDATE student_guardians
          SET phone = $3,
              normalized_phone = $3,
              updated_at = NOW()
          WHERE tenant_id = $1 AND guardian_profile_id = $2::uuid
        `, [input.tenant_id, guardian.guardian_profile_id, input.guardian_phone]);
        if (affectedStudentIds.length > 0) {
          await query(`
            UPDATE students
            SET primary_guardian_phone = $3,
                updated_by_user_id = $4::uuid,
                updated_at = NOW()
            WHERE tenant_id = $1 AND id = ANY($2::uuid[])
          `, [
            input.tenant_id,
            affectedStudentIds,
            input.guardian_phone,
            input.actor_user_id,
          ]);
          await query(`
            UPDATE student_portal_access
            SET guardian_phone_hash = $3, updated_at = NOW()
            WHERE tenant_id = $1 AND student_id = ANY($2::uuid[])
          `, [input.tenant_id, affectedStudentIds, input.guardian_phone_hash]);
        }
        const credentialUserIds = [guardian.guardian_user_id, ...studentUserIds].filter(Boolean);
        if (credentialUserIds.length > 0) {
          await query(`
            UPDATE users
            SET phone_number_hash = $3,
                phone_number_last4 = $4,
                updated_at = NOW()
            WHERE tenant_id = $1 AND id = ANY($2::uuid[])
          `, [
            input.tenant_id,
            credentialUserIds,
            input.guardian_phone_hash,
            input.guardian_phone_last4,
          ]);
          await query(`
            UPDATE parent_otp_challenges
            SET consumed_at = NOW()
            WHERE tenant_id = $1
              AND user_id = ANY($2::uuid[])
              AND consumed_at IS NULL
          `, [input.tenant_id, credentialUserIds]);
        }
        const previousPhoneLast4 = String(guardian.primary_guardian_phone ?? '').slice(-4);
        await query(`
          INSERT INTO audit_logs (
            tenant_id, actor_user_id, action, resource_type, resource_id, metadata
          ) VALUES (
            $1, $2::uuid, 'student.guardian_phone.changed', 'guardian_profile', $3,
            jsonb_build_object(
              'student_id', $4,
              'affected_student_ids', $5::jsonb,
              'previous_phone_last4', $6,
              'phone_last4', $7,
              'reason', $8,
              'pending_otps_invalidated', $9::boolean
            )
          )
        `, [
          input.tenant_id,
          input.actor_user_id,
          guardian.guardian_profile_id,
          input.student_id,
          JSON.stringify(affectedStudentIds),
          previousPhoneLast4,
          input.guardian_phone_last4,
          input.reason,
          credentialUserIds.length > 0,
        ]);

        return {
          student_id: input.student_id,
          guardian_profile_id: guardian.guardian_profile_id,
          previous_phone: guardian.primary_guardian_phone,
          previous_phone_last4: previousPhoneLast4,
          phone_last4: input.guardian_phone_last4,
          affected_student_ids: affectedStudentIds,
          pending_otps_invalidated: credentialUserIds.length > 0,
          changed: true,
        };
      },
    );
  }

  async listApplications(
    tenantId: string,
    options: { search?: string; status?: string; limit: number; offset?: number },
  ): Promise<AdmissionApplicationRecord[]> {
    const conditions = ['tenant_id = $1'];
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
          tenant_id AS school_id,
          application_number,
          full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          class_applying,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          relationship,
          allergies,
          conditions,
          emergency_contact,
          status,
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
          tenant_id,
          application_number,
          full_name,
          date_of_birth,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          class_applying,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          relationship,
          allergies,
          conditions,
          emergency_contact,
          status,
          interview_date,
          review_notes
        )
        VALUES (
          $1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::date, $23
        )
        RETURNING
          id,
          tenant_id AS school_id,
          application_number,
          full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          class_applying,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          relationship,
          allergies,
          conditions,
          emergency_contact,
          status,
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
          tenant_id AS school_id,
          application_number,
          full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          class_applying,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          relationship,
          allergies,
          conditions,
          emergency_contact,
          status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id::text,
          created_at,
          updated_at
        FROM admission_applications
        WHERE tenant_id = $1
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
          tenant_id AS school_id,
          application_number,
          full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          class_applying,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          relationship,
          allergies,
          conditions,
          emergency_contact,
          status,
          interview_date::text,
          review_notes,
          approved_at::text,
          admitted_student_id::text,
          created_at,
          updated_at
        FROM admission_applications
        WHERE tenant_id = $1
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
      assignments.push(`status = $${parameterIndex}`);
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
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING
          id,
          tenant_id AS school_id,
          application_number,
          full_name,
          date_of_birth::text,
          gender,
          birth_certificate_number,
          nationality,
          previous_school,
          kcpe_results,
          cbc_level,
          nemis_upi,
          class_applying,
          parent_name,
          parent_phone,
          parent_email,
          parent_occupation,
          relationship,
          allergies,
          conditions,
          emergency_contact,
          status,
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
        SET status = 'registered',
            admitted_student_id = $3::uuid,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id, status
      `, [tenantId, applicationId, studentId],
    );

    return result[0] ?? null;
  }

  async countStudents(tenantId: string): Promise<number> {
    const result = await this.executeSql(tenantId, `
        SELECT COUNT(*)::text AS total
        FROM students
        WHERE tenant_id = $1
      `, [tenantId],
    );

    return Number(result[0]?.total ?? '0');
  }

  async createEnquiry(input: {
    tenant_id: string;
    enquiry_code: string;
    student_first_name: string;
    student_last_name: string;
    parent_name: string;
    parent_phone: string;
    parent_email?: string | null;
    class_applying?: string | null;
    enquiry_source?: string | null;
    boarding_day_preference?: string | null;
    current_school?: string | null;
    location?: string | null;
    notes?: string | null;
    follow_up_date?: string | null;
    created_by_user_id?: string | null;
  }) {
    const result = await this.executeSql(input.tenant_id, `
        INSERT INTO admission_enquiries (
          tenant_id,
          enquiry_code,
          student_first_name,
          student_last_name,
          parent_name,
          parent_phone,
          parent_email,
          class_applying,
          enquiry_source,
          boarding_day_preference,
          current_school,
          location,
          notes,
          follow_up_date,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::date, $15::uuid)
        RETURNING *
      `, [
        input.tenant_id,
        input.enquiry_code,
        input.student_first_name,
        input.student_last_name,
        input.parent_name,
        input.parent_phone,
        input.parent_email ?? null,
        input.class_applying ?? null,
        input.enquiry_source ?? null,
        input.boarding_day_preference ?? null,
        input.current_school ?? null,
        input.location ?? null,
        input.notes ?? null,
        input.follow_up_date ?? null,
        input.created_by_user_id ?? null,
      ],
    );

    return result[0];
  }

  async createInterview(input: {
    tenant_id: string;
    application_id: string;
    interview_date: string;
    start_time: string;
    end_time: string;
    location?: string | null;
    interviewer_user_id?: string | null;
    assessment_type?: string | null;
    reading_score?: number | null;
    writing_score?: number | null;
    mathematics_score?: number | null;
    general_conduct?: string | null;
    recommendation?: string | null;
    interviewer_comment?: string | null;
  }) {
    const result = await this.executeSql(input.tenant_id, `
        INSERT INTO admission_interviews (
          tenant_id,
          application_id,
          interview_date,
          start_time,
          end_time,
          location,
          interviewer_user_id,
          assessment_type,
          reading_score,
          writing_score,
          mathematics_score,
          general_conduct,
          recommendation,
          interviewer_comment
        )
        VALUES ($1, $2::uuid, $3::date, $4, $5, $6, $7::uuid, $8, $9::integer, $10::integer, $11::integer, $12, $13, $14)
        RETURNING *
      `, [
        input.tenant_id,
        input.application_id,
        input.interview_date,
        input.start_time,
        input.end_time,
        input.location ?? null,
        input.interviewer_user_id ?? null,
        input.assessment_type ?? null,
        input.reading_score ?? null,
        input.writing_score ?? null,
        input.mathematics_score ?? null,
        input.general_conduct ?? null,
        input.recommendation ?? null,
        input.interviewer_comment ?? null,
      ],
    );

    return result[0];
  }

  async createOffer(input: {
    tenant_id: string;
    application_id: string;
    required_deposit?: number | null;
    offer_date?: string | null;
    deadline_date?: string | null;
  }) {
    const result = await this.executeSql(input.tenant_id, `
        INSERT INTO admission_offers (
          tenant_id,
          application_id,
          required_deposit,
          offer_date,
          deadline_date
        )
        VALUES ($1, $2::uuid, $3::bigint, COALESCE($4::date, CURRENT_DATE), $5::date)
        RETURNING *
      `, [
        input.tenant_id,
        input.application_id,
        input.required_deposit ?? null,
        input.offer_date ?? null,
        input.deadline_date ?? null,
      ],
    );

    return result[0];
  }

  async createAppointment(input: {
    tenant_id: string;
    application_id?: string | null;
    visitor_name: string;
    purpose: string;
    appointment_date: string;
    start_time: string;
    assigned_user_id?: string | null;
  }) {
    const result = await this.executeSql(input.tenant_id, `
        INSERT INTO admission_appointments (
          tenant_id,
          application_id,
          visitor_name,
          purpose,
          appointment_date,
          start_time,
          assigned_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5::date, $6, $7::uuid)
        RETURNING *
      `, [
        input.tenant_id,
        input.application_id ?? null,
        input.visitor_name,
        input.purpose,
        input.appointment_date,
        input.start_time,
        input.assigned_user_id ?? null,
      ],
    );

    return result[0];
  }

  async createTask(input: {
    tenant_id: string;
    application_id?: string | null;
    task_title: string;
    task_description?: string | null;
    due_date?: string | null;
    priority?: string | null;
    assigned_user_id?: string | null;
  }) {
    const result = await this.executeSql(input.tenant_id, `
        INSERT INTO admission_tasks (
          tenant_id,
          application_id,
          task_title,
          task_description,
          due_date,
          priority,
          assigned_user_id
        )
        VALUES ($1, $2::uuid, $3, $4, $5::date, COALESCE($6, 'medium'), $7::uuid)
        RETURNING *
      `, [
        input.tenant_id,
        input.application_id ?? null,
        input.task_title,
        input.task_description ?? null,
        input.due_date ?? null,
        input.priority ?? null,
        input.assigned_user_id ?? null,
      ],
    );

    return result[0];
  }

  async createTemplate(input: {
    tenant_id: string;
    template_name: string;
    template_type: string;
    content: string;
    is_active?: boolean;
    created_by_user_id?: string | null;
  }) {
    const result = await this.executeSql(input.tenant_id, `
        INSERT INTO admission_templates (
          tenant_id,
          template_name,
          template_type,
          content,
          is_active,
          created_by_user_id
        )
        VALUES ($1, $2, $3, $4, COALESCE($5::boolean, TRUE), $6::uuid)
        RETURNING *
      `, [
        input.tenant_id,
        input.template_name,
        input.template_type,
        input.content,
        input.is_active ?? null,
        input.created_by_user_id ?? null,
      ],
    );

    return result[0];
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
          tenant_id,
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
        WHERE tenant_id = $1
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
    const conditions = ['document.tenant_id = $1'];
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
          ON application.tenant_id = document.tenant_id
         AND application.id = document.application_id
        LEFT JOIN students student
          ON student.tenant_id = document.tenant_id
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
        WHERE tenant_id = $1
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
  }, transaction?: any): Promise<any> {
    await this.executeSql(input.school_id, `
        UPDATE student_allocations
        SET is_current = FALSE,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND student_id = $2::uuid
          AND is_current = TRUE
      `, [input.school_id, input.student_id], transaction,
    );

    const result = await this.executeSql(input.school_id, `
        INSERT INTO student_allocations (
          tenant_id,
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
      ], transaction,
    );

    return result[0];
  }

  async findCurrentAllocationByStudentId(tenantId: string, studentId: string) {
    const result = await this.executeSql(tenantId, `
        SELECT id, class_name, stream_name, dormitory_name, transport_route, effective_from
        FROM student_allocations
        WHERE tenant_id = $1
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
          WHERE tenant_id = $1
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
            relationship,
            is_primary,
            status,
            accepted_at,
            created_at,
            updated_at
        ),
        inserted AS (
          INSERT INTO student_guardians (
            tenant_id,
            student_id,
            invitation_id,
            display_name,
            email,
            phone,
            relationship,
            is_primary,
            status
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
            relationship,
            is_primary,
            status,
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
    transaction?: any,
  ) {
    const result = await this.executeSql(tenantId, `
        WITH selected_section AS (
          SELECT
            section.id::text,
            section.tenant_id,
            section.name AS class_name,
            section.academic_year_id::text,
            year.name AS academic_year,
            section.capacity
          FROM class_sections section
          JOIN academic_years year
            ON year.tenant_id = section.tenant_id
           AND year.id::text = section.academic_year_id::text
          WHERE section.tenant_id = $1
            AND lower(btrim(section.name)) = lower(btrim($2))
            AND section.is_active = TRUE
            AND lower(COALESCE(section.status, 'active')) = 'active'
            AND section.archived_at IS NULL
            AND section.enrolment_open = TRUE
            AND section.academic_level_id IS NOT NULL
            AND lower(COALESCE(year.status, 'active')) = 'active'
            AND year.archived_at IS NULL
          ORDER BY year.is_current DESC, year.starts_on DESC, section.created_at DESC
          LIMIT 1
          FOR UPDATE OF section
        ),
        selected_stream AS (
          SELECT
            stream.id::text,
            stream.name,
            stream.capacity
          FROM class_streams stream
          JOIN selected_section section
            ON stream.class_section_id::text = section.id
          WHERE stream.tenant_id = $1
            AND NULLIF(btrim($3), '') IS NOT NULL
            AND lower(btrim(stream.name)) = lower(btrim($3))
            AND stream.is_active = TRUE
            AND lower(COALESCE(stream.status, 'active')) = 'active'
            AND stream.archived_at IS NULL
          ORDER BY stream.created_at ASC
          LIMIT 1
          FOR UPDATE OF stream
        )
        SELECT
          selected_section.id,
          selected_section.academic_year_id,
          selected_section.class_name,
          COALESCE(selected_stream.name, '') AS stream_name,
          selected_stream.id AS stream_id,
          selected_section.academic_year,
          CASE
            WHEN selected_stream.id IS NOT NULL
              THEN COALESCE(selected_stream.capacity, selected_section.capacity)
            ELSE selected_section.capacity
          END AS capacity,
          (
            SELECT COUNT(*)::int
            FROM (
              SELECT assignment.student_id::text
              FROM student_class_assignments assignment
              WHERE assignment.tenant_id = selected_section.tenant_id
                AND assignment.class_section_id::text = selected_section.id
                AND assignment.status = 'active'
                AND (
                  selected_stream.id IS NULL
                  OR assignment.stream_id::text = selected_stream.id
                )
              UNION
              SELECT enrollment.student_id::text
              FROM student_academic_enrollments enrollment
              WHERE enrollment.tenant_id = selected_section.tenant_id
                AND enrollment.class_section_id::text = selected_section.id
                AND enrollment.status = 'active'
                AND (
                  selected_stream.id IS NULL
                  OR lower(btrim(enrollment.stream_name)) = lower(btrim(selected_stream.name))
                )
            ) active_students
          ) AS current_enrollments
        FROM selected_section
        LEFT JOIN selected_stream ON TRUE
        WHERE NULLIF(btrim($3), '') IS NULL
           OR selected_stream.id IS NOT NULL
      `, [tenantId, className, streamName], transaction,
    );

    return result[0] ?? null;
  }

  async createStudentAcademicEnrollment(input: {
    school_id: string;
    student_id: string;
    application_id: string;
    class_section_id?: string | null;
    stream_id?: string | null;
    class_name: string;
    stream_name: string;
    academic_year: string;
  }, transaction?: any): Promise<any> {
    if (!transaction) return this.prisma.executeWithTenant(input.school_id,null,
      (tx:any)=>this.createStudentAcademicEnrollment(input,tx));
    await lockCohortSchool(transaction,input.school_id);
    await ensureCohortMigration(transaction,input.school_id);
    const contexts=await ensureCohortContexts(transaction,input.school_id,String(input.class_section_id),input.stream_id);
    const context=contexts.find(item=>item.stream_id===(input.stream_id??null));
    if(!context)throw new BadRequestException('Select the actual stream for this cohort.');
    const existing=await transaction.$queryRawUnsafe(`SELECT * FROM student_academic_enrollments
      WHERE tenant_id=$1 AND student_id::text=$2 AND (academic_year=$3 OR status='active') FOR UPDATE`,
    input.school_id,input.student_id,input.academic_year);
    if(existing.length) {
      if(existing.length===1 && existing[0].status==='active' && existing[0].cohort_placement_id===context.id) return existing[0];
      throw new BadRequestException('This learner already has an enrollment. Use class placement or annual cohort promotion to move them.');
    }
    const result = await this.executeSql(input.school_id, `
        WITH selected_section AS (
          SELECT
            section.id::text,
            section.academic_level_id::text,
            section.academic_year_id::text
          FROM class_sections section
          WHERE section.tenant_id = $1
            AND section.id::text = $4::text
            AND EXISTS (SELECT 1 FROM academic_years year WHERE year.tenant_id=section.tenant_id
              AND year.id::text=section.academic_year_id::text AND year.name=$7)
            AND section.is_active = TRUE
            AND lower(COALESCE(section.status, 'active')) = 'active'
            AND section.archived_at IS NULL
            AND section.enrolment_open = TRUE
            AND section.academic_level_id IS NOT NULL
          LIMIT 1
        ),
        selected_stream AS (
          SELECT stream.id::text
          FROM class_streams stream
          JOIN selected_section section
            ON stream.class_section_id::text = section.id
          WHERE stream.tenant_id = $1
            AND NULLIF(btrim($6), '') IS NOT NULL
            AND stream.id::text = $8::text
            AND lower(btrim(stream.name)) = lower(btrim($6))
            AND stream.is_active = TRUE
            AND lower(COALESCE(stream.status, 'active')) = 'active'
            AND stream.archived_at IS NULL
          ORDER BY stream.created_at ASC
          LIMIT 1
        ),
        upserted_enrollment AS (
          INSERT INTO student_academic_enrollments (
            tenant_id,
            student_id,
            application_id,
            class_section_id,
            class_name,
            stream_name,
            academic_year,
            status
          )
          SELECT $1, $2::text, $3::text, section.id, $5, $6, $7, 'active'
          FROM selected_section section
          LEFT JOIN selected_stream stream ON TRUE
          WHERE $8::text IS NULL
             OR stream.id IS NOT NULL
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
            status,
            enrolled_at,
            created_at,
            updated_at
        ),
        upserted_assignment AS (
          INSERT INTO student_class_assignments (
            tenant_id,
            school_id,
            student_id,
            class_section_id,
            stream_id,
            academic_level_id,
            academic_year_id,
            status,
            assigned_by_user_id,
            updated_at
          )
          SELECT
            $1,
            $1,
            $2::text,
            section.id,
            stream.id,
            section.academic_level_id,
            section.academic_year_id,
            'active',
            NULLIF(current_setting('app.user_id', true), '')::uuid,
            NOW()
          FROM selected_section section
          LEFT JOIN selected_stream stream ON TRUE
          WHERE $8::text IS NULL
             OR stream.id IS NOT NULL
          ON CONFLICT (tenant_id, student_id, academic_year_id) WHERE status = 'active'
          DO UPDATE SET
            school_id = EXCLUDED.school_id,
            class_section_id = EXCLUDED.class_section_id,
            stream_id = EXCLUDED.stream_id,
            academic_level_id = EXCLUDED.academic_level_id,
            assigned_by_user_id = COALESCE(EXCLUDED.assigned_by_user_id, student_class_assignments.assigned_by_user_id),
            updated_at = NOW()
          RETURNING id
        )
        SELECT enrollment.*
        FROM upserted_enrollment enrollment
        CROSS JOIN (SELECT COUNT(*) FROM upserted_assignment) assignment_write
      `, [
        input.school_id,
        input.student_id,
        input.application_id,
        input.class_section_id ?? null,
        input.class_name,
        input.stream_name,
        input.academic_year,
        input.stream_id ?? null,
      ], transaction,
    );

    if(result[0]) {
      await transaction.$queryRawUnsafe(`UPDATE student_academic_enrollments SET cohort_id=$3,cohort_placement_id=$4,stream_id=$5
        WHERE tenant_id=$1 AND id=$2 RETURNING id`,input.school_id,result[0].id,context.cohort_id,context.id,context.stream_id);
      await transaction.$queryRawUnsafe(`UPDATE student_class_assignments SET cohort_id=$3,cohort_placement_id=$4
        WHERE tenant_id=$1 AND student_id=$2 AND class_section_id=$5 AND stream_id IS NOT DISTINCT FROM $6::text
          AND status='active' RETURNING id`,input.school_id,input.student_id,context.cohort_id,context.id,context.class_section_id,context.stream_id);
    }
    return result[0] ? {...result[0],cohort_id:context.cohort_id,cohort_placement_id:context.id,stream_id:context.stream_id} : null;
  }

  async archivePreviousStudentClassAssignments(tenantId: string, studentId: string, transaction: any) {
    return this.executeSql(tenantId, `
      UPDATE student_class_assignments
      SET status = 'archived', updated_at = NOW()
      WHERE tenant_id = $1 AND student_id::text = $2::text AND status = 'active'
      RETURNING id
    `, [tenantId, studentId], transaction);
  }

  async findActiveAcademicEnrollmentForUpdate(tenantId: string, studentId: string, transaction?: any) {
    const result = await this.executeSql(tenantId, `
        SELECT
          id,
          student_id::text,
          application_id::text,
          class_section_id::text,
          class_name,
          stream_name,
          academic_year,
          status,
          enrolled_at,
          created_at,
          updated_at
        FROM student_academic_enrollments
        WHERE tenant_id = $1
          AND student_id = $2::uuid
          AND status = 'active'
        ORDER BY enrolled_at DESC, created_at DESC
        LIMIT 1
        FOR UPDATE
      `, [tenantId, studentId], transaction,
    );

    return result[0] ?? null;
  }

  async completeStudentAcademicEnrollment(
    tenantId: string,
    enrollmentId: string,
    status: 'completed' | 'withdrawn',
    transaction?: any,
  ) {
    const result = await this.executeSql(tenantId, `
        UPDATE student_academic_enrollments
        SET status = $3,
            updated_at = NOW()
        WHERE tenant_id = $1
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
          status,
          enrolled_at,
          created_at,
          updated_at
      `, [tenantId, enrollmentId, status], transaction,
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
  }, transaction?: any) {
    const result = await this.executeSql(input.school_id, `
        INSERT INTO student_academic_lifecycle_events (
          tenant_id,
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
      ], transaction,
    );

    return result[0] ?? null;
  }

  async enrollStudentSubjectsAndTimetable(input: {
    school_id: string;
    student_id: string;
    academic_enrollment_id: string;
    class_section_id: string;
  }, transaction?: any) {
    const result = await this.executeSql(input.school_id, `
        WITH subject_rows AS (
          INSERT INTO student_subject_enrollments (tenant_id,student_id,academic_enrollment_id,
            subject_code,subject_name,academic_year_id,class_section_id,stream_id,subject_id,is_compulsory,status)
          SELECT offering.tenant_id,$2::text,$3::text,subject.code,subject.name,placement.academic_year_id,
            placement.class_section_id,placement.stream_id,offering.subject_id,offering.is_compulsory,'active'
          FROM student_academic_enrollments enrollment
          JOIN academic_cohort_placements placement ON placement.tenant_id=enrollment.tenant_id
            AND placement.id=enrollment.cohort_placement_id AND placement.status='active'
          JOIN class_subject_assignments offering ON offering.tenant_id=placement.tenant_id
            AND offering.cohort_placement_id=placement.id AND offering.status='active'
          JOIN subjects subject ON subject.tenant_id=offering.tenant_id AND subject.id::text=offering.subject_id::text AND subject.status='active'
          WHERE enrollment.tenant_id=$1 AND enrollment.id::text=$3 AND enrollment.student_id::text=$2
            AND enrollment.class_section_id::text=$4 AND enrollment.status='active'
            AND (offering.effective_from IS NULL OR offering.effective_from<=CURRENT_DATE)
            AND (offering.effective_to IS NULL OR offering.effective_to>=CURRENT_DATE)
          ON CONFLICT (tenant_id,student_id,academic_year_id,subject_id)
            WHERE status='active' AND academic_year_id IS NOT NULL AND subject_id IS NOT NULL
          DO UPDATE SET is_compulsory=EXCLUDED.is_compulsory,updated_at=NOW()
          RETURNING *
        ),
        timetable_rows AS (
          INSERT INTO student_timetable_enrollments (
            tenant_id,
            student_id,
            academic_enrollment_id,
            timetable_slot_id,
            day_of_week,
            starts_at,
            ends_at,
            subject_name,
            room_name,
            status
          )
          SELECT
            slot.tenant_id,
            $2::text,
            $3::text,
            slot.id,
            slot.day_of_week,
            slot.starts_at,
            slot.ends_at,
            COALESCE(offering.subject_name, slot.subject_name),
            slot.room_name,
            'active'
          FROM academic_timetable_slots slot
          LEFT JOIN academic_subject_offerings offering
            ON offering.tenant_id = slot.tenant_id
           AND offering.id = slot.subject_offering_id
          WHERE slot.tenant_id = $1
            AND slot.class_section_id = $4::text
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
            status,
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
      ], transaction,
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
        WHERE tenant_id = $1
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
            tenant_id,
            student_id,
            application_id,
            fee_structure_id,
            status,
            amount_minor,
            currency_code
          )
          VALUES ($1, $2, $3, $4, 'assigned', $8::bigint, $7)
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
            status,
            amount_minor::text,
            currency_code,
            assigned_at,
            created_at,
            updated_at
        ),
        invoice AS (
          INSERT INTO student_fee_invoices (
            tenant_id,
            assignment_id,
            student_id,
            invoice_number,
            status,
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
            $2,
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
            status,
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
    const conditions = ['allocation.tenant_id = $1', 'allocation.is_current = TRUE'];
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
          ON student.tenant_id = allocation.tenant_id
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
    const conditions = ['student.tenant_id = $1'];
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
          ON allocation.tenant_id = student.tenant_id
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
          WHERE tenant_id = $1
            AND id = $2::uuid
          LIMIT 1
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT id, document_type, original_file_name, verification_status, created_at
          FROM admission_documents
          WHERE tenant_id = $1
            AND student_id = $2::uuid
          ORDER BY created_at DESC
        `, [tenantId, studentId],
      ),
      this.executeSql(tenantId, `
          SELECT class_name, stream_name, dormitory_name, transport_route, effective_from
          FROM student_allocations
          WHERE tenant_id = $1
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
            status,
            enrolled_at,
            updated_at
          FROM student_academic_enrollments
          WHERE tenant_id = $1
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
            status,
            enrolled_at
          FROM student_subject_enrollments
          WHERE tenant_id = $1
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
            status
          FROM student_timetable_enrollments
          WHERE tenant_id = $1
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
          WHERE tenant_id = $1
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
            relationship,
            status,
            user_id::text,
            invitation_id::text,
            accepted_at,
            created_at,
            updated_at
          FROM student_guardians
          WHERE tenant_id = $1
            AND student_id = $2::uuid
          ORDER BY
            CASE status
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
            ON structure.tenant_id = assignment.tenant_id
           AND structure.id = assignment.fee_structure_id
          WHERE assignment.tenant_id = $1
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
          WHERE invoice.tenant_id = $1
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
          COALESCE(primary_guardian_name, parent_name) AS parent_name,
          COALESCE(primary_guardian_phone, parent_phone) AS parent_phone,
          parent_email,
          parent_occupation,
          relationship
        FROM (
          SELECT
            student.primary_guardian_name,
            student.primary_guardian_phone,
            NULL::text AS parent_name,
            NULL::text AS parent_phone,
            NULL::text AS parent_email,
            NULL::text AS parent_occupation,
            NULL::text AS relationship
          FROM students student
          WHERE student.tenant_id = $1

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
          WHERE application.tenant_id = $1
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
          tenant_id,
          student_id,
          application_id,
          transfer_type,
          school_name,
          reason,
          requested_on,
          status,
          notes
        )
        VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::date, $8, $9)
        RETURNING id, transfer_type, school_name, status
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
    const conditions = ['tenant_id = $1'];
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
        SELECT id, student_id, application_id, transfer_type, school_name, reason, requested_on, status, notes
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
          SELECT status, COUNT(*)::int AS total
          FROM admission_applications
          WHERE tenant_id = $1
          GROUP BY status
          ORDER BY total DESC, status ASC
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT class_name, COUNT(*)::int AS total
          FROM student_allocations
          WHERE tenant_id = $1
            AND is_current = TRUE
          GROUP BY class_name
          ORDER BY total DESC, class_name ASC
        `, [tenantId],
      ),
      this.executeSql(tenantId, `
          SELECT verification_status, COUNT(*)::int AS total
          FROM admission_documents
          WHERE tenant_id = $1
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
