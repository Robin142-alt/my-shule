import { AuditAgentService } from './agents/audit-agent.service';
import { OrchestrationAgentService } from './agents/orchestration-agent.service';
import { SelfHealingAgentService } from './agents/self-healing-agent.service';
import { Module, Global } from '@nestjs/common';
import { AgpExecutionService } from './agp-execution.service';

@Global()
@Module({
  providers: [AgpExecutionService, SelfHealingAgentService, AuditAgentService, OrchestrationAgentService],
  exports: [AgpExecutionService, SelfHealingAgentService, AuditAgentService, OrchestrationAgentService],
})
export class AgpModule {}
