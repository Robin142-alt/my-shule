import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ApprovalsExecutor } from '../approvals/approvals.executor';
import { DisciplineService } from './discipline.service';

@Injectable()
export class DisciplineApprovalsHandler implements OnModuleInit {
  private readonly logger = new Logger(DisciplineApprovalsHandler.name);

  constructor(
    private readonly approvalsExecutor: ApprovalsExecutor,
    private readonly disciplineService: DisciplineService,
  ) {}

  onModuleInit() {
    this.approvalsExecutor.registerHandler('DISCIPLINE', 'ESCALATE_INCIDENT', async (context) => {
      const { schoolId, targetEntityId, newValue, approvedByUserId } = context;
      await this.disciplineService.executeEscalation(targetEntityId, schoolId, (newValue as any)?.reason, approvedByUserId);
    });

    this.approvalsExecutor.registerHandler('DISCIPLINE', 'RESOLVE_INCIDENT', async (context) => {
      const { schoolId, targetEntityId, newValue, approvedByUserId } = context;
      await this.disciplineService.executeResolution(targetEntityId, schoolId, (newValue as any)?.reason, approvedByUserId);
    });

    this.approvalsExecutor.registerHandler('DISCIPLINE', 'CLOSE_INCIDENT', async (context) => {
      const { schoolId, targetEntityId, newValue, approvedByUserId } = context;
      await this.disciplineService.executeClosure(targetEntityId, schoolId, (newValue as any)?.reason, approvedByUserId);
    });

    this.approvalsExecutor.registerHandler('DISCIPLINE', 'DISCIPLINE_ACTION', async (context) => {
      const { schoolId, targetEntityId, approvedByUserId } = context;
      await this.disciplineService.executeActionApproval(targetEntityId, schoolId, approvedByUserId);
    });
  }
}
