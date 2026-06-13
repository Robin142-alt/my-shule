import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SyncValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateTenantContext(
    schoolId: string,
    userId: string,
    deviceId: string,
    academicYearId?: string,
    termId?: string
  ): Promise<void> {
    // 1. Verify user belongs to school
    const userRole = await this.prisma.userRoleAssignment.findFirst({
      where: {
        userId,
        schoolId,
      },
    });

    if (!userRole) {
      throw new UnauthorizedException('User does not belong to the specified school');
    }

    // 2. Verify Academic Year and Term if provided
    if (academicYearId) {
      const year = await this.prisma.academicYear.findUnique({
        where: { id: academicYearId },
      });
      if (!year || year.schoolId !== schoolId) {
        throw new BadRequestException('Invalid academic year for this school');
      }
    }

    if (termId) {
      const term = await this.prisma.term.findUnique({
        where: { id: termId },
      });
      if (!term || term.schoolId !== schoolId) {
        throw new BadRequestException('Invalid term for this school');
      }
    }
  }

  async validateRolePermissions(roleId: string, module: string, action: string): Promise<boolean> {
    // Placeholder for robust AGP policy evaluation
    return true;
  }
}
