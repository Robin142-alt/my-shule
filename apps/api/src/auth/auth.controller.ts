import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';

import { Public } from './decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Permissions } from './decorators/permissions.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import {
  AuthActionResponseDto,
  RequestPasswordRecoveryDto,
  ResetPasswordDto,
} from './dto/password-recovery.dto';
import { VerifyEmailDto } from './dto/email-verification.dto';
import { AcceptInvitationDto, InvitationAcceptanceResponseDto } from './dto/invitation.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import {
  CreateTenantInvitationDto,
  ListTenantUsersQueryDto,
  TenantInvitationActionResponseDto,
  TenantManagedUserDto,
  TenantManagedUsersResponseDto,
  TenantInvitationResponseDto,
  UpdateTenantMembershipProfileDto,
  UpdateTenantMembershipRoleDto,
  UpdateTenantMembershipStatusDto,
} from './dto/tenant-invitation.dto';
import { AuthInvitationService } from './auth-invitation.service';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import { AuthRecoveryService } from './auth-recovery.service';
import { AuthService } from './auth.service';
import { AuthRequestMetadata } from './auth.interfaces';
import { TenantInvitationsService } from './tenant-invitations.service';

import { SessionService } from './session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authRecoveryService: AuthRecoveryService,
    private readonly authEmailVerificationService: AuthEmailVerificationService,
    private readonly authInvitationService: AuthInvitationService,
    private readonly tenantInvitationsService: TenantInvitationsService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.buildRequestMetadata(request));
  }

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.buildRequestMetadata(request));
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(dto, this.buildRequestMetadata(request));
  }

  @Public()
  @Post('password-recovery/request')
  async requestPasswordRecovery(
    @Body() dto: RequestPasswordRecoveryDto,
    @Req() request: Request,
  ): Promise<AuthActionResponseDto> {
    return this.authRecoveryService.requestPasswordRecovery(
      dto,
      this.buildRequestMetadata(request),
    );
  }

  @Public()
  @Post('password-recovery/reset')
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<AuthActionResponseDto> {
    return this.authRecoveryService.resetPassword(dto);
  }

  @Post('email-verification/request')
  @Permissions('auth:read')
  async requestEmailVerification(
    @Req() request: Request,
  ): Promise<AuthActionResponseDto> {
    return this.authEmailVerificationService.requestEmailVerification(
      this.buildRequestMetadata(request),
    );
  }

  @Public()
  @Post('email-verification/verify')
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<AuthActionResponseDto> {
    return this.authEmailVerificationService.verifyEmail(dto);
  }

  @Public()
  @Post('invitations/accept')
  async acceptInvitation(
    @Body() dto: AcceptInvitationDto,
  ): Promise<InvitationAcceptanceResponseDto> {
    return this.authInvitationService.acceptInvitation(dto);
  }

  @Post('invitations')
  @Permissions('users:write', 'tenant_memberships:write')
  async createTenantInvitation(
    @Body() dto: CreateTenantInvitationDto,
  ): Promise<TenantInvitationResponseDto> {
    return this.tenantInvitationsService.inviteTenantUser(dto);
  }

  @Get('invitations')
  @Permissions('users:read', 'tenant_memberships:read')
  async listTenantUsers(
    @Query() query: ListTenantUsersQueryDto,
  ): Promise<TenantManagedUsersResponseDto> {
    return this.tenantInvitationsService.listTenantUsers(query);
  }

  @Post('invitations/:invitationId/resend')
  @Permissions('users:write', 'tenant_memberships:write')
  async resendTenantInvitation(
    @Param('invitationId') invitationId: string,
  ): Promise<TenantInvitationActionResponseDto> {
    return this.tenantInvitationsService.resendTenantInvitation(invitationId);
  }

  @Delete('invitations/:invitationId')
  @Permissions('users:write', 'tenant_memberships:write')
  async revokeTenantInvitation(
    @Param('invitationId') invitationId: string,
  ): Promise<TenantInvitationActionResponseDto> {
    return this.tenantInvitationsService.revokeTenantInvitation(invitationId);
  }

  @Patch('tenant-users/:membershipId/status')
  @Permissions('users:write', 'tenant_memberships:write')
  async updateTenantMembershipStatus(
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateTenantMembershipStatusDto,
  ): Promise<TenantManagedUserDto> {
    return this.tenantInvitationsService.updateTenantMembershipStatus(
      membershipId,
      dto.status,
    );
  }

  @Patch('tenant-users/:membershipId')
  @Permissions('users:write', 'tenant_memberships:write')
  async updateTenantMembershipProfile(
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateTenantMembershipProfileDto,
  ): Promise<TenantManagedUserDto> {
    return this.tenantInvitationsService.updateTenantMembershipProfile(
      membershipId,
      dto,
    );
  }

  @Patch('tenant-users/:membershipId/role')
  @Permissions('users:write', 'tenant_memberships:write')
  async updateTenantMembershipRole(
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateTenantMembershipRoleDto,
  ): Promise<TenantManagedUserDto> {
    return this.tenantInvitationsService.updateTenantMembershipRole(
      membershipId,
      dto.role_code,
    );
  }

  @Post('logout')
  @Permissions('auth:read')
  async logout(): Promise<LogoutResponseDto> {
    return this.authService.logout();
  }

  @Get('me')
  @Permissions('auth:read')
  async me(): Promise<MeResponseDto> {
    return this.authService.me();
  }

  @Get('sessions')
  @Permissions('auth:read')
  async getSessions(@Req() request: Request) {
    const userId = (request as any).user?.sub || (request as any).user?.user_id;
    if (!userId) return [];
    
    const sessions = await this.sessionService.listUserSessions(userId);
    const currentSessionId = (request as any).user?.session_id;

    return sessions.map(session => ({
      id: session.session_id,
      device: session.device_label || 'Unknown Device',
      ip: session.ip_address || 'Unknown IP',
      lastSeen: session.updated_at,
      status: session.session_id === currentSessionId ? 'Current' : 'Active'
    }));
  }

  @Post('sessions/revoke')
  @Permissions('auth:write')
  async revokeSession(@Body() body: { sessionId: string }) {
    if (!body?.sessionId) {
      return { success: false };
    }
    await this.sessionService.invalidateSession(body.sessionId);
    return { success: true };
  }

  @Post('sessions/revoke-all')
  @Permissions('auth:write')
  async revokeAllSessions(@Req() request: Request) {
    const userId = (request as any).user?.sub || (request as any).user?.user_id;
    const currentSessionId = (request as any).user?.session_id;

    if (!userId) return { success: false };

    // Invalidate all sessions except the current one
    const sessions = await this.sessionService.listUserSessions(userId);
    for (const session of sessions) {
      if (session.session_id !== currentSessionId) {
        await this.sessionService.invalidateSession(session.session_id);
      }
    }
    return { success: true };
  }

  private buildRequestMetadata(request: Request): AuthRequestMetadata {
    const forwardedFor = request.headers['x-forwarded-for'];
    const ipAddress = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor?.split(',')[0]?.trim() || request.ip || null;
    const userAgentHeader = request.headers['user-agent'];

    return {
      ip_address: ipAddress,
      user_agent: Array.isArray(userAgentHeader) ? userAgentHeader[0] ?? null : userAgentHeader ?? null,
    };
  }
}
