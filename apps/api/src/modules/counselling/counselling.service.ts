import { Injectable } from '@nestjs/common';

@Injectable()
export class CounsellingService {
  async getOverview(tenantId: string, schoolId: string) {
    return {
      openCases: 42,
      newReferrals: 12,
      appointmentsToday: 14,
      followUpsDue: 5,
      highPriority: 9,
      parentContactsPending: 8,
    };
  }

  async getDashboard(tenantId: string, schoolId: string) { return {}; }
  async getReferrals(schoolId: string) { return []; }
  async getCases(schoolId: string) { return []; }
  async getSessions(schoolId: string) { return []; }
  async getAppointments(schoolId: string) { return []; }
  async getFollowups(schoolId: string) { return []; }
  async getWelfareConcerns(schoolId: string) { return []; }
  async getGroupGuidance(schoolId: string) { return []; }
  async getParents(schoolId: string) { return []; }
  async getTeachers(schoolId: string) { return []; }
  async getDiscipline(schoolId: string) { return []; }
  async getHealth(schoolId: string) { return []; }
  async getEscalations(schoolId: string) { return []; }
  async getReports(schoolId: string) { return []; }
  async getTemplates() { return []; }

}