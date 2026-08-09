import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { CommonModule } from '../common/common.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../infrastructure/redis/redis.module';
import { AuthController } from './auth.controller';
import { AuditService } from './audit.service';
import { DashboardRoleService } from './dashboard-role.service';
import { AuthEmailVerificationService } from './auth-email-verification.service';
import { AuthEmailService } from './auth-email.service';
import { AuthInvitationService } from './auth-invitation.service';
import { AuthRecoveryService } from './auth-recovery.service';
import { AuthSchemaService } from './auth-schema.service';
import { AuthService } from './auth.service';
import { MagicLinkService } from './magic-link.service';
import { MonitoringServiceAccountService } from './monitoring-service-account.service';
import { MfaService } from './mfa.service';
import { TenantInvitationsService } from './tenant-invitations.service';
import { TrustedDeviceService } from './trusted-device.service';
import { AuthorizationRepository } from './repositories/authorization.repository';
import { TenantMembershipsRepository } from './repositories/tenant-memberships.repository';
import { UserRoleAssignmentsRepository } from './repositories/user-role-assignments.repository';
import { UsersRepository } from './repositories/users.repository';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { AbacPolicyEngine } from './policies/abac-policy.engine';

@Global()
@Module({
  imports: [CommonModule, DatabaseModule, RedisModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthSchemaService,
    AuditService,
    DashboardRoleService,
    AuthEmailVerificationService,
    AuthEmailService,
    AuthInvitationService,
    AuthRecoveryService,
    AuthService,
    MagicLinkService,
    MonitoringServiceAccountService,
    MfaService,
    TenantInvitationsService,
    TrustedDeviceService,
    UsersRepository,
    TenantMembershipsRepository,
    UserRoleAssignmentsRepository,
    AuthorizationRepository,
    PasswordService,
    TokenService,
    SessionService,
    AbacPolicyEngine,
  ],
  exports: [
    AuthSchemaService,
    AuditService,
    DashboardRoleService,
    AuthEmailVerificationService,
    AuthEmailService,
    AuthInvitationService,
    AuthRecoveryService,
    AuthService,
    MagicLinkService,
    MonitoringServiceAccountService,
    MfaService,
    TenantInvitationsService,
    TrustedDeviceService,
    SessionService,
    TokenService,
    AbacPolicyEngine,
    UsersRepository,
    TenantMembershipsRepository,
    UserRoleAssignmentsRepository,
    AuthorizationRepository,
    PasswordService,
  ],
})
export class AuthModule {}
