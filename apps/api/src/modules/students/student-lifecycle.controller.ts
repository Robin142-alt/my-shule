import { Controller, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { StudentLifecycleService } from './student-lifecycle.service';
import { StudentStatus } from '@prisma/client';
import { TenantMiddleware } from '../../middleware/tenant.middleware';

// Note: In a real implementation we would use proper role/permission guards (e.g., AGP capability engine)
// For now, assuming basic tenant isolation middleware is applied globally or via decorators

@Controller('students/lifecycle')
export class StudentLifecycleController {
  constructor(private readonly studentLifecycleService: StudentLifecycleService) {}

  @Post(':studentId/enroll')
  async enrollStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    const schoolId = req.tenantId; // from TenantMiddleware
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.enrollStudent(schoolId, studentId, userId);
  }

  @Post(':studentId/place-in-class')
  async placeInClass(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Body() body: { classId: string; academicYearId: string; academicLevelId: string; streamId?: string },
  ) {
    const schoolId = req.tenantId;
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.placeInClass(
      schoolId,
      studentId,
      body.classId,
      body.academicYearId,
      body.academicLevelId,
      userId,
      body.streamId,
    );
  }

  @Post(':studentId/promote')
  async promoteStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Body() body: { newClassId: string; academicYearId: string; academicLevelId: string; streamId?: string },
  ) {
    const schoolId = req.tenantId;
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.promoteStudent(
      schoolId,
      studentId,
      body.newClassId,
      body.academicYearId,
      body.academicLevelId,
      userId,
      body.streamId,
    );
  }

  @Post(':studentId/suspend')
  async suspendStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Body() body: { reason: string },
  ) {
    const schoolId = req.tenantId;
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.suspendStudent(schoolId, studentId, userId, body.reason);
  }

  @Post(':studentId/initiate-clearance')
  async initiateClearance(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    const schoolId = req.tenantId;
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.initiateExitClearance(schoolId, studentId, userId);
  }

  @Post(':studentId/exit')
  async exitStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
    @Body() body: { exitReason: string; exitStatus: StudentStatus; clearanceId?: string },
  ) {
    const schoolId = req.tenantId;
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.exitStudent(
      schoolId,
      studentId,
      userId,
      body.exitReason,
      body.exitStatus,
      body.clearanceId,
    );
  }

  @Patch(':studentId/archive')
  async archiveStudent(
    @Request() req: any,
    @Param('studentId') studentId: string,
  ) {
    const schoolId = req.tenantId;
    const userId = req.user?.id || 'system';
    return this.studentLifecycleService.archiveStudent(schoolId, studentId, userId);
  }
}
