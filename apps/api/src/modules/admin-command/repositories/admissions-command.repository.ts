import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class AdmissionsCommandRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async executeSql<T = any>(tenantId: string, query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    return this.prisma.executeWithTenant(tenantId, null, async (tx: any) => {
      const result = await tx.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
      return { rows: arr, rowCount: arr.length };
    });
  }

  async getOverview(tenantId: string) {
    const enquiries = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_enquiries WHERE tenant_id = $1`, [tenantId]);
    const applicationsPending = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'pending'`, [tenantId]);
    const documentsMissing = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_documents WHERE tenant_id = $1 AND verification_status = 'pending'`, [tenantId]);
    const interviewsScheduled = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_interviews WHERE tenant_id = $1 AND status = 'scheduled'`, [tenantId]);
    const admissionLettersPending = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1 AND offer_status = 'pending'`, [tenantId]);

    const recentActivity = await this.executeSql(tenantId, `
      (SELECT id::text, 'Application Submitted' as action, full_name as applicant, created_at as time FROM admission_applications WHERE tenant_id = $1)
      UNION ALL
      (SELECT id::text, 'Interview Scheduled' as action, '' as applicant, created_at as time FROM admission_interviews WHERE tenant_id = $1)
      ORDER BY time DESC LIMIT 5
    `, [tenantId]);

    return {
      enquiries: Number(enquiries.rows[0]?.count || 0),
      applicationsPending: Number(applicationsPending.rows[0]?.count || 0),
      documentsMissing: Number(documentsMissing.rows[0]?.count || 0),
      interviewsScheduled: Number(interviewsScheduled.rows[0]?.count || 0),
      admissionLettersPending: Number(admissionLettersPending.rows[0]?.count || 0),
      recentActivity: recentActivity.rows,
    };
  }

  async getEnquiries(tenantId: string) {
    const total = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_enquiries WHERE tenant_id = $1`, [tenantId]);
    const walkIns = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_enquiries WHERE tenant_id = $1 AND enquiry_source = 'Walk-in'`, [tenantId]);
    const website = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_enquiries WHERE tenant_id = $1 AND enquiry_source = 'Website'`, [tenantId]);
    const phone = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_enquiries WHERE tenant_id = $1 AND enquiry_source = 'Phone'`, [tenantId]);
    
    const recent = await this.executeSql(tenantId, `
      SELECT id::text, CONCAT(student_first_name, ' ', student_last_name) as name, enquiry_source as source, status, created_at as date 
      FROM admission_enquiries 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [tenantId]);

    return {
      total: Number(total.rows[0]?.count || 0),
      walkIns: Number(walkIns.rows[0]?.count || 0),
      website: Number(website.rows[0]?.count || 0),
      phone: Number(phone.rows[0]?.count || 0),
      recent: recent.rows,
    };
  }

  async getApplications(tenantId: string) {
    const total = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1`, [tenantId]);
    const pendingReview = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'pending'`, [tenantId]);
    const underReview = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'reviewing'`, [tenantId]);
    const approved = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'approved'`, [tenantId]);
    const rejected = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'rejected'`, [tenantId]);

    const recent = await this.executeSql(tenantId, `
      SELECT id::text, full_name as name, class_applying as class, parent_name, parent_phone, previous_school, status, created_at as date 
      FROM admission_applications 
      WHERE tenant_id = $1 
      ORDER BY created_at DESC 
      LIMIT 10
    `, [tenantId]);

    return {
      total: Number(total.rows[0]?.count || 0),
      pendingReview: Number(pendingReview.rows[0]?.count || 0),
      underReview: Number(underReview.rows[0]?.count || 0),
      approved: Number(approved.rows[0]?.count || 0),
      rejected: Number(rejected.rows[0]?.count || 0),
      metrics: {
        total: Number(total.rows[0]?.count || 0),
        pending: Number(pendingReview.rows[0]?.count || 0),
        approved: Number(approved.rows[0]?.count || 0),
        rejected: Number(rejected.rows[0]?.count || 0),
      },
      applicationsList: recent.rows.map((row: any) => ({
        id: row.id,
        student_name: row.name,
        guardian_name: row.parent_name ?? '',
        phone: row.parent_phone ?? '',
        grade_applied: row.class ?? '',
        previous_school: row.previous_school ?? '',
        status: this.formatStatus(row.status),
        submitted_at: this.formatDate(row.date),
      })),
      recent: recent.rows,
    };
  }

  async getApplicantProfiles(tenantId: string) {
    const totalProfiles = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1`, [tenantId]);
    // Simplification for incomplete: applications without a previous school or birth certificate.
    const incomplete = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND (previous_school IS NULL OR birth_certificate_number IS NULL)`, [tenantId]);
    const readyForReview = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'pending' AND previous_school IS NOT NULL`, [tenantId]);

    return {
      totalProfiles: Number(totalProfiles.rows[0]?.count || 0),
      incomplete: Number(incomplete.rows[0]?.count || 0),
      readyForReview: Number(readyForReview.rows[0]?.count || 0),
    };
  }

  async getDocuments(tenantId: string) {
    const missing = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND id NOT IN (SELECT application_id FROM admission_documents WHERE tenant_id = $1 AND application_id IS NOT NULL)`, [tenantId]);
    const pendingVerification = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_documents WHERE tenant_id = $1 AND verification_status = 'pending'`, [tenantId]);
    const verified = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_documents WHERE tenant_id = $1 AND verification_status = 'verified'`, [tenantId]);

    return {
      missing: Number(missing.rows[0]?.count || 0),
      pendingVerification: Number(pendingVerification.rows[0]?.count || 0),
      verified: Number(verified.rows[0]?.count || 0),
      metrics: {
        total_documents: Number(pendingVerification.rows[0]?.count || 0) + Number(verified.rows[0]?.count || 0),
        verified: Number(verified.rows[0]?.count || 0),
        pending_verification: Number(pendingVerification.rows[0]?.count || 0),
        missing: Number(missing.rows[0]?.count || 0),
      },
      documentsList: await this.listAdmissionDocuments(tenantId),
    };
  }

  async getInterviews(tenantId: string) {
    const scheduledToday = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_interviews WHERE tenant_id = $1 AND interview_date = CURRENT_DATE AND status = 'scheduled'`, [tenantId]);
    const upcoming = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_interviews WHERE tenant_id = $1 AND interview_date > CURRENT_DATE AND status = 'scheduled'`, [tenantId]);
    const completed = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_interviews WHERE tenant_id = $1 AND status = 'completed'`, [tenantId]);
    const needsRescheduling = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_interviews WHERE tenant_id = $1 AND status = 'needs_rescheduling'`, [tenantId]);

    return {
      scheduledToday: Number(scheduledToday.rows[0]?.count || 0),
      upcoming: Number(upcoming.rows[0]?.count || 0),
      completed: Number(completed.rows[0]?.count || 0),
      needsRescheduling: Number(needsRescheduling.rows[0]?.count || 0),
      metrics: {
        total_scheduled: Number(scheduledToday.rows[0]?.count || 0) + Number(upcoming.rows[0]?.count || 0) + Number(completed.rows[0]?.count || 0),
        completed: Number(completed.rows[0]?.count || 0),
        pending: Number(scheduledToday.rows[0]?.count || 0) + Number(upcoming.rows[0]?.count || 0),
        passed: await this.countInterviewRecommendation(tenantId, 'passed'),
        failed: await this.countInterviewRecommendation(tenantId, 'failed'),
      },
      interviewsList: await this.listAdmissionInterviews(tenantId),
    };
  }

  async getSelection(tenantId: string) {
    const offersMade = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1`, [tenantId]);
    const offersAccepted = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1 AND offer_status = 'accepted'`, [tenantId]);
    const offersDeclined = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1 AND offer_status = 'declined'`, [tenantId]);
    const pendingResponse = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1 AND offer_status = 'pending'`, [tenantId]);

    return {
      offersMade: Number(offersMade.rows[0]?.count || 0),
      offersAccepted: Number(offersAccepted.rows[0]?.count || 0),
      offersDeclined: Number(offersDeclined.rows[0]?.count || 0),
      pendingResponse: Number(pendingResponse.rows[0]?.count || 0),
    };
  }

  async getFeeClearance(tenantId: string) {
    const cleared = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1 AND finance_cleared = TRUE`, [tenantId]);
    const pending = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_offers WHERE tenant_id = $1 AND finance_cleared = FALSE`, [tenantId]);
    
    const deposits = await this.executeSql(tenantId, `SELECT SUM(required_deposit) as expected, SUM(deposit_paid) as collected FROM admission_offers WHERE tenant_id = $1`, [tenantId]);

    return {
      cleared: Number(cleared.rows[0]?.count || 0),
      pending: Number(pending.rows[0]?.count || 0),
      totalExpected: Number(deposits.rows[0]?.expected || 0),
      collected: Number(deposits.rows[0]?.collected || 0),
    };
  }

  async getEnrolment(tenantId: string) {
    const enrolled = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_academic_enrollments WHERE tenant_id = $1`, [tenantId]);
    const admissionNumbersGenerated = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND admission_number IS NOT NULL`, [tenantId]);
    const pendingEnrolment = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_applications WHERE tenant_id = $1 AND status = 'approved' AND admitted_student_id IS NULL`, [tenantId]);

    return {
      enrolled: Number(enrolled.rows[0]?.count || 0),
      admissionNumbersGenerated: Number(admissionNumbersGenerated.rows[0]?.count || 0),
      pendingEnrolment: Number(pendingEnrolment.rows[0]?.count || 0),
    };
  }

  async getClassPlacement(tenantId: string) {
    const placed = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_allocations WHERE tenant_id = $1 AND class_name IS NOT NULL`, [tenantId]);
    const unplaced = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND id NOT IN (SELECT student_id FROM student_allocations WHERE tenant_id = $1 AND is_current = TRUE)`, [tenantId]);
    
    return {
      placed: Number(placed.rows[0]?.count || 0),
      unplaced: Number(unplaced.rows[0]?.count || 0),
      capacityAlerts: 0,
      metrics: {
        total_to_place: Number(placed.rows[0]?.count || 0) + Number(unplaced.rows[0]?.count || 0),
        placed: Number(placed.rows[0]?.count || 0),
        unplaced: Number(unplaced.rows[0]?.count || 0),
      },
      placementsList: await this.listClassPlacements(tenantId),
    };
  }

  async getParents(tenantId: string) {
    const onboarded = await this.executeSql(tenantId, `SELECT COUNT(DISTINCT primary_guardian_phone) as count FROM students WHERE tenant_id = $1 AND primary_guardian_phone IS NOT NULL`, [tenantId]);
    const missingContact = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND primary_guardian_phone IS NULL`, [tenantId]);
    const portalInvitesSent = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_guardians WHERE tenant_id = $1 AND status = 'invited'`, [tenantId]);

    return {
      onboarded: Number(onboarded.rows[0]?.count || 0),
      missingContact: Number(missingContact.rows[0]?.count || 0),
      portalInvitesSent: Number(portalInvitesSent.rows[0]?.count || 0),
      metrics: {
        total_students: Number(onboarded.rows[0]?.count || 0) + Number(missingContact.rows[0]?.count || 0),
        linked: Number(onboarded.rows[0]?.count || 0),
        unlinked: Number(missingContact.rows[0]?.count || 0),
        invitations_sent: Number(portalInvitesSent.rows[0]?.count || 0),
      },
      parentLinksList: await this.listParentLinks(tenantId),
    };
  }

  async getTransfers(tenantId: string) {
    const incoming = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_transfer_records WHERE tenant_id = $1 AND transfer_type = 'incoming'`, [tenantId]);
    const readmissions = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_transfer_records WHERE tenant_id = $1 AND transfer_type = 'readmission'`, [tenantId]);
    const processing = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_transfer_records WHERE tenant_id = $1 AND status = 'pending'`, [tenantId]);

    return {
      incoming: Number(incoming.rows[0]?.count || 0),
      readmissions: Number(readmissions.rows[0]?.count || 0),
      processing: Number(processing.rows[0]?.count || 0),
    };
  }

  async getCommunication(tenantId: string) {
    return {
      smsSent: 0,
      emailsSent: 0,
      failedDeliveries: 0,
    };
  }

  async getAppointments(tenantId: string) {
    const today = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_appointments WHERE tenant_id = $1 AND appointment_date = CURRENT_DATE`, [tenantId]);
    const upcoming = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_appointments WHERE tenant_id = $1 AND appointment_date > CURRENT_DATE`, [tenantId]);
    const completed = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_appointments WHERE tenant_id = $1 AND status = 'completed'`, [tenantId]);
    const cancelled = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_appointments WHERE tenant_id = $1 AND status = 'cancelled'`, [tenantId]);

    return {
      today: Number(today.rows[0]?.count || 0),
      upcoming: Number(upcoming.rows[0]?.count || 0),
      completed: Number(completed.rows[0]?.count || 0),
      cancelled: Number(cancelled.rows[0]?.count || 0),
    };
  }

  async getImports(tenantId: string) {
    return {
      recentUploads: 0,
      errors: 0,
      rowsProcessed: 0,
    };
  }

  async getReports(tenantId: string) {
    const reports = await this.executeSql(tenantId, `
      SELECT id::text, title, created_at::text AS generated_at, format AS type, 'Generated' AS status
      FROM report_snapshots
      WHERE tenant_id = $1
        AND module = 'admissions'
      ORDER BY created_at DESC
      LIMIT 50
    `, [tenantId]);

    return {
      generatedToday: reports.rows.filter((row: any) => String(row.generated_at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length,
      scheduled: 0,
      availableDownloads: reports.rows.length,
      metrics: {
        reports_generated: reports.rows.length,
      },
      reportsList: reports.rows,
    };
  }

  async getTasks(tenantId: string) {
    const dueToday = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_tasks WHERE tenant_id = $1 AND due_date = CURRENT_DATE AND status != 'completed'`, [tenantId]);
    const overdue = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_tasks WHERE tenant_id = $1 AND due_date < CURRENT_DATE AND status != 'completed'`, [tenantId]);
    const completed = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_tasks WHERE tenant_id = $1 AND status = 'completed'`, [tenantId]);

    return {
      dueToday: Number(dueToday.rows[0]?.count || 0),
      overdue: Number(overdue.rows[0]?.count || 0),
      completed: Number(completed.rows[0]?.count || 0),
    };
  }

  async getTemplates(tenantId: string) {
    const active = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_templates WHERE tenant_id = $1 AND is_active = TRUE`, [tenantId]);
    const drafts = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM admission_templates WHERE tenant_id = $1 AND is_active = FALSE`, [tenantId]);

    return {
      active: Number(active.rows[0]?.count || 0),
      drafts: Number(drafts.rows[0]?.count || 0),
      recentUpdates: 0,
    };
  }

  async getAdmissionsList(tenantId: string) {
    const applications = await this.executeSql(tenantId, `
      SELECT application.id::text,
             application.full_name,
             application.created_at,
             application.class_applying,
             application.parent_name,
             application.parent_phone,
             application.status,
             student.admission_number
      FROM admission_applications application
      LEFT JOIN students student
        ON student.tenant_id = application.tenant_id
       AND student.id::text = application.admitted_student_id
      WHERE application.tenant_id = $1
      ORDER BY application.created_at DESC
      LIMIT 100
    `, [tenantId]);
    const admitted = applications.rows.filter((row: any) => ['registered', 'admitted'].includes(String(row.status).toLowerCase())).length;
    const pending = applications.rows.filter((row: any) => ['pending', 'reviewing', 'interview'].includes(String(row.status).toLowerCase())).length;
    const rejected = applications.rows.filter((row: any) => String(row.status).toLowerCase() === 'rejected').length;

    return {
      metrics: {
        total_applicants: applications.rows.length,
        admitted,
        pending,
        rejected,
      },
      admissionsList: applications.rows.map((row: any) => ({
        id: row.id,
        student_name: row.full_name,
        application_date: this.formatDate(row.created_at),
        class_applied: row.class_applying,
        parent_name: row.parent_name,
        phone: row.parent_phone,
        status: this.formatStatus(row.status),
        admission_number: row.admission_number ?? '',
      })),
    };
  }

  async createApplication(tenantId: string, body: any) {
    const fullName = this.required(body.full_name ?? body.student_name, 'Student name');
    const result = await this.executeSql(tenantId, `
      INSERT INTO admission_applications (
        tenant_id, application_number, full_name, date_of_birth, gender, birth_certificate_number,
        nationality, previous_school, kcpe_results, cbc_level, nemis_upi, class_applying,
        parent_name, parent_phone, parent_email, parent_occupation, relationship, allergies,
        conditions, emergency_contact, status, interview_date, review_notes
      )
      VALUES (
        $1, $2, $3, $4::date, $5, $6, COALESCE($7, 'Kenyan'), $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18, $19, $20, 'pending', $21::date, $22
      )
      RETURNING *
    `, [
      tenantId,
      `APP-${Date.now()}`,
      fullName,
      String(body.date_of_birth ?? body.dateOfBirth ?? '').trim() || null,
      this.required(body.gender, 'Gender'),
      this.required(body.birth_certificate_number ?? body.birthCertificateNumber, 'Birth certificate number'),
      body.nationality ?? 'Kenyan',
      body.previous_school ?? null,
      body.kcpe_results ?? null,
      body.cbc_level ?? null,
      body.nemis_upi ?? null,
      this.required(body.class_applying ?? body.grade_applied ?? body.classApplied, 'Class applying'),
      this.required(body.parent_name ?? body.guardian_name, 'Parent or guardian name'),
      this.required(body.parent_phone ?? body.phone, 'Parent or guardian phone'),
      body.parent_email ?? null,
      body.parent_occupation ?? null,
      body.relationship ?? 'guardian',
      body.allergies ?? null,
      body.conditions ?? null,
      body.emergency_contact ?? null,
      body.interview_date ?? null,
      body.review_notes ?? null,
    ]);
    return result.rows[0];
  }

  async updateApplicationStatus(tenantId: string, applicationId: string, status: string, notes?: string | null) {
    const normalizedStatus = this.normalizeApplicationStatus(status);
    const result = await this.executeSql(tenantId, `
      UPDATE admission_applications
      SET status = $3,
          approved_at = CASE WHEN $3 = 'approved' THEN COALESCE(approved_at, NOW()) ELSE approved_at END,
          review_notes = COALESCE($4, review_notes),
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2::uuid
      RETURNING *
    `, [tenantId, applicationId, normalizedStatus, notes ?? null]);
    return result.rows[0] ?? null;
  }

  async scheduleInterview(tenantId: string, body: any) {
    const applicationId = this.required(body.application_id ?? body.applicationId, 'Application');
    const result = await this.executeSql(tenantId, `
      INSERT INTO admission_interviews (
        tenant_id, application_id, interview_date, start_time, end_time, location,
        interviewer_user_id, assessment_type, status
      )
      VALUES ($1, $2::uuid, $3::date, $4, $5, $6, $7::uuid, $8, 'scheduled')
      RETURNING *
    `, [
      tenantId,
      applicationId,
      this.required(body.interview_date ?? body.scheduled_date, 'Interview date'),
      this.required(body.start_time ?? body.scheduled_time, 'Start time'),
      body.end_time ?? body.ends_at ?? '17:00',
      body.location ?? null,
      body.interviewer_user_id ?? null,
      body.assessment_type ?? null,
    ]);
    await this.updateApplicationStatus(tenantId, applicationId, 'interview', 'Interview scheduled');
    return result.rows[0];
  }

  async recordInterviewOutcome(tenantId: string, interviewId: string, body: any) {
    const outcome = this.normalizeOutcome(body.outcome ?? body.recommendation);
    const result = await this.executeSql(tenantId, `
      UPDATE admission_interviews
      SET status = 'completed',
          recommendation = $3,
          interviewer_comment = COALESCE($4, interviewer_comment),
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2::uuid
      RETURNING *
    `, [tenantId, interviewId, outcome, body.notes ?? body.interviewer_comment ?? null]);
    return result.rows[0] ?? null;
  }

  async verifyDocument(tenantId: string, documentId: string, userId: string | null) {
    const result = await this.executeSql(tenantId, `
      UPDATE admission_documents
      SET verification_status = 'verified',
          verified_by_user_id = $3::uuid,
          verified_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2::uuid
      RETURNING *
    `, [tenantId, documentId, userId]);
    return result.rows[0] ?? null;
  }

  async requestDocument(tenantId: string, body: any) {
    const applicationId = String(body.application_id ?? body.document_id ?? '').startsWith('missing:')
      ? String(body.document_id).split(':')[1]
      : body.application_id ?? null;
    const result = await this.executeSql(tenantId, `
      INSERT INTO admission_tasks (tenant_id, application_id, task_title, task_description, due_date, priority, status)
      VALUES ($1, $2::uuid, $3, $4, CURRENT_DATE + INTERVAL '7 days', 'high', 'pending')
      RETURNING *
    `, [
      tenantId,
      applicationId,
      `Request ${this.required(body.document_type, 'Document type')}`,
      `Request ${body.document_type} from ${body.student_name ?? 'applicant guardian'}`,
    ]);
    return result.rows[0];
  }

  async assignClassPlacement(tenantId: string, body: any) {
    const studentId = this.required(body.student_id ?? body.studentId, 'Student');
    const student = await this.executeSql(tenantId, `
      SELECT id::text, first_name, last_name, current_class_id, current_stream_id, metadata
      FROM students
      WHERE tenant_id = $1
        AND id = $2::uuid
      LIMIT 1
    `, [tenantId, studentId]);
    const row: any = student.rows[0];
    if (!row) return null;
    const className = body.class_name ?? body.assigned_class ?? row.current_class_id ?? row.metadata?.admissions?.class_applying;
    const streamName = body.stream_name ?? body.assigned_stream ?? row.current_stream_id ?? 'Default';
    await this.executeSql(tenantId, `
      UPDATE student_allocations
      SET is_current = FALSE, updated_at = NOW()
      WHERE tenant_id = $1 AND student_id = $2::uuid AND is_current = TRUE;
    `, [tenantId, studentId]);
    const result = await this.executeSql(tenantId, `
      INSERT INTO student_allocations (
        tenant_id, student_id, class_name, stream_name, dormitory_name, transport_route, effective_from, is_current, notes
      )
      VALUES ($1, $2::uuid, $3, $4, $5, $6, CURRENT_DATE, TRUE, $7)
      RETURNING *
    `, [
      tenantId,
      studentId,
      this.required(className, 'Class name'),
      this.required(streamName, 'Stream name'),
      body.dormitory_name ?? null,
      body.transport_route ?? null,
      body.notes ?? 'Placed from admissions dashboard',
    ]);
    return result.rows[result.rows.length - 1] ?? null;
  }

  async linkParent(tenantId: string, body: any) {
    const studentId = this.required(body.student_id ?? body.id, 'Student');
    const student = await this.executeSql(tenantId, `
      SELECT id::text, first_name, last_name, primary_guardian_name, primary_guardian_phone, metadata
      FROM students
      WHERE tenant_id = $1 AND id = $2::uuid
      LIMIT 1
    `, [tenantId, studentId]);
    const row: any = student.rows[0];
    if (!row) return null;
    const metadataGuardian = row.metadata?.admissions?.guardian ?? {};
    const email = this.required(body.parent_email ?? metadataGuardian.parent_email, 'Parent email');
    const result = await this.executeSql(tenantId, `
      INSERT INTO student_guardians (
        tenant_id, student_id, display_name, email, phone, relationship, is_primary, status
      )
      VALUES ($1, $2::uuid, $3, lower($4), $5, $6, TRUE, 'invited')
      ON CONFLICT (tenant_id, student_id, (lower(email)))
      DO UPDATE SET display_name = EXCLUDED.display_name,
                    phone = EXCLUDED.phone,
                    relationship = EXCLUDED.relationship,
                    status = CASE WHEN student_guardians.user_id IS NULL THEN 'invited' ELSE 'active' END,
                    updated_at = NOW()
      RETURNING *
    `, [
      tenantId,
      studentId,
      body.parent_name ?? row.primary_guardian_name ?? metadataGuardian.parent_name,
      email,
      body.parent_phone ?? row.primary_guardian_phone ?? '',
      body.relationship ?? metadataGuardian.relationship ?? 'guardian',
    ]);
    return result.rows[0] ?? null;
  }

  async sendParentInvitation(tenantId: string, linkId: string) {
    const result = await this.executeSql(tenantId, `
      UPDATE student_guardians
      SET status = CASE WHEN user_id IS NULL THEN 'invited' ELSE 'active' END,
          updated_at = NOW()
      WHERE tenant_id = $1
        AND id = $2::uuid
      RETURNING *
    `, [tenantId, linkId]);
    return result.rows[0] ?? null;
  }

  private async listAdmissionDocuments(tenantId: string) {
    const documents = await this.executeSql(tenantId, `
      SELECT document.id::text,
             COALESCE(application.full_name, CONCAT(student.first_name, ' ', student.last_name)) AS student_name,
             document.document_type,
             document.original_file_name AS file_name,
             document.verification_status AS status,
             document.created_at,
             document.verified_by_user_id::text AS verified_by
      FROM admission_documents document
      LEFT JOIN admission_applications application ON application.tenant_id = document.tenant_id AND application.id = document.application_id
      LEFT JOIN students student ON student.tenant_id = document.tenant_id AND student.id = document.student_id
      WHERE document.tenant_id = $1
      ORDER BY document.created_at DESC
      LIMIT 75
    `, [tenantId]);
    const missing = await this.executeSql(tenantId, `
      SELECT application.id::text AS application_id, application.full_name
      FROM admission_applications application
      WHERE application.tenant_id = $1
        AND NOT EXISTS (
          SELECT 1 FROM admission_documents document
          WHERE document.tenant_id = application.tenant_id
            AND document.application_id = application.id
        )
      ORDER BY application.created_at DESC
      LIMIT 25
    `, [tenantId]);
    return [
      ...documents.rows.map((row: any) => ({
        id: row.id,
        student_name: row.student_name,
        document_type: row.document_type,
        file_name: row.file_name,
        status: this.formatStatus(row.status),
        uploaded_at: this.formatDate(row.created_at),
        verified_by: row.verified_by ?? '',
      })),
      ...missing.rows.map((row: any) => ({
        id: `missing:${row.application_id}:admission-documents`,
        student_name: row.full_name,
        document_type: 'Admission documents',
        file_name: '',
        status: 'Missing',
        uploaded_at: '',
        verified_by: '',
      })),
    ];
  }

  private async listAdmissionInterviews(tenantId: string) {
    const result = await this.executeSql(tenantId, `
      SELECT interview.id::text,
             application.full_name,
             application.class_applying,
             interview.interviewer_user_id::text AS interviewer,
             interview.interview_date,
             interview.start_time,
             interview.end_time,
             interview.status,
             interview.recommendation
      FROM admission_interviews interview
      INNER JOIN admission_applications application ON application.tenant_id = interview.tenant_id AND application.id = interview.application_id
      WHERE interview.tenant_id = $1
      ORDER BY interview.interview_date DESC, interview.start_time ASC
      LIMIT 100
    `, [tenantId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      student_name: row.full_name,
      grade_applied: row.class_applying,
      interviewer: row.interviewer ?? 'Admissions panel',
      scheduled_date: this.formatDate(row.interview_date),
      scheduled_time: [row.start_time, row.end_time].filter(Boolean).join(' - '),
      status: this.formatStatus(row.status),
      outcome: this.formatStatus(row.recommendation ?? 'pending'),
    }));
  }

  private async listClassPlacements(tenantId: string) {
    const result = await this.executeSql(tenantId, `
      SELECT student.id::text,
             CONCAT(student.first_name, ' ', student.last_name) AS student_name,
             COALESCE(student.current_class_id, student.metadata #>> '{admissions,class_applying}', '') AS grade_applied,
             allocation.class_name,
             allocation.stream_name,
             allocation.id AS allocation_id
      FROM students student
      LEFT JOIN student_allocations allocation
        ON allocation.tenant_id = student.tenant_id
       AND allocation.student_id = student.id
       AND allocation.is_current = TRUE
      WHERE student.tenant_id = $1
      ORDER BY student.created_at DESC
      LIMIT 100
    `, [tenantId]);
    return result.rows.map((row: any) => ({
      id: row.id,
      student_name: row.student_name,
      grade_applied: row.grade_applied,
      assigned_class: row.class_name ?? '',
      assigned_stream: row.stream_name ?? '',
      status: row.allocation_id ? 'Placed' : 'Unplaced',
    }));
  }

  private async listParentLinks(tenantId: string) {
    const result = await this.executeSql(tenantId, `
      SELECT COALESCE(link.id::text, student.id::text) AS id,
             student.id::text AS student_id,
             CONCAT(student.first_name, ' ', student.last_name) AS student_name,
             COALESCE(allocation.class_name, student.current_class_id, '') AS grade,
             COALESCE(link.display_name, student.primary_guardian_name, student.metadata #>> '{admissions,guardian,parent_name}', '') AS parent_name,
             COALESCE(link.phone, student.primary_guardian_phone, '') AS parent_phone,
             COALESCE(link.email, student.metadata #>> '{admissions,guardian,parent_email}', '') AS parent_email,
             COALESCE(link.relationship, student.metadata #>> '{admissions,guardian,relationship}', '') AS relationship,
             COALESCE(link.status, 'unlinked') AS link_status,
             link.id IS NOT NULL AND link.status IN ('invited', 'active') AS invitation_sent
      FROM students student
      LEFT JOIN student_guardians link ON link.tenant_id = student.tenant_id AND link.student_id = student.id AND link.is_primary = TRUE
      LEFT JOIN student_allocations allocation ON allocation.tenant_id = student.tenant_id AND allocation.student_id = student.id AND allocation.is_current = TRUE
      WHERE student.tenant_id = $1
      ORDER BY student.created_at DESC
      LIMIT 100
    `, [tenantId]);
    return result.rows.map((row: any) => ({
      ...row,
      link_status: this.formatStatus(row.link_status),
    }));
  }

  private async countInterviewRecommendation(tenantId: string, recommendation: string) {
    const result = await this.executeSql(tenantId, `
      SELECT COUNT(*) AS count
      FROM admission_interviews
      WHERE tenant_id = $1
        AND lower(COALESCE(recommendation, '')) = $2
    `, [tenantId, recommendation]);
    return Number(result.rows[0]?.count ?? 0);
  }

  async admitStudent(tenantId: string, applicationId: string, userId: string) {
    return this.prisma.executeWithTenant(tenantId, userId, async (tx: any) => {
      const query = async <T = any>(sql: string, params: any[] = []): Promise<T[]> => {
        const result = await tx.$queryRawUnsafe(sql, ...params);
        return Array.isArray(result) ? result : [result];
      };

      const applications = await query<any>(`
        SELECT id::text,
               application_number,
               full_name,
               date_of_birth,
               gender,
               birth_certificate_number,
               nationality,
               class_applying,
               parent_name,
               parent_phone,
               parent_email,
               relationship,
               status,
               admitted_student_id
        FROM admission_applications
        WHERE tenant_id = $1
          AND id = $2::uuid
        LIMIT 1
      `, [tenantId, applicationId]);
      const application = applications[0];
      if (!application) {
        return null;
      }

      const normalizedStatus = String(application.status ?? '').trim().toLowerCase();
      if (['registered', 'admitted'].includes(normalizedStatus) && application.admitted_student_id) {
        return this.readExistingAdmission(query, tenantId, application);
      }
      if (normalizedStatus !== 'approved') {
        throw new Error('Application must be approved before enrolment');
      }

      const admissionNumberSeed = createHash('sha256')
        .update(`${tenantId}:${application.id}`)
        .digest('hex')
        .slice(0, 8)
        .toUpperCase();
      const admissionNumber = `ADM-${new Date().getFullYear()}-${admissionNumberSeed}`;
      const name = this.splitName(application.full_name);
      const streamName = 'Default';
      const academicYear = String(new Date().getFullYear());
      const metadata = {
        admissions: {
          application_id: application.id,
          application_number: application.application_number,
          class_applying: application.class_applying,
          guardian: {
            parent_name: application.parent_name,
            parent_phone: application.parent_phone,
            parent_email: application.parent_email,
            relationship: application.relationship,
          },
        },
      };
      const actorUserId = this.uuidOrNull(userId);

      const students = await query<any>(`
        INSERT INTO students (
          tenant_id,
          school_id,
          admission_number,
          first_name,
          last_name,
          middle_name,
          status,
          student_status,
          date_of_birth,
          gender,
          birth_certificate_number,
          nationality,
          admission_date,
          current_class_id,
          current_stream_id,
          boarding_status,
          primary_guardian_name,
          primary_guardian_phone,
          metadata,
          created_by_user_id
        )
        VALUES (
          $1,
          $1,
          $2,
          $3,
          $4,
          $5,
          'active',
          'ACTIVE',
          $6::date,
          $7,
          $8,
          COALESCE($9, 'Kenyan'),
          CURRENT_DATE,
          $10,
          $11,
          'DAY_SCHOLAR',
          $12,
          $13,
          $14::jsonb,
          $15::uuid
        )
        ON CONFLICT (tenant_id, admission_number)
        DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          middle_name = EXCLUDED.middle_name,
          current_class_id = EXCLUDED.current_class_id,
          current_stream_id = EXCLUDED.current_stream_id,
          primary_guardian_name = EXCLUDED.primary_guardian_name,
          primary_guardian_phone = EXCLUDED.primary_guardian_phone,
          metadata = students.metadata || EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id::text, tenant_id, admission_number, first_name, last_name, middle_name, status
      `, [
        tenantId,
        admissionNumber,
        name.firstName,
        name.lastName,
        name.middleName,
        application.date_of_birth,
        this.normalizeGender(application.gender),
        application.birth_certificate_number,
        application.nationality ?? 'Kenyan',
        application.class_applying,
        streamName,
        application.parent_name,
        application.parent_phone,
        JSON.stringify(metadata),
        actorUserId,
      ]);
      const student = students[0];

      await query(`
        UPDATE student_allocations
        SET is_current = FALSE,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND student_id = $2::uuid
          AND is_current = TRUE
      `, [tenantId, student.id]);

      const allocations = await query<any>(`
        INSERT INTO student_allocations (
          tenant_id,
          student_id,
          class_name,
          stream_name,
          effective_from,
          is_current,
          notes
        )
        VALUES ($1, $2::uuid, $3, $4, CURRENT_DATE, TRUE, $5)
        RETURNING id::text, student_id::text, class_name, stream_name, effective_from, is_current
      `, [
        tenantId,
        student.id,
        application.class_applying,
        streamName,
        `Admitted from application ${application.application_number}`,
      ]);

      const enrollments = await query<any>(`
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
        VALUES ($1, $2::uuid, $3::uuid, NULL, $4, $5, $6, 'active')
        ON CONFLICT (tenant_id, student_id, academic_year)
        DO UPDATE SET
          application_id = EXCLUDED.application_id,
          class_name = EXCLUDED.class_name,
          stream_name = EXCLUDED.stream_name,
          status = 'active',
          updated_at = NOW()
        RETURNING id::text, student_id::text, application_id::text, class_name, stream_name, academic_year, status
      `, [tenantId, student.id, application.id, application.class_applying, streamName, academicYear]);

      const guardianLink = application.parent_email
        ? (await query<any>(`
            INSERT INTO student_guardians (
              tenant_id,
              student_id,
              display_name,
              email,
              phone,
              relationship,
              is_primary,
              status
            )
            VALUES ($1, $2::uuid, $3, lower($4), $5, $6, TRUE, 'invited')
            ON CONFLICT (tenant_id, student_id, (lower(email)))
            DO UPDATE SET
              display_name = EXCLUDED.display_name,
              phone = EXCLUDED.phone,
              relationship = EXCLUDED.relationship,
              is_primary = TRUE,
              status = CASE WHEN student_guardians.user_id IS NULL THEN 'invited' ELSE 'active' END,
              updated_at = NOW()
            RETURNING id::text, student_id::text, lower(email) AS email, status
          `, [
            tenantId,
            student.id,
            application.parent_name,
            application.parent_email,
            application.parent_phone,
            application.relationship ?? 'guardian',
          ]))[0] ?? null
        : null;

      const updatedApplications = await query<any>(`
        UPDATE admission_applications
        SET status = 'registered',
            application_status = 'REGISTERED',
            admitted_student_id = $3,
            updated_at = NOW()
        WHERE tenant_id = $1
          AND id = $2::uuid
        RETURNING id::text, application_number, full_name, class_applying, status, admitted_student_id
      `, [tenantId, application.id, student.id]);

      return {
        student,
        application: updatedApplications[0] ?? { ...application, status: 'registered', admitted_student_id: student.id },
        allocation: allocations[0] ?? null,
        academicEnrollment: enrollments[0] ?? null,
        guardianLink,
      };
    });
  }

  private async readExistingAdmission(
    query: <T = any>(sql: string, params?: any[]) => Promise<T[]>,
    tenantId: string,
    application: any,
  ) {
    const students = await query<any>(`
      SELECT id::text, tenant_id, admission_number, first_name, last_name, middle_name, status
      FROM students
      WHERE tenant_id = $1
        AND id = $2::uuid
      LIMIT 1
    `, [tenantId, application.admitted_student_id]);
    const allocations = await query<any>(`
      SELECT id::text, student_id::text, class_name, stream_name, effective_from, is_current
      FROM student_allocations
      WHERE tenant_id = $1
        AND student_id = $2::uuid
        AND is_current = TRUE
      ORDER BY effective_from DESC, updated_at DESC
      LIMIT 1
    `, [tenantId, application.admitted_student_id]);
    const enrollments = await query<any>(`
      SELECT id::text, student_id::text, application_id::text, class_name, stream_name, academic_year, status
      FROM student_academic_enrollments
      WHERE tenant_id = $1
        AND student_id = $2::uuid
        AND status = 'active'
      ORDER BY enrolled_at DESC
      LIMIT 1
    `, [tenantId, application.admitted_student_id]);

    return {
      student: students[0] ?? { id: application.admitted_student_id, admission_number: '' },
      application,
      allocation: allocations[0] ?? null,
      academicEnrollment: enrollments[0] ?? null,
      guardianLink: null,
    };
  }

  private required(value: unknown, label: string) {
    const text = String(value ?? '').trim();
    if (!text) {
      throw new Error(`${label} is required`);
    }
    return text;
  }

  private normalizeApplicationStatus(status: string) {
    const normalized = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (['approved', 'rejected', 'pending', 'registered', 'interview', 'reviewing'].includes(normalized)) return normalized;
    if (normalized === 'under_review') return 'reviewing';
    if (normalized === 'interview_scheduled') return 'interview';
    throw new Error(`Unsupported application status "${status}"`);
  }

  private normalizeOutcome(outcome: unknown) {
    const normalized = String(outcome || '').trim().toLowerCase();
    if (['passed', 'failed', 'pending'].includes(normalized)) return normalized;
    throw new Error(`Unsupported interview outcome "${outcome}"`);
  }

  private formatStatus(status: unknown) {
    return String(status ?? '')
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ') || 'Pending';
  }

  private formatDate(value: unknown) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  }

  private splitName(fullName: unknown) {
    const parts = String(fullName ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const firstName = parts.shift() ?? 'Learner';
    const lastName = parts.length > 0 ? parts.pop()! : 'Student';
    const middleName = parts.length > 0 ? parts.join(' ') : null;
    return { firstName, middleName, lastName };
  }

  private normalizeGender(value: unknown) {
    const gender = String(value ?? '').trim().toLowerCase();
    if (['male', 'female', 'other'].includes(gender)) return gender;
    return 'undisclosed';
  }

  private uuidOrNull(value: unknown) {
    const text = String(value ?? '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
      ? text
      : null;
  }

  async approveApplication(tenantId: string, applicationId: string, userId: string) {
    return this.prisma.executeWithTenant(tenantId, userId, async (tx) => {
      const application = await tx.admissionApplication.findUnique({
        where: { id: applicationId },
      });

      if (!application) {
        throw new Error('Admission application not found');
      }

      if (application.applicationStatus === 'ADMITTED' || application.applicationStatus === 'REJECTED') {
        throw new Error('Application is already processed');
      }

      const admissionNumberSeed = createHash('sha256')
        .update(`${tenantId}:${application.id}`)
        .digest('hex')
        .slice(0, 8)
        .toUpperCase();
      const admissionNumber = `ADM-${new Date().getFullYear()}-${admissionNumberSeed}`;

      const student = await tx.student.create({
        data: {
          schoolId: tenantId,
          admissionNumber,
          firstName: application.firstName,
          middleName: application.middleName,
          lastName: application.lastName,
          gender: application.gender,
          dateOfBirth: application.dateOfBirth,
          nationality: application.nationality || 'Kenyan',
          studentStatus: 'ACCEPTED',
          boardingStatus: 'DAY_SCHOLAR',
          admissionDate: new Date(),
          currentClassId: application.applyingForClassId,
          primaryGuardianName: application.guardianName,
          primaryGuardianPhone: application.guardianPhone,
          createdByUserId: userId,
        },
      });

      const guardian = await tx.parentGuardian.create({
        data: {
          schoolId: tenantId,
          fullName: application.guardianName,
          relationshipType: (application.guardianRelationship?.toUpperCase() || 'GUARDIAN') as any,
          phone: application.guardianPhone,
          email: application.guardianEmail,
          occupation: application.guardianOccupation,
          status: 'ACTIVE',
        },
      });

      await tx.studentGuardian.create({
        data: {
          schoolId: tenantId,
          studentId: student.id,
          guardianId: guardian.id,
          relationshipType: (application.guardianRelationship?.toUpperCase() || 'GUARDIAN') as any,
          isPrimaryContact: true,
          canPickStudent: true,
        },
      });

      await tx.admissionApplication.update({
        where: { id: applicationId },
        data: {
          applicationStatus: 'ADMITTED',
        },
      });

      await tx.studentAuditLog.create({
        data: {
          schoolId: tenantId,
          studentId: student.id,
          action: 'ADMISSION_APPROVED',
          metadata: {
            description: `Student ${student.firstName} ${student.lastName} was admitted from application ${application.applicationNumber}.`
          },
          performedByUserId: userId,
        }
      });

      return student;
    });
  }

}
