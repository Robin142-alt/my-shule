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
}
