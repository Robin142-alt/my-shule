import { Controller, Get, Query, Req, UseGuards, UnauthorizedException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { Permissions } from '../../../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../guards/jwt-auth.guard';

@Controller('permissions')
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('me')
  @Permissions('auth:read')
  async getMyPermissions(
    @Req() req: any,
    @Query('schoolId') schoolId: string,
  ) {
    const userId = req.user?.id;
    
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    
    if (!schoolId) {
      throw new BadRequestException('schoolId is required');
    }

    try {
      const keys = await this.permissionService.evaluateActorCapabilities(userId, schoolId);
      return { success: true, data: keys };
    } catch (error: any) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
