import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

import { RequestContextService } from '../common/request-context/request-context.service';
import { DatabaseService } from '../database/database.service';
import { AuditService } from './audit.service';
import {
  DEFAULT_ROLE_OWNER,
  SUPERADMIN_ROLE_OWNER,
} from './auth.constants';
import {
  AuthAudience,
  AuthRequestMetadata,
  AuthenticatedPrincipal,
  IssuedTokenPair,
} from './auth.interfaces';
import {
  AuthorizedDashboardRole,
  DashboardRoleAuthorizationSet,
  DashboardRoleService,
} from './dashboard-role.service';
import { LoginDto } from './dto/login.dto';
import {
  AuthResponseDto,
  AuthenticatedUserDto,
  AuthTokensDto,
} from './dto/auth-response.dto';
import { LogoutResponseDto } from './dto/logout-response.dto';
import { MeResponseDto } from './dto/me-response.dto';
import {
  DashboardRoleContextDto,
  SwitchActiveRoleDto,
} from './dto/dashboard-role.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthorizationRepository } from './repositories/authorization.repository';
import { TenantMembershipsRepository } from './repositories/tenant-memberships.repository';
import { UsersRepository } from './repositories/users.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { TrustedDeviceService } from './trusted-device.service';
import { TenantMembershipEntity } from './entities/tenant-membership.entity';
import { UserEntity } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly requestContext: RequestContextService,
    private readonly usersRepository: UsersRepository,
    private readonly tenantMembershipsRepository: TenantMembershipsRepository,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    @Optional() private readonly mfaService?: MfaService,
    @Optional() private readonly trustedDeviceService?: TrustedDeviceService,
    @Optional() private readonly databaseService?: DatabaseService,
    private readonly dashboardRoleService?: DashboardRoleService,
    private readonly auditService?: AuditService,
  ) {}

  extractBearerToken(request: Request): string | null {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      return null;
    }

    const normalizedValue = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;

    if (!normalizedValue?.startsWith('Bearer ')) {
      return null;
    }

    const token = normalizedValue.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  async authenticateAccessToken(
    accessToken: string,
    expectedTenantId: string | null,
    expectedAudience: AuthAudience,
  ): Promise<AuthenticatedPrincipal> {
    const payload = await this.tokenService.verifyAccessToken(accessToken);

    if (payload.audience !== expectedAudience) {
      throw new UnauthorizedException('Access token does not belong to this audience');
    }

    const resolvedExpectedTenantId = await this.resolveTokenTenantContext(
      payload.tenant_id,
      expectedTenantId,
    );

    if (payload.tenant_id !== resolvedExpectedTenantId) {
      throw new UnauthorizedException('Access token does not belong to this tenant');
    }

    const session = await this.sessionService.getSession(payload.session_id);

    if (!session) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    if (
      session.user_id !== payload.user_id ||
      session.tenant_id !== payload.tenant_id ||
      session.role !== payload.role ||
      session.audience !== payload.audience
    ) {
      throw new UnauthorizedException('Access token is out of sync with the active session');
    }

    if (session.tenant_id && session.audience === 'school' && this.dashboardRoleService) {
      try {
        await this.dashboardRoleService.authorizeRole({
          user_id: session.user_id,
          tenant_id: session.tenant_id,
          active_role: session.role,
          requested_role: session.role,
        });
      } catch (error) {
        if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
          throw new UnauthorizedException('The active dashboard role is no longer available');
        }

        throw error;
      }
    }

    await this.assertEmailVerifiedForSensitiveSession(session);

    return this.sessionService.toPrincipal(session);
  }

  async register(dto: RegisterDto, metadata: AuthRequestMetadata): Promise<AuthResponseDto> {
    throw new ForbiddenException('Self-service account creation is disabled. Please contact your administrator for an invitation.');
  }

  async login(dto: LoginDto, metadata: AuthRequestMetadata): Promise<AuthResponseDto> {
    if (dto.audience === 'superadmin') {
      return this.loginPlatformOwner(dto, metadata);
    }

    const audience = this.requireTenantScopedAudience(dto.audience);
    const user = await this.resolveLoginUser(dto.email);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const membership = await this.resolveLoginMembership(user.id);
    const tenantId = membership.tenant_id;

    await this.activateResolvedTenantContext(tenantId);
    await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);

    const roleAuthorizationSet = audience === 'school'
      ? await this.resolveLoginRoleAuthorizationSet(user.id, membership)
      : this.buildPrimaryRoleAuthorizationSet(membership);
    const primaryRolePermissions = await this.authorizationRepository.getPermissionsByRoleId(
      tenantId,
      membership.role_id,
    );
    const permissions = this.resolveEmailVerificationPermissions(user, primaryRolePermissions);
    const assurancePermissions = await this.resolveLoginAssurancePermissions(
      tenantId,
      roleAuthorizationSet.roles,
    );
    const mfaAssuredAt = await this.enforceLoginSecurity(
      user,
      membership.role_code,
      assurancePermissions,
      dto,
      metadata,
    );

    return this.createAuthResponse(
      user,
      membership,
      permissions,
      audience,
      metadata,
      roleAuthorizationSet.context,
      mfaAssuredAt,
    );
  }

  async refresh(dto: RefreshTokenDto, metadata: AuthRequestMetadata): Promise<AuthResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(dto.refresh_token);

    if (payload.audience === 'superadmin') {
      return this.refreshPlatformOwner(dto.refresh_token, metadata);
    }

    const audience = this.requireTenantScopedAudience(payload.audience);
    const requestTenantId = this.requestContext.requireStore().tenant_id;
    const tenantId = await this.resolveTokenTenantContext(
      payload.tenant_id,
      requestTenantId,
    );

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }

    if (payload.tenant_id !== tenantId) {
      throw new UnauthorizedException('Refresh token does not belong to this tenant');
    }

    const session = await this.sessionService.getSession(payload.session_id);

    if (!session) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    if (
      session.user_id !== payload.user_id ||
      session.tenant_id !== payload.tenant_id ||
      session.audience !== audience
    ) {
      await this.sessionService.invalidateSession(payload.session_id);
      throw new UnauthorizedException('Refresh token does not match this session');
    }

    const user = await this.usersRepository.findById(payload.user_id);

    if (!user || user.status !== 'active') {
      await this.sessionService.invalidateSession(payload.session_id);
      throw new UnauthorizedException('User account is no longer active');
    }

    const membership = await this.tenantMembershipsRepository.findActiveMembership(user.id, tenantId);

    if (!membership) {
      await this.sessionService.invalidateSession(payload.session_id);
      throw new UnauthorizedException('User no longer has access to this tenant');
    }

    await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);

    const selectedRole = audience === 'school'
      ? await this.resolveAuthorizedRefreshRole({
          user_id: user.id,
          tenant_id: tenantId,
          session_role: session.role,
          primary_role: membership.role_code,
          primary_role_id: membership.role_id,
        })
      : this.buildPrimaryAuthorizedRole(membership);
    const selectedRolePermissions = await this.authorizationRepository.getPermissionsByRoleId(
      tenantId,
      selectedRole.role_id,
    );
    this.assertMfaAssuranceForRole(session, selectedRole.role_code, selectedRolePermissions);
    const permissions = this.resolveEmailVerificationPermissions(user, selectedRolePermissions);
    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: user.id,
      tenant_id: tenantId,
      role: selectedRole.role_code,
      audience,
      session_id: payload.session_id,
    });

    const rotation = await this.sessionService.rotateRefreshToken({
      session_id: payload.session_id,
      current_refresh_token_id: payload.token_id,
      next_token_pair: tokenPair,
      role: selectedRole.role_code,
      permissions,
      email_verified_at: this.formatEmailVerifiedAt(user),
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });
    const activeTokenPair = rotation?.token_pair ?? tokenPair;

    return this.buildAuthResponse(
      user,
      tenantId,
      permissions,
      activeTokenPair,
      audience,
      selectedRole.context,
      selectedRole.role_code,
    );
  }

  async logout(): Promise<LogoutResponseDto> {
    const requestContext = this.requestContext.requireStore();

    if (!requestContext.session_id) {
      throw new UnauthorizedException('No active session found');
    }

    await this.sessionService.invalidateSession(requestContext.session_id);

    return { success: true };
  }

  async me(): Promise<MeResponseDto> {
    const requestContext = this.requestContext.requireStore();

    if (!requestContext.is_authenticated || !requestContext.session_id) {
      throw new UnauthorizedException('No authenticated user found');
    }

    if (requestContext.audience === 'superadmin') {
      const user = await this.usersRepository.findById(requestContext.user_id);

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('User account is no longer active');
      }

      return {
        user: this.buildPlatformUserDto(
          user,
          requestContext.session_id,
          this.resolveEmailVerificationPermissions(user, ['*:*']),
        ),
        role_context: this.buildPlatformRoleContext(),
      };
    }

    const tenantId = this.requireTenantId();

    const user = await this.usersRepository.findById(requestContext.user_id);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User account is no longer active');
    }

    const membership = await this.tenantMembershipsRepository.findActiveMembership(user.id, tenantId);

    if (!membership) {
      throw new UnauthorizedException('User no longer has access to this tenant');
    }

    const activeRole = requestContext.role ?? membership.role_code;
    const selectedRole = requestContext.audience === 'school'
      ? await this.resolveAuthorizedRoleOrPrimaryFallback({
          user_id: user.id,
          tenant_id: tenantId,
          requested_role: activeRole,
          membership,
          allow_primary_fallback: false,
        })
      : this.buildPrimaryAuthorizedRole(membership);
    const permissions = this.resolveEmailVerificationPermissions(
      user,
      await this.authorizationRepository.getPermissionsByRoleId(tenantId, selectedRole.role_id),
    );

    return {
      user: this.buildUserDto(
        user,
        tenantId,
        selectedRole.role_code,
        permissions,
        requestContext.session_id,
        this.requireTenantScopedAudience(requestContext.audience ?? 'school'),
      ),
      role_context: selectedRole.context,
    };
  }

  async dashboardRoles(): Promise<DashboardRoleContextDto> {
    const requestContext = this.requestContext.requireStore();

    if (!requestContext.is_authenticated || !requestContext.session_id) {
      throw new UnauthorizedException('No authenticated user found');
    }

    if (requestContext.audience === 'superadmin') {
      return this.buildPlatformRoleContext();
    }

    if (requestContext.audience !== 'school') {
      throw new ForbiddenException('Dashboard roles are only available to school staff sessions');
    }

    const tenantId = this.requireTenantId();
    return this.requireDashboardRoleService().getRoleContext({
      user_id: requestContext.user_id,
      tenant_id: tenantId,
      active_role: requestContext.role,
    });
  }

  async switchActiveRole(
    dto: SwitchActiveRoleDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    const requestContext = this.requestContext.requireStore();

    if (
      !requestContext.is_authenticated
      || !requestContext.session_id
      || requestContext.audience !== 'school'
    ) {
      throw new ForbiddenException('Dashboard role switching is only available to school accounts');
    }

    const tenantId = this.requireTenantId();
    const session = await this.sessionService.getSession(requestContext.session_id);

    if (
      !session
      || session.user_id !== requestContext.user_id
      || session.tenant_id !== tenantId
      || session.audience !== requestContext.audience
    ) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    const user = await this.usersRepository.findById(requestContext.user_id);

    if (!user || user.status !== 'active') {
      await this.sessionService.invalidateSession(requestContext.session_id);
      throw new UnauthorizedException('User account is no longer active');
    }

    await this.authorizationRepository.ensureTenantAuthorizationBaseline(tenantId);
    const selectedRole = await this.requireDashboardRoleService().authorizeRole({
      user_id: user.id,
      tenant_id: tenantId,
      active_role: dto.role_code,
      requested_role: dto.role_code,
    });
    const selectedRolePermissions = await this.authorizationRepository.getPermissionsByRoleId(
      tenantId,
      selectedRole.role_id,
    );
    this.assertMfaAssuranceForRole(session, selectedRole.role_code, selectedRolePermissions);
    const permissions = this.resolveEmailVerificationPermissions(user, selectedRolePermissions);
    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: user.id,
      tenant_id: tenantId,
      role: selectedRole.role_code,
      audience: this.requireTenantScopedAudience(requestContext.audience ?? 'school'),
      session_id: session.session_id,
    });
    const rotation = await this.sessionService.rotateRefreshToken({
      session_id: session.session_id,
      current_refresh_token_id: session.refresh_token_id,
      next_token_pair: tokenPair,
      role: selectedRole.role_code,
      permissions,
      email_verified_at: this.formatEmailVerifiedAt(user),
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });

    if (rotation.session.role !== selectedRole.role_code) {
      throw new ServiceUnavailableException('Dashboard role changed concurrently; refresh and try again');
    }

    this.requestContext.setRole(selectedRole.role_code);
    this.requestContext.setPermissions(permissions);
    await this.databaseService?.synchronizeRequestSession(this.requestContext.requireStore());

    if (!rotation.replayed) {
      try {
        await this.requireAuditService().record({
          tenant_id: tenantId,
          actor_user_id: user.id,
          action: 'auth.active_role_changed',
          resource_type: 'auth_session',
          resource_id: session.session_id,
          metadata: {
            previous_role: session.role,
            active_role: selectedRole.role_code,
            primary_role: selectedRole.context.primary_role,
            teacher_dashboard_eligible: selectedRole.context.teacher_dashboard_eligible,
          },
        });
      } catch {
        await this.sessionService.invalidateSession(session.session_id);
        throw new ServiceUnavailableException(
          'Dashboard role switch could not be audited; the session was closed safely',
        );
      }
    }

    return this.buildAuthResponse(
      user,
      tenantId,
      permissions,
      rotation.token_pair,
      this.requireTenantScopedAudience(requestContext.audience ?? 'school'),
      selectedRole.context,
      selectedRole.role_code,
    );
  }

  private requireTenantScopedAudience(requestedAudience: AuthAudience | undefined): AuthAudience {
    const audience = requestedAudience ?? 'school';

    if (audience === 'superadmin') {
      throw new UnauthorizedException('Requested audience is not allowed for this tenant');
    }

    return audience;
  }

  private async createAuthResponse(
    user: UserEntity,
    membership: TenantMembershipEntity,
    permissions: string[],
    audience: AuthAudience,
    metadata: AuthRequestMetadata,
    roleContext: DashboardRoleContextDto,
    mfaAssuredAt: string | null,
  ): Promise<AuthResponseDto> {
    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: user.id,
      tenant_id: membership.tenant_id,
      role: membership.role_code,
      audience,
      session_id: randomUUID(),
    });

    await this.sessionService.createSession({
      user_id: user.id,
      tenant_id: membership.tenant_id,
      role: membership.role_code,
      audience,
      permissions,
      session_id: tokenPair.session_id,
      is_authenticated: true,
      email_verified_at: this.formatEmailVerifiedAt(user),
      mfa_assured_at: mfaAssuredAt,
      refresh_token_id: tokenPair.refresh_token_id,
      refresh_expires_at: tokenPair.refresh_expires_at,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });

    return this.buildAuthResponse(
      user,
      membership.tenant_id,
      permissions,
      tokenPair,
      audience,
      roleContext,
      membership.role_code,
    );
  }

  private async loginPlatformOwner(
    dto: LoginDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    const configuredOwnerEmail = this.configService.get<string>('auth.systemOwnerEmail')?.trim().toLowerCase();

    if (!configuredOwnerEmail) {
      throw new UnauthorizedException('System owner is not configured');
    }

    if (dto.email.trim().toLowerCase() !== configuredOwnerEmail) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const user = await this.usersRepository.findPlatformOwnerByEmail(dto.email);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordService.compare(dto.password, user.password_hash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const permissions = this.resolveEmailVerificationPermissions(user, ['*:*']);
    const mfaAssuredAt = await this.enforceLoginSecurity(
      user,
      SUPERADMIN_ROLE_OWNER,
      permissions,
      dto,
      metadata,
    );

    return this.createPlatformAuthResponse(user, metadata, mfaAssuredAt);
  }

  private async refreshPlatformOwner(
    refreshToken: string,
    metadata: AuthRequestMetadata,
  ): Promise<AuthResponseDto> {
    const payload = await this.tokenService.verifyRefreshToken(refreshToken);

    if (payload.tenant_id !== null || payload.audience !== 'superadmin') {
      throw new UnauthorizedException('Refresh token does not belong to a platform session');
    }

    const session = await this.sessionService.getSession(payload.session_id);

    if (!session) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    if (
      session.user_id !== payload.user_id ||
      session.tenant_id !== null ||
      session.audience !== 'superadmin'
    ) {
      await this.sessionService.invalidateSession(payload.session_id);
      throw new UnauthorizedException('Refresh token does not match this session');
    }

    const user = await this.usersRepository.findPlatformOwnerById(payload.user_id);

    if (!user || user.status !== 'active') {
      await this.sessionService.invalidateSession(payload.session_id);
      throw new UnauthorizedException('User account is no longer active');
    }

    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: user.id,
      tenant_id: null,
      role: SUPERADMIN_ROLE_OWNER,
      audience: 'superadmin',
      session_id: payload.session_id,
    });

    const permissions = this.resolveEmailVerificationPermissions(user, ['*:*']);

    const rotation = await this.sessionService.rotateRefreshToken({
      session_id: payload.session_id,
      current_refresh_token_id: payload.token_id,
      next_token_pair: tokenPair,
      role: SUPERADMIN_ROLE_OWNER,
      permissions,
      email_verified_at: this.formatEmailVerifiedAt(user),
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });
    const activeTokenPair = rotation?.token_pair ?? tokenPair;

    return this.buildPlatformAuthResponse(user, activeTokenPair, permissions);
  }

  private async createPlatformAuthResponse(
    user: UserEntity,
    metadata: AuthRequestMetadata,
    mfaAssuredAt: string | null,
  ): Promise<AuthResponseDto> {
    const permissions = this.resolveEmailVerificationPermissions(user, ['*:*']);
    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: user.id,
      tenant_id: null,
      role: SUPERADMIN_ROLE_OWNER,
      audience: 'superadmin',
      session_id: randomUUID(),
    });

    await this.sessionService.createSession({
      user_id: user.id,
      tenant_id: null,
      role: SUPERADMIN_ROLE_OWNER,
      audience: 'superadmin',
      permissions,
      session_id: tokenPair.session_id,
      is_authenticated: true,
      email_verified_at: this.formatEmailVerifiedAt(user),
      mfa_assured_at: mfaAssuredAt,
      refresh_token_id: tokenPair.refresh_token_id,
      refresh_expires_at: tokenPair.refresh_expires_at,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent,
    });

    return this.buildPlatformAuthResponse(user, tokenPair, permissions);
  }

  private async enforceLoginSecurity(
    user: UserEntity,
    role: string,
    permissions: string[],
    dto: LoginDto,
    metadata: AuthRequestMetadata,
  ): Promise<string | null> {
    if (this.isContractDemoMfaBypassAllowed(user)) {
      return new Date().toISOString();
    }

    if (!this.mfaService) {
      return null;
    }

    const trustedDevice = dto.trusted_device_token && this.trustedDeviceService
      ? await this.trustedDeviceService.isTrustedDevice({
        userId: user.id,
        rawToken: dto.trusted_device_token,
      })
      : false;
    const result = await this.mfaService.enforceLoginChallenge({
      userId: user.id,
      email: user.email,
      displayName: user.display_name,
      role,
      permissions,
      mfaEnabled: Boolean(user.mfa_enabled),
      mfaCode: dto.mfa_code,
      trustedDevice,
    });

    if (
      result.status === 'verified'
      && dto.trust_device
      && dto.trusted_device_token
      && this.trustedDeviceService
    ) {
      await this.trustedDeviceService.trustDevice({
        userId: user.id,
        rawToken: dto.trusted_device_token,
        ipAddress: metadata.ip_address,
        userAgent: metadata.user_agent,
      });
    }

    return result.status === 'verified' || result.status === 'trusted_device'
      ? new Date().toISOString()
      : null;
  }

  private isContractDemoMfaBypassAllowed(user: UserEntity): boolean {
    if (process.env.NODE_ENV === 'production') {
      return false;
    }

    const enabled = process.env.AUTH_CONTRACT_DEMO_MFA_BYPASS === 'true';
    if (!enabled || !user.email.endsWith('.demo')) {
      return false;
    }

    const tenantId = this.requestContext.getStore()?.tenant_id;
    return tenantId === 'kb-high';
  }

  private buildAuthResponse(
    user: UserEntity,
    tenantId: string,
    permissions: string[],
    tokenPair: IssuedTokenPair,
    audience: AuthAudience,
    roleContext: DashboardRoleContextDto,
    activeRole: string,
  ): AuthResponseDto {
    const tokens: AuthTokensDto = {
      access_token: tokenPair.access_token,
      refresh_token: tokenPair.refresh_token,
      token_type: tokenPair.token_type,
      access_expires_in: tokenPair.access_expires_in,
      refresh_expires_in: tokenPair.refresh_expires_in,
      access_expires_at: tokenPair.access_expires_at,
      refresh_expires_at: tokenPair.refresh_expires_at,
    };

    return {
      tokens,
      user: this.buildUserDto(
        user,
        tenantId,
        activeRole,
        permissions,
        tokenPair.session_id,
        audience,
      ),
      role_context: roleContext,
    };
  }

  private buildUserDto(
    user: UserEntity,
    tenantId: string,
    activeRole: string,
    permissions: string[],
    sessionId: string,
    audience: AuthAudience,
  ): AuthenticatedUserDto {
    return {
      user_id: user.id,
      tenant_id: tenantId,
      role: activeRole,
      audience,
      email: user.email,
      display_name: user.display_name,
      email_verified: this.isEmailVerified(user),
      email_verified_at: this.formatEmailVerifiedAt(user),
      permissions,
      session_id: sessionId,
    };
  }

  private buildPlatformAuthResponse(
    user: UserEntity,
    tokenPair: IssuedTokenPair,
    permissions: string[],
  ): AuthResponseDto {
    const tokens: AuthTokensDto = {
      access_token: tokenPair.access_token,
      refresh_token: tokenPair.refresh_token,
      token_type: tokenPair.token_type,
      access_expires_in: tokenPair.access_expires_in,
      refresh_expires_in: tokenPair.refresh_expires_in,
      access_expires_at: tokenPair.access_expires_at,
      refresh_expires_at: tokenPair.refresh_expires_at,
    };

    return {
      tokens,
      user: this.buildPlatformUserDto(user, tokenPair.session_id, permissions),
      role_context: this.buildPlatformRoleContext(),
    };
  }

  private buildPlatformUserDto(
    user: UserEntity,
    sessionId: string,
    permissions: string[],
  ): AuthenticatedUserDto {
    return {
      user_id: user.id,
      tenant_id: null,
      role: SUPERADMIN_ROLE_OWNER,
      audience: 'superadmin',
      email: user.email,
      display_name: user.display_name,
      email_verified: this.isEmailVerified(user),
      email_verified_at: this.formatEmailVerifiedAt(user),
      permissions,
      session_id: sessionId,
    };
  }

  private async resolveLoginRoleAuthorizationSet(
    userId: string,
    membership: TenantMembershipEntity,
  ): Promise<DashboardRoleAuthorizationSet> {
    if (!this.dashboardRoleService) {
      return {
        context: this.buildFallbackRoleContext(membership.role_code, membership.role_name),
        roles: [{ role_id: membership.role_id, role_code: membership.role_code }],
      };
    }

    return this.dashboardRoleService.getAuthorizedRoleSet({
      user_id: userId,
      tenant_id: membership.tenant_id,
      active_role: membership.role_code,
    });
  }

  private buildPrimaryRoleAuthorizationSet(
    membership: TenantMembershipEntity,
  ): DashboardRoleAuthorizationSet {
    const selectedRole = this.buildPrimaryAuthorizedRole(membership);

    return {
      context: selectedRole.context,
      roles: [{ role_id: selectedRole.role_id, role_code: selectedRole.role_code }],
    };
  }

  private buildPrimaryAuthorizedRole(
    membership: TenantMembershipEntity,
  ): AuthorizedDashboardRole {
    return {
      role_id: membership.role_id,
      role_code: membership.role_code,
      context: this.buildFallbackRoleContext(membership.role_code, membership.role_name),
    };
  }

  private async resolveLoginAssurancePermissions(
    tenantId: string,
    roles: DashboardRoleAuthorizationSet['roles'],
  ): Promise<string[]> {
    const permissionSets = await Promise.all(
      roles.map((role) =>
        this.authorizationRepository.getPermissionsByRoleId(tenantId, role.role_id),
      ),
    );

    return [...new Set(permissionSets.flat())];
  }

  private assertMfaAssuranceForRole(
    session: { mfa_assured_at?: string | null },
    roleCode: string,
    permissions: string[],
  ): void {
    const requiresMfa = this.mfaService
      ? this.mfaService.requiresChallenge(roleCode, permissions)
      : this.hasSensitivePermission(permissions);

    if (!requiresMfa) {
      return;
    }

    const assuredAt = session.mfa_assured_at
      ? Date.parse(session.mfa_assured_at)
      : Number.NaN;
    if (!Number.isFinite(assuredAt)) {
      throw new UnauthorizedException(
        'This session was not MFA-assured for privileged dashboard switching. Sign in again before changing roles.',
      );
    }
  }

  private async resolveAuthorizedRefreshRole(input: {
    user_id: string;
    tenant_id: string;
    session_role: string;
    primary_role: string;
    primary_role_id: string;
  }): Promise<AuthorizedDashboardRole> {
    const fallbackMembership = Object.assign(new TenantMembershipEntity(), {
      tenant_id: input.tenant_id,
      user_id: input.user_id,
      role_id: input.primary_role_id,
      role_code: input.primary_role,
      role_name: input.primary_role,
      status: 'active',
    });

    return this.resolveAuthorizedRoleOrPrimaryFallback({
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      requested_role: input.session_role,
      membership: fallbackMembership,
      allow_primary_fallback: true,
    });
  }

  private async resolveAuthorizedRoleOrPrimaryFallback(input: {
    user_id: string;
    tenant_id: string;
    requested_role: string;
    membership: TenantMembershipEntity;
    allow_primary_fallback: boolean;
  }): Promise<AuthorizedDashboardRole> {
    if (!this.dashboardRoleService) {
      return {
        role_id: input.membership.role_id,
        role_code: input.membership.role_code,
        context: this.buildFallbackRoleContext(
          input.membership.role_code,
          input.membership.role_name,
        ),
      };
    }

    try {
      return await this.dashboardRoleService.authorizeRole({
        user_id: input.user_id,
        tenant_id: input.tenant_id,
        active_role: input.requested_role,
        requested_role: input.requested_role,
      });
    } catch (error) {
      if (
        !input.allow_primary_fallback
        || !(error instanceof ForbiddenException)
        || input.requested_role === input.membership.role_code
      ) {
        throw error;
      }

      return this.dashboardRoleService.authorizeRole({
        user_id: input.user_id,
        tenant_id: input.tenant_id,
        active_role: input.membership.role_code,
        requested_role: input.membership.role_code,
      });
    }

  }

  private buildFallbackRoleContext(
    roleCode: string,
    roleName?: string,
  ): DashboardRoleContextDto {
    return {
      primary_role: roleCode,
      active_role: roleCode,
      assigned_roles: [roleCode],
      available_roles: [
        {
          role_code: roleCode,
          role_name: roleName || roleCode.replaceAll('_', ' '),
          is_primary: true,
          is_teacher_mode: roleCode === 'teacher',
          sources: ['primary_membership'],
        },
      ],
      teacher_dashboard_eligible: roleCode === 'teacher',
    };
  }

  private buildPlatformRoleContext(): DashboardRoleContextDto {
    return {
      primary_role: SUPERADMIN_ROLE_OWNER,
      active_role: SUPERADMIN_ROLE_OWNER,
      assigned_roles: [SUPERADMIN_ROLE_OWNER],
      available_roles: [
        {
          role_code: SUPERADMIN_ROLE_OWNER,
          role_name: 'Platform Owner',
          is_primary: true,
          is_teacher_mode: false,
          sources: ['primary_membership'],
        },
      ],
      teacher_dashboard_eligible: false,
    };
  }

  private requireDashboardRoleService(): DashboardRoleService {
    if (!this.dashboardRoleService) {
      throw new InternalServerErrorException('Dashboard role service is unavailable');
    }

    return this.dashboardRoleService;
  }

  private requireAuditService(): AuditService {
    if (!this.auditService) {
      throw new InternalServerErrorException('Authentication audit service is unavailable');
    }

    return this.auditService;
  }

  private resolveEmailVerificationPermissions(
    user: UserEntity,
    permissions: string[],
  ): string[] {
    if (!this.hasSensitivePermission(permissions) || this.isEmailVerified(user)) {
      return permissions;
    }

    return ['auth:read'];
  }

  private async assertEmailVerifiedForSensitiveSession(
    session: { permissions: string[]; session_id: string; email_verified_at?: string | null },
  ): Promise<void> {
    if (!this.hasSensitivePermission(session.permissions)) {
      return;
    }

    if (!session.email_verified_at) {
      await this.sessionService.invalidateSession(session.session_id);
      throw new UnauthorizedException('Verify your email before accessing sensitive workspace actions');
    }
  }

  private hasSensitivePermission(permissions: string[]): boolean {
    return permissions.some((permission) =>
      permission === '*:*'
      || permission.endsWith(':write')
      || permission.endsWith(':manage')
      || permission.endsWith(':create')
      || permission.endsWith(':delete')
      || permission.endsWith(':*'),
    );
  }

  private isEmailVerified(user: UserEntity): boolean {
    return Boolean(user.email_verified_at);
  }

  private formatEmailVerifiedAt(user: UserEntity): string | null {
    if (!user.email_verified_at) {
      return null;
    }

    return user.email_verified_at instanceof Date
      ? user.email_verified_at.toISOString()
      : user.email_verified_at;
  }

  private requireTenantId(): string {
    const tenantId = this.requestContext.requireStore().tenant_id;

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }

    return tenantId;
  }

  private async resolveLoginUser(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findByEmail(email);
  }

  private async resolveLoginMembership(userId: string): Promise<TenantMembershipEntity> {
    const requestContext = this.requestContext.getStore();
    const currentTenantId = requestContext?.tenant_id;
    const tenantSource = requestContext?.tenant_source;

    if (currentTenantId && this.requiresCurrentTenantMembership(tenantSource)) {
      const currentMembership = await this.tenantMembershipsRepository.findActiveMembership(
        userId,
        currentTenantId,
      );

      if (currentMembership) {
        return currentMembership;
      }

      throw new UnauthorizedException('User does not have access to this tenant');
    }

    const memberships = await this.tenantMembershipsRepository.findActiveMembershipsByUser(userId);

    if (memberships.length === 1) {
      return memberships[0];
    }

    if (memberships.length > 1) {
      throw new UnauthorizedException('Multiple school workspaces are linked to this account. Choose a school after sign-in.');
    }

    throw new UnauthorizedException('User does not have access to an active school workspace');
  }

  private requiresCurrentTenantMembership(tenantSource: string | null | undefined): boolean {
    return tenantSource !== 'localhost_default' && tenantSource !== 'base_domain_default';
  }

  private async resolveTokenTenantContext(
    payloadTenantId: string | null,
    currentTenantId: string | null,
  ): Promise<string | null> {
    if (payloadTenantId === currentTenantId) {
      return currentTenantId;
    }

    if (payloadTenantId && this.canUseTokenTenantForDefaultContext(currentTenantId)) {
      await this.activateResolvedTenantContext(payloadTenantId);
      return payloadTenantId;
    }

    return currentTenantId;
  }

  private canUseTokenTenantForDefaultContext(currentTenantId: string | null): boolean {
    const requestContext = this.requestContext.getStore();

    if (!requestContext) {
      return false;
    }

    return !currentTenantId || !this.requiresCurrentTenantMembership(requestContext.tenant_source);
  }

  private async activateResolvedTenantContext(tenantId: string): Promise<void> {
    this.requestContext.setTenantId(tenantId);

    const store = this.requestContext.requireStore();
    await this.databaseService?.synchronizeRequestSession(store);
  }
}
