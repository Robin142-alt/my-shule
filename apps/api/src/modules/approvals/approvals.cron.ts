import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ApprovalStatus } from '@prisma/client';

@Injectable()
export class ApprovalsCronService {
  private readonly logger = new Logger(ApprovalsCronService.name);

  constructor(private readonly db: PrismaService) {}

  // A basic implementation to be called by a NestJS Cron or external task scheduler
  async handleExpiredRequests() {
    this.logger.log('Running Approval Expiry Cron Job...');

    // Assuming we have an expiry timeout (e.g., 7 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 7);

    try {
      const expiredRequests = await this.db.approvalRequest.findMany({
        where: {
          status: ApprovalStatus.PENDING_APPROVAL,
          createdAt: {
            lt: expiryDate,
          },
        },
      });

      if (expiredRequests.length === 0) {
        this.logger.log('No expired requests found.');
        return;
      }

      this.logger.log(`Found ${expiredRequests.length} expired requests. Rejecting them...`);

      for (const request of expiredRequests) {
        await this.db.approvalRequest.update({
          where: { id: request.id },
          data: {
            status: ApprovalStatus.REJECTED,
            rejectedAt: new Date(),
            approverComment: 'System Auto-Reject: Request expired.',
            auditLogs: {
              create: {
                schoolId: request.schoolId,
                userId: 'SYSTEM',
                action: 'AUTO_REJECT_EXPIRED',
                comment: 'System Auto-Reject: Request expired after 7 days.',
                previousStatus: request.status,
                newStatus: ApprovalStatus.REJECTED,
              }
            }
          }
        });
      }

      this.logger.log('Successfully processed all expired requests.');
    } catch (error) {
      this.logger.error('Failed to run Approval Expiry Cron Job', error);
    }
  }
}
