import { Module } from '@nestjs/common';
import { ParentPortalController } from './parent-portal.controller';
import { ParentPortalService } from './parent-portal.service';
import { ParentPortalActionsController } from '../modules/parent-portal/parent-portal-actions.controller';
import { DisciplineModule } from '../modules/discipline/discipline.module';
import { ExamsModule } from '../modules/exams/exams.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [DisciplineModule, ExamsModule, NotificationsModule],
  controllers: [ParentPortalController, ParentPortalActionsController],
  providers: [ParentPortalService],
})
export class ParentPortalModule {}
