import { Injectable } from '@nestjs/common';
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
      SELECT id::text, full_name as name, class_applying as class, status, created_at as date 
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
    };
  }

  async getParents(tenantId: string) {
    const onboarded = await this.executeSql(tenantId, `SELECT COUNT(DISTINCT primary_guardian_phone) as count FROM students WHERE tenant_id = $1 AND primary_guardian_phone IS NOT NULL`, [tenantId]);
    const missingContact = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM students WHERE tenant_id = $1 AND primary_guardian_phone IS NULL`, [tenantId]);
    const portalInvitesSent = await this.executeSql(tenantId, `SELECT COUNT(*) as count FROM student_guardians WHERE tenant_id = $1 AND application_status = 'invited'`, [tenantId]);

    return {
      onboarded: Number(onboarded.rows[0]?.count || 0),
      missingContact: Number(missingContact.rows[0]?.count || 0),
      portalInvitesSent: Number(portalInvitesSent.rows[0]?.count || 0),
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
    return {
      generatedToday: 0,
      scheduled: 0,
      availableDownloads: 0,
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

      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const admissionNumber = `ADM-${new Date().getFullYear()}-${randomPart}`;

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
