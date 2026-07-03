import { Controller, Post, Body } from '@nestjs/common';
import { StudentPortalService } from './student-portal.service';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@Controller('student-portal')
export class StudentPortalActionsController {
  constructor(private readonly studentPortalService: StudentPortalService) {}

  @Post('assignments/mark-done')
  @Permissions('student-portal:write')
  markAssignmentDone(@Body() body: any) {
    return this.studentPortalService.markAssignmentDone(body.assignmentId ?? body.id);
  }
}
