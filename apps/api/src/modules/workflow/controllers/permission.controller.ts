import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { Permissions } from '../../../auth/decorators/permissions.decorator';

// Assuming there is a standard auth guard available, if not, it should be added.
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('permissions')
@Permissions('*')
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get('me')
  // @UseGuards(JwtAuthGuard) // To be enabled when standard auth guard is identified
  async getMyPermissions(
    @Req() req: any,
    @Query('schoolId') schoolId: string,
  ) {
    // Fallback logic for user ID if auth middleware isn't fully attached yet
    // In production, this comes from req.user
    const userId = req.user?.id || req.headers['x-user-id'] || req.query.userId;
    
    if (!userId || !schoolId) {
      return { success: false, message: 'Missing userId or schoolId', data: [] };
    }

    try {
      const keys = await this.permissionService.evaluateActorCapabilities(userId, schoolId);
      return { success: true, data: keys };
    } catch (error: any) {
      return { success: false, message: error.message, data: [] };
    }
  }
}
