import { Controller, Get } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequiresModule } from '../module-access/module-access.decorator';
import { HodCommandService } from './hod-command.service';

@Controller('admin-command/hod')
@RequiresModule('academics')
@Permissions('academics:read')
export class HODCommandController {
  constructor(private readonly service: HodCommandService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }

  @Get('department-overview')
  getDepartmentOverview() {
    return this.service.getDepartmentOverview();
  }

  @Get('review-queue')
  getReviewQueue() {
    return this.service.getReviewQueue();
  }

  @Get('subject-allocation')
  getSubjectAllocation() {
    return this.service.getSubjectAllocation();
  }

  @Get('department-teachers')
  getDepartmentTeachers() {
    return this.service.getDepartmentTeachers();
  }

  @Get('lesson-plans')
  getLessonPlans() {
    return this.service.getLessonPlans();
  }

  @Get('coverage-review')
  getCoverageReview() {
    return this.service.getCoverageReview();
  }

  @Get('marks-moderation')
  getMarksModeration() {
    return this.service.getMarksModeration();
  }

  @Get('resource-requests')
  getResourceRequests() {
    return this.service.getResourceRequests();
  }

  @Get('reports')
  getReports() {
    return this.service.getReports();
  }
}
