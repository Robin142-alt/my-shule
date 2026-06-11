import { Injectable } from '@nestjs/common';

@Injectable()
export class AdmissionsCommandRepository {
  async getOverview(tenantId: string) {
    return {
      enquiries: 24,
      applicationsPending: 15,
      documentsMissing: 8,
      interviewsScheduled: 12,
      admissionLettersPending: 5,
      recentActivity: [
        { id: 1, action: 'Application Submitted', applicant: 'John Doe', time: '10 mins ago' },
        { id: 2, action: 'Interview Scheduled', applicant: 'Jane Smith', time: '1 hour ago' },
      ],
    };
  }

  async getEnquiries(tenantId: string) {
    return {
      total: 45,
      walkIns: 20,
      website: 15,
      phone: 10,
      recent: [
        { id: 1, name: 'Alice Brown', source: 'Walk-in', status: 'Follow-up Required', date: new Date().toISOString() },
      ],
    };
  }

  async getApplications(tenantId: string) {
    return {
      total: 80,
      pendingReview: 15,
      underReview: 20,
      approved: 40,
      rejected: 5,
    };
  }

  async getApplicantProfiles(tenantId: string) {
    return {
      totalProfiles: 120,
      incomplete: 10,
      readyForReview: 110,
    };
  }

  async getDocuments(tenantId: string) {
    return {
      missing: 8,
      pendingVerification: 25,
      verified: 87,
    };
  }

  async getInterviews(tenantId: string) {
    return {
      scheduledToday: 5,
      upcoming: 12,
      completed: 45,
      needsRescheduling: 2,
    };
  }

  async getSelection(tenantId: string) {
    return {
      offersMade: 40,
      offersAccepted: 35,
      offersDeclined: 2,
      pendingResponse: 3,
    };
  }

  async getFeeClearance(tenantId: string) {
    return {
      cleared: 30,
      pending: 5,
      totalExpected: 500000,
      collected: 450000,
    };
  }

  async getEnrolment(tenantId: string) {
    return {
      enrolled: 35,
      admissionNumbersGenerated: 35,
      pendingEnrolment: 5,
    };
  }

  async getClassPlacement(tenantId: string) {
    return {
      placed: 35,
      unplaced: 5,
      capacityAlerts: 0,
    };
  }

  async getParents(tenantId: string) {
    return {
      onboarded: 35,
      missingContact: 0,
      portalInvitesSent: 35,
    };
  }

  async getTransfers(tenantId: string) {
    return {
      incoming: 5,
      readmissions: 2,
      processing: 1,
    };
  }

  async getCommunication(tenantId: string) {
    return {
      smsSent: 150,
      emailsSent: 200,
      failedDeliveries: 2,
    };
  }

  async getAppointments(tenantId: string) {
    return {
      today: 8,
      upcoming: 15,
      completed: 40,
      cancelled: 3,
    };
  }

  async getImports(tenantId: string) {
    return {
      recentUploads: 5,
      errors: 0,
      rowsProcessed: 500,
    };
  }

  async getReports(tenantId: string) {
    return {
      generatedToday: 12,
      scheduled: 2,
      availableDownloads: 5,
    };
  }

  async getTasks(tenantId: string) {
    return {
      dueToday: 15,
      overdue: 2,
      completed: 45,
    };
  }

  async getTemplates(tenantId: string) {
    return {
      active: 8,
      drafts: 2,
      recentUpdates: 1,
    };
  }
}
