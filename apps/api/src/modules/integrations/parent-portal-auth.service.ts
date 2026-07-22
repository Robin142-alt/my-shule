import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomInt, randomUUID } from 'node:crypto';

import { AuthResponseDto } from '../../auth/dto/auth-response.dto';
import { PasswordService } from '../../auth/password.service';
import { AuthorizationRepository } from '../../auth/repositories/authorization.repository';
import { SessionService } from '../../auth/session.service';
import { TokenService } from '../../auth/token.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import {
  ParentPortalPasswordLoginDto,
  RequestParentOtpDto,
  RequestStudentOtpDto,
  StudentPortalPasswordLoginDto,
  VerifyParentOtpDto,
} from './dto/integrations.dto';
import { ParentPortalAuthRepository } from './parent-portal-auth.repository';
import { SchoolSmsWalletService } from './school-sms-wallet.service';
import type { ParentAuthSubject } from './integrations.types';

@Injectable()
export class ParentPortalAuthService {

  private async executeSql<T = any>(query: string, params: any[] = []): Promise<{ rows: T[], rowCount: number }> {
    const firstParam = params[0];
    const isUuid = typeof firstParam === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firstParam);

    if ((this.prisma as any).query) {
      return (this.prisma as any).query(query, params);
    }

    
    if (isUuid) {
      return this.prisma.executeWithTenant(firstParam, null, async (tx: any) => {
        const result = await tx.$queryRawUnsafe(query, ...params);
        const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
      });
    } else {
      const result = await this.prisma.$queryRawUnsafe(query, ...params);
      const arr = Array.isArray(result) ? result : [result];
        return { rows: arr, rowCount: arr.length };
    }
  }

  constructor(
    private readonly requestContext: RequestContextService,
    private readonly parentPortalAuthRepository: ParentPortalAuthRepository,
    private readonly authorizationRepository: AuthorizationRepository,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    @Optional() private readonly schoolSmsWalletService?: SchoolSmsWalletService,
    @Optional() private readonly passwordService?: PasswordService,
  ) {}

  async requestOtp(dto: RequestParentOtpDto): Promise<{
    sent: true;
    challenge_id?: string;
    delivery_channel: 'sms' | 'email' | 'unknown';
    message: string;
    password_setup_required?: boolean;
  }> {
    const identifier = dto.identifier.trim();
    const guardianPhone = dto.guardian_phone?.trim() || null;
    const phoneHash = guardianPhone
      ? this.hashPhone(guardianPhone)
      : this.isProbablyPhone(identifier) ? this.hashPhone(identifier) : null;
    const subject = guardianPhone
      ? await this.parentPortalAuthRepository.findLinkedParentAuthSubject({
          tenant_id: dto.tenant_id?.trim() || null,
          admission_number: identifier.toUpperCase(),
          phone_hash: phoneHash ?? '',
        })
      : await this.parentPortalAuthRepository.findParentAuthSubject({
          identifier,
          phone_hash: phoneHash,
        });

    if (!subject) {
      return {
        sent: true,
        delivery_channel: 'unknown',
        message: 'If a parent account exists, a verification code has been sent.',
      };
    }

    await this.activateTenantContext(subject.tenant_id);
    await this.assertOtpIssuanceAllowed(subject, 'parent_login');
    const otpCode = this.generateOtp();
    const challenge = await this.parentPortalAuthRepository.createOtpChallenge({
      tenant_id: subject.tenant_id,
      user_id: subject.user_id,
      email: guardianPhone ? identifier.toUpperCase() : subject.email,
      phone_hash: subject.phone_number_hash ?? phoneHash,
      phone_last4: subject.phone_number_last4 ?? this.last4(identifier),
      otp_hash: this.hashOtp(otpCode),
      expires_at: new Date(Date.now() + this.otpTtlSeconds() * 1000).toISOString(),
      purpose: 'parent_login',
    });

    await this.sendOtpBestEffort(subject, otpCode, guardianPhone ?? identifier);

    return {
      sent: true,
      challenge_id: challenge.id,
      delivery_channel: subject.phone_number_hash ? 'sms' : 'email',
      message: 'If a parent account exists, a verification code has been sent.',
      password_setup_required: Boolean(guardianPhone),
    };
  }

  async loginParentWithPassword(dto: ParentPortalPasswordLoginDto): Promise<AuthResponseDto> {
    const subject = await this.parentPortalAuthRepository.findLinkedParentPasswordAuthSubject({
      tenant_id: dto.tenant_id?.trim() || null,
      admission_number: dto.admission_number.trim().toUpperCase(),
    });
    const passwordService = this.requirePasswordService();

    if (!subject || !(await passwordService.compare(dto.password, subject.password_hash))) {
      throw new UnauthorizedException('Invalid child admission number or parent password');
    }

    if (this.requiresPasswordChange(subject.force_password_change)) {
      throw new UnauthorizedException(
        'Guardian verification and password setup are required before first login',
      );
    }

    await this.activateTenantContext(subject.tenant_id);
    return this.createPortalAuthResponse(subject);
  }

  async verifyOtp(dto: VerifyParentOtpDto): Promise<AuthResponseDto> {
    const challenge = await this.parentPortalAuthRepository.findChallengeForVerify(dto.challenge_id);

    if (!challenge || !challenge.user_id || (challenge.purpose ?? 'parent_login') !== 'parent_login') {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.activateTenantContext(challenge.tenant_id);

    if (challenge.consumed_at || Date.parse(String(challenge.expires_at)) < Date.now()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    if (challenge.attempts >= 5) {
      throw new UnauthorizedException('Verification attempts exceeded');
    }

    if (this.hashOtp(dto.otp_code.trim()) !== challenge.otp_hash) {
      await this.parentPortalAuthRepository.incrementAttempts(challenge.tenant_id, challenge.id);
      throw new UnauthorizedException('Invalid verification code');
    }

    const linkedSubject = challenge.email && !challenge.email.includes('@') && challenge.phone_hash
      ? await this.parentPortalAuthRepository.findLinkedParentAuthSubject({
          tenant_id: challenge.tenant_id,
          admission_number: challenge.email,
          phone_hash: challenge.phone_hash,
        })
      : null;
    const subject = linkedSubject ?? await this.parentPortalAuthRepository.findParentAuthSubject({
      identifier: challenge.email ?? '',
      phone_hash: challenge.phone_hash,
    });

    if (
      !subject
      || subject.user_id !== challenge.user_id
      || subject.tenant_id !== challenge.tenant_id
    ) {
      throw new UnauthorizedException('Parent account is no longer active');
    }

    if (linkedSubject) {
      if (!dto.new_password) {
        throw new BadRequestException('Create a new parent password to continue');
      }
      this.assertStrongPassword(dto.new_password);
      const completed = await this.parentPortalAuthRepository.completeParentPasswordSetup({
        tenant_id: challenge.tenant_id,
        challenge_id: challenge.id,
        user_id: subject.user_id,
        password_hash: await this.requirePasswordService().hash(dto.new_password),
      });
      if (!completed) {
        throw new UnauthorizedException('Verification code has expired');
      }
      await this.sessionService.invalidateUserSessions(subject.user_id);
    } else {
      const consumed = await this.parentPortalAuthRepository.consumeChallenge(
        challenge.tenant_id,
        challenge.id,
      );

      if (!consumed) {
        throw new UnauthorizedException('Verification code has expired');
      }
    }

    await this.authorizationRepository.ensureTenantAuthorizationBaseline(subject.tenant_id);
    const permissions = await this.authorizationRepository.getPermissionsByRoleId(
      subject.tenant_id,
      subject.role_id,
    );
    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: subject.user_id,
      tenant_id: subject.tenant_id,
      role: subject.role_code,
      audience: 'portal',
      session_id: randomUUID(),
    });

    await this.sessionService.createSession({
      user_id: subject.user_id,
      tenant_id: subject.tenant_id,
      role: subject.role_code,
      audience: 'portal',
      permissions,
      session_id: tokenPair.session_id,
      is_authenticated: true,
      email_verified_at: new Date().toISOString(),
      refresh_token_id: tokenPair.refresh_token_id,
      refresh_expires_at: tokenPair.refresh_expires_at,
      ip_address: this.requestContext.getStore()?.client_ip ?? null,
      user_agent: this.requestContext.getStore()?.user_agent ?? null,
    });
    return {
      tokens: {
        access_token: tokenPair.access_token,
        refresh_token: tokenPair.refresh_token,
        token_type: tokenPair.token_type,
        access_expires_in: tokenPair.access_expires_in,
        refresh_expires_in: tokenPair.refresh_expires_in,
        access_expires_at: tokenPair.access_expires_at,
        refresh_expires_at: tokenPair.refresh_expires_at,
      },
      user: {
        user_id: subject.user_id,
        tenant_id: subject.tenant_id,
        role: subject.role_code,
        audience: 'portal',
        email: subject.email,
        display_name: subject.display_name,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        permissions,
        session_id: tokenPair.session_id,
      },
    };
  }

  async requestStudentOtp(dto: RequestStudentOtpDto): Promise<{
    sent: true;
    challenge_id?: string;
    delivery_channel: 'sms' | 'unknown';
    message: string;
    password_setup_required?: boolean;
  }> {
    const username = dto.username.trim().toUpperCase();
    const guardianPhone = dto.guardian_phone.trim();
    const phoneHash = this.hashPhone(guardianPhone);
    const subject = await this.parentPortalAuthRepository.findStudentAuthSubject({
      tenant_id: dto.tenant_id?.trim() || null,
      username,
      phone_hash: phoneHash,
    });

    if (!subject) {
      return {
        sent: true,
        delivery_channel: 'unknown',
        message: 'If a matching student account exists, a verification code has been sent.',
      };
    }

    await this.activateTenantContext(subject.tenant_id);
    await this.assertOtpIssuanceAllowed(subject, 'student_login');
    const otpCode = this.generateOtp();
    const challenge = await this.parentPortalAuthRepository.createOtpChallenge({
      tenant_id: subject.tenant_id,
      user_id: subject.user_id,
      email: username,
      phone_hash: phoneHash,
      phone_last4: this.last4(guardianPhone),
      otp_hash: this.hashOtp(otpCode),
      expires_at: new Date(Date.now() + this.otpTtlSeconds() * 1000).toISOString(),
      purpose: 'student_login',
    });

    await this.sendStudentOtpBestEffort(subject, otpCode, guardianPhone);

    return {
      sent: true,
      challenge_id: challenge.id,
      delivery_channel: 'sms',
      message: 'If a matching student account exists, a verification code has been sent.',
      password_setup_required: true,
    };
  }

  async loginStudentWithPassword(dto: StudentPortalPasswordLoginDto): Promise<AuthResponseDto> {
    const subject = await this.parentPortalAuthRepository.findStudentPasswordAuthSubject({
      tenant_id: dto.tenant_id?.trim() || null,
      username: dto.username.trim().toUpperCase(),
    });
    const passwordService = this.requirePasswordService();

    if (!subject || !(await passwordService.compare(dto.password, subject.password_hash))) {
      throw new UnauthorizedException('Invalid admission number or password');
    }

    if (this.requiresPasswordChange(subject.force_password_change)) {
      throw new UnauthorizedException(
        'Guardian verification and password setup are required before first login',
      );
    }

    await this.activateTenantContext(subject.tenant_id);
    return this.createPortalAuthResponse(subject);
  }

  async verifyStudentOtp(dto: VerifyParentOtpDto): Promise<AuthResponseDto> {
    const challenge = await this.parentPortalAuthRepository.findChallengeForVerify(dto.challenge_id);

    if (!challenge || !challenge.user_id || challenge.purpose !== 'student_login') {
      throw new UnauthorizedException('Invalid verification code');
    }

    await this.activateTenantContext(challenge.tenant_id);

    if (challenge.consumed_at || Date.parse(String(challenge.expires_at)) < Date.now()) {
      throw new UnauthorizedException('Verification code has expired');
    }

    if (challenge.attempts >= 5) {
      throw new UnauthorizedException('Verification attempts exceeded');
    }

    if (this.hashOtp(dto.otp_code.trim()) !== challenge.otp_hash) {
      await this.parentPortalAuthRepository.incrementAttempts(challenge.tenant_id, challenge.id);
      throw new UnauthorizedException('Invalid verification code');
    }

    const subject = await this.parentPortalAuthRepository.findStudentAuthSubject({
      tenant_id: challenge.tenant_id,
      username: challenge.email ?? '',
      phone_hash: challenge.phone_hash ?? '',
    });
    if (
      !subject
      || subject.user_id !== challenge.user_id
      || subject.tenant_id !== challenge.tenant_id
    ) {
      throw new UnauthorizedException('Student account is no longer active');
    }

    if (!dto.new_password) {
      throw new BadRequestException('Create a new password to complete guardian-verified access');
    }

    this.assertStrongPassword(dto.new_password);
    const passwordHash = await this.requirePasswordService().hash(dto.new_password);
    const completed = await this.parentPortalAuthRepository.completeStudentPasswordSetup({
      tenant_id: challenge.tenant_id,
      challenge_id: challenge.id,
      user_id: subject.user_id,
      password_hash: passwordHash,
    });
    if (!completed) {
      throw new UnauthorizedException('Verification code has expired');
    }
    await this.sessionService.invalidateUserSessions(subject.user_id);

    return this.createPortalAuthResponse(subject);
  }

  private async createPortalAuthResponse(subject: ParentAuthSubject): Promise<AuthResponseDto> {

    await this.authorizationRepository.ensureTenantAuthorizationBaseline(subject.tenant_id);
    const permissions = await this.authorizationRepository.getPermissionsByRoleId(
      subject.tenant_id,
      subject.role_id,
    );
    const tokenPair = await this.tokenService.issueTokenPair({
      user_id: subject.user_id,
      tenant_id: subject.tenant_id,
      role: subject.role_code,
      audience: 'portal',
      session_id: randomUUID(),
    });

    await this.sessionService.createSession({
      user_id: subject.user_id,
      tenant_id: subject.tenant_id,
      role: subject.role_code,
      audience: 'portal',
      permissions,
      session_id: tokenPair.session_id,
      is_authenticated: true,
      email_verified_at: new Date().toISOString(),
      refresh_token_id: tokenPair.refresh_token_id,
      refresh_expires_at: tokenPair.refresh_expires_at,
      ip_address: this.requestContext.getStore()?.client_ip ?? null,
      user_agent: this.requestContext.getStore()?.user_agent ?? null,
    });
    return {
      tokens: {
        access_token: tokenPair.access_token,
        refresh_token: tokenPair.refresh_token,
        token_type: tokenPair.token_type,
        access_expires_in: tokenPair.access_expires_in,
        refresh_expires_in: tokenPair.refresh_expires_in,
        access_expires_at: tokenPair.access_expires_at,
        refresh_expires_at: tokenPair.refresh_expires_at,
      },
      user: {
        user_id: subject.user_id,
        tenant_id: subject.tenant_id,
        role: subject.role_code,
        audience: 'portal',
        email: subject.email,
        display_name: subject.display_name,
        email_verified: true,
        email_verified_at: new Date().toISOString(),
        permissions,
        session_id: tokenPair.session_id,
      },
    };
  }

  private async activateTenantContext(tenantId: string): Promise<void> {
    this.requestContext.setTenantId(tenantId);
    await this.prisma.synchronizeRequestSession(this.requestContext.requireStore());
  }

  private async sendOtpBestEffort(subject: ParentAuthSubject, otpCode: string, identifier: string): Promise<void> {
    const recipient = this.isProbablyPhone(identifier) ? identifier : null;

    if (!this.schoolSmsWalletService || !recipient || !subject.phone_number_hash) {
      return;
    }

    try {
      await this.schoolSmsWalletService.sendSms({
        recipient,
        message: `Your My Shule parent portal code is ${otpCode}. It expires in ${this.otpTtlMinutes()} minutes.`,
        message_type: 'parent_otp',
      });
    } catch {
      // Parent OTP creation remains generic. Delivery failures are monitored through SMS logs.
    }
  }

  private generateOtp(): string {
    return String(randomInt(100000, 999999));
  }

  private hashOtp(value: string): string {
    return createHash('sha256')
      .update(`${value}:${this.pepper()}`)
      .digest('hex');
  }

  private hashPhone(value: string): string {
    let digits = value.replace(/\D/g, '');
    if (/^0(?:1|7)\d{8}$/.test(digits)) {
      digits = `254${digits.slice(1)}`;
    } else if (/^(?:1|7)\d{8}$/.test(digits)) {
      digits = `254${digits}`;
    }

    return createHash('sha256')
      .update(`${digits}:${this.pepper()}`)
      .digest('hex');
  }

  private async sendStudentOtpBestEffort(
    subject: ParentAuthSubject,
    otpCode: string,
    guardianPhone: string,
  ): Promise<void> {
    if (!this.schoolSmsWalletService || !subject.phone_number_hash) {
      return;
    }

    try {
      await this.schoolSmsWalletService.sendSms({
        recipient: guardianPhone,
        message: `Your My Shule student portal code is ${otpCode}. It expires in ${this.otpTtlMinutes()} minutes.`,
        message_type: 'student_otp',
      });
    } catch {
      // The OTP challenge remains truthful; provider failures are visible in SMS delivery logs.
    }
  }

  private async assertOtpIssuanceAllowed(
    subject: ParentAuthSubject,
    purpose: 'parent_login' | 'student_login',
  ): Promise<void> {
    const cooldownSeconds = this.configNumber(
      'security.portalOtpResendCooldownSeconds',
      60,
      10,
      3600,
    );
    const windowSeconds = this.configNumber(
      'security.portalOtpRateWindowSeconds',
      3600,
      cooldownSeconds,
      86400,
    );
    const maxRequests = this.configNumber('security.portalOtpRateMaxRequests', 5, 1, 50);
    const state = await this.parentPortalAuthRepository.getOtpIssuanceState({
      tenant_id: subject.tenant_id,
      user_id: subject.user_id,
      purpose,
      window_seconds: windowSeconds,
    });
    const latest = state.latest_created_at ? Date.parse(String(state.latest_created_at)) : 0;

    if (latest && Date.now() - latest < cooldownSeconds * 1000) {
      throw new HttpException(
        `Wait ${cooldownSeconds} seconds before requesting another verification code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (state.recent_count >= maxRequests) {
      throw new HttpException(
        'Verification code request limit reached. Try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private otpTtlSeconds(): number {
    return this.configNumber('security.portalOtpTtlSeconds', 600, 120, 1800);
  }

  private otpTtlMinutes(): number {
    return Math.max(1, Math.ceil(this.otpTtlSeconds() / 60));
  }

  private configNumber(key: string, fallback: number, minimum: number, maximum: number): number {
    const configured = Number(this.configService.get<number | string>(key));
    return Number.isFinite(configured)
      ? Math.max(minimum, Math.min(maximum, Math.trunc(configured)))
      : fallback;
  }

  private pepper(): string {
    const value = this.configService.get<string>('security.piiEncryptionKey') ?? '';

    if (!value) {
      throw new BadRequestException('Parent portal security key is not configured');
    }

    return value;
  }

  private isProbablyPhone(value: string): boolean {
    return value.replace(/\D/g, '').length >= 7 && !value.includes('@');
  }

  private last4(value: string): string | null {
    const digits = value.replace(/\D/g, '');
    return digits ? digits.slice(-4) : null;
  }

  private requirePasswordService(): PasswordService {
    if (!this.passwordService) {
      throw new BadRequestException('Portal password service is not available');
    }

    return this.passwordService;
  }

  private requiresPasswordChange(value: unknown): boolean {
    return value === true || String(value).toLowerCase() === 'true';
  }

  private assertStrongPassword(password: string): void {
    if (
      password.length < 10
      || !/[A-Z]/.test(password)
      || !/[a-z]/.test(password)
      || !/\d/.test(password)
    ) {
      throw new BadRequestException(
        'Use at least 10 characters with uppercase, lowercase, and a number',
      );
    }
  }
}
