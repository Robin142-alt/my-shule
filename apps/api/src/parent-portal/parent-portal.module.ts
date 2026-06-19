import { Module } from '@nestjs/common';
import { ParentPortalController } from './parent-portal.controller';
import { ParentPortalService } from './parent-portal.service';
import { ParentPortalActionsController } from '../modules/parent-portal/parent-portal-actions.controller';

@Module({
  controllers: [ParentPortalController, ParentPortalActionsController],
  providers: [ParentPortalService],
})
export class ParentPortalModule {}
