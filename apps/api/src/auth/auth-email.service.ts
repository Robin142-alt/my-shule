import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PasswordRecoveryEmailInput = {
  to: string;
  displayName: string;
  resetUrl: string;
  expiresAt: Date;
};

type InvitationEmailInput = {
  to: string;
  displayName: string;
  schoolName: string;
  assignedRole: string;
  inviterName: string;
  inviteUrl: string;
  expiresAt: Date;
  supportNote?: string;
};

type EmailVerificationEmailInput = {
  to: string;
  displayName: string;
  verifyUrl: string;
  expiresAt: Date;
};

type MfaLoginCodeEmailInput = {
  to: string;
  displayName: string;
  code: string;
  expiresAt: Date;
};

type SupportNotificationEmailInput = {
  to: string;
  title: string;
  body: string;
};

export type TransactionalEmailStatus = {
  provider: string;
  status: 'configured' | 'missing';
  api_key_configured: boolean;
  sender_configured: boolean;
  public_app_url_configured: boolean;
};

export type EmailDeliveryErrorCode =
  | 'email_not_configured'
  | 'resend_domain_not_verified'
  | 'provider_rejected'
  | 'provider_timeout'
  | 'provider_network_error';

export class EmailDeliveryError extends ServiceUnavailableException {
  constructor(
    readonly code: EmailDeliveryErrorCode,
    readonly safeMessage: string,
    readonly providerStatus?: number,
  ) {
    super(safeMessage);
  }
}

@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  constructor(private readonly configService: ConfigService) {}

  assertPasswordRecoveryConfigured(): void {
    this.assertTransactionalEmailConfigured(
      'Password recovery is temporarily unavailable. Please contact support if you need immediate access.',
    );
  }

  assertEmailVerificationConfigured(): void {
    this.assertTransactionalEmailConfigured(
      'Email verification is temporarily unavailable. Please contact support if you need immediate access.',
    );
  }

  assertMfaConfigured(): void {
    this.assertTransactionalEmailConfigured(
      'MFA verification is temporarily unavailable. Please contact support if you need immediate access.',
    );
  }

  assertTransactionalEmailConfigured(message: string): void {
    if (!this.getResendApiKey() || !this.getSender()) {
      throw new EmailDeliveryError(
        'email_not_configured',
        message,
      );
    }
  }

  getTransactionalEmailStatus(): TransactionalEmailStatus {
    const apiKeyConfigured = this.getResendApiKey().length > 0;
    const senderConfigured = this.getSender().length > 0;
    const publicAppUrlConfigured = this.getPublicAppUrl().length > 0;

    return {
      provider: this.configService.get<string>('email.provider')?.trim() || 'resend',
      status: apiKeyConfigured && senderConfigured ? 'configured' : 'missing',
      api_key_configured: apiKeyConfigured,
      sender_configured: senderConfigured,
      public_app_url_configured: publicAppUrlConfigured,
    };
  }

  hasLikelyProductionSenderConfigured(): boolean {
    const sender = this.getSender().toLowerCase();
    const emailMatch = sender.match(/<([^>]+)>/) ?? sender.match(/([^\s<>]+@[^\s<>]+)/);
    const email = (emailMatch?.[1] ?? sender).trim();
    const domain = email.includes('@') ? email.split('@').pop() ?? '' : '';

    return Boolean(
      domain &&
        domain.includes('.') &&
        !domain.endsWith('gmail.com') &&
        !domain.endsWith('googlemail.com') &&
        !domain.endsWith('yahoo.com') &&
        !domain.endsWith('outlook.com') &&
        !domain.endsWith('hotmail.com') &&
        !domain.endsWith('resend.dev') &&
        !domain.endsWith('example.com') &&
        !domain.endsWith('example.test'),
    );
  }

  async sendPasswordRecoveryEmail(input: PasswordRecoveryEmailInput): Promise<void> {
    await this.sendTransactionalEmail({
      to: input.to,
      subject: 'Reset your My Shule ERP password',
      html: this.renderPasswordRecoveryHtml(input),
      text: this.renderPasswordRecoveryText(input),
      unavailableMessage:
        'Password recovery is temporarily unavailable. Please contact support if you need immediate access.',
      deliveryFailureMessage: 'Password recovery email could not be sent right now.',
    });
  }

  async sendInvitationEmail(input: InvitationEmailInput): Promise<void> {
    await this.sendTransactionalEmail({
      to: input.to,
      subject: 'You have been invited to My Shule ERP',
      html: this.renderInvitationHtml(input),
      text: this.renderInvitationText(input),
      unavailableMessage: 'School invitation email could not be sent right now.',
      deliveryFailureMessage: 'School invitation email could not be sent right now.',
    });
  }

  async sendEmailVerificationEmail(input: EmailVerificationEmailInput): Promise<void> {
    await this.sendTransactionalEmail({
      to: input.to,
      subject: 'Verify your My Shule ERP email address',
      html: this.renderEmailVerificationHtml(input),
      text: this.renderEmailVerificationText(input),
      unavailableMessage: 'Email verification email could not be sent right now.',
      deliveryFailureMessage: 'Email verification email could not be sent right now.',
    });
  }

  async sendMfaLoginCodeEmail(input: MfaLoginCodeEmailInput): Promise<void> {
    await this.sendTransactionalEmail({
      to: input.to,
      subject: 'Your My Shule ERP verification code',
      html: this.renderMfaLoginCodeHtml(input),
      text: this.renderMfaLoginCodeText(input),
      unavailableMessage: 'MFA verification email could not be sent right now.',
      deliveryFailureMessage: 'MFA verification email could not be sent right now.',
    });
  }

  async sendSupportNotificationEmail(input: SupportNotificationEmailInput): Promise<void> {
    await this.sendTransactionalEmail({
      to: input.to,
      subject: input.title,
      html: this.renderSupportNotificationHtml(input),
      text: this.renderSupportNotificationText(input),
      unavailableMessage: 'Support notification email could not be sent right now.',
      deliveryFailureMessage: 'Support notification email could not be sent right now.',
    });
  }

  private async sendTransactionalEmail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
    unavailableMessage: string;
    deliveryFailureMessage: string;
  }): Promise<void> {
    const apiKey = this.getResendApiKey();
    const from = this.getSender();

    if (!apiKey || !from) {
      throw new EmailDeliveryError(
        'email_not_configured',
        input.unavailableMessage,
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.getRequestTimeoutMs());

    let response: Response;

    try {
      response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.to,
          subject: input.subject,
          html: input.html,
          text: input.text,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      const errorName =
        error instanceof Error
          ? error.name
          : typeof error === 'object' && error !== null && 'name' in error
            ? String(error.name)
            : '';
      const isTimeout = errorName === 'AbortError';
      throw new EmailDeliveryError(
        isTimeout ? 'provider_timeout' : 'provider_network_error',
        isTimeout
          ? `${input.deliveryFailureMessage} Email provider request timed out.`
          : input.deliveryFailureMessage,
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const providerBody = await response.text().catch(() => '');
      const providerDetail = this.sanitizeProviderText(providerBody);

      this.logger.warn(
        `Transactional email provider rejected ${this.sanitizeProviderText(input.subject)}: status=${response.status}; detail=${providerDetail}`,
      );
      throw this.classifyProviderRejection(response.status, providerBody, input.deliveryFailureMessage);
    }
  }

  private getResendApiKey(): string {
    return this.configService.get<string>('email.resendApiKey')?.trim() ?? '';
  }

  private getSender(): string {
    return this.configService.get<string>('email.from')?.trim() ?? '';
  }

  private getPublicAppUrl(): string {
    return this.configService.get<string>('email.publicAppUrl')?.trim() ?? '';
  }

  private getRequestTimeoutMs(): number {
    const configuredTimeoutMs = Number(
      this.configService.get<number>('email.requestTimeoutMs') ?? 22000,
    );

    return Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
      ? configuredTimeoutMs
      : 22000;
  }

  private classifyProviderRejection(
    providerStatus: number,
    providerBody: string,
    deliveryFailureMessage: string,
  ): EmailDeliveryError {
    const normalizedBody = providerBody.toLowerCase();

    if (
      normalizedBody.includes('you can only send testing emails') ||
      normalizedBody.includes('verify a domain at resend.com/domains')
    ) {
      return new EmailDeliveryError(
        'resend_domain_not_verified',
        'Email delivery is blocked by Resend testing mode. Verify a Resend sending domain and set EMAIL_FROM to that verified domain before resending school invitations.',
        providerStatus,
      );
    }

    return new EmailDeliveryError(
      'provider_rejected',
      deliveryFailureMessage,
      providerStatus,
    );
  }

  private sanitizeProviderText(value: string): string {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
      .replace(/[A-Za-z0-9_=-]{24,}/g, '[redacted]')
      .slice(0, 500);
  }

  private renderPasswordRecoveryText(input: PasswordRecoveryEmailInput): string {
    return [
      `Hello ${input.displayName},`,
      '',
      'We received a request to reset your My Shule ERP password.',
      `Open this secure link before ${input.expiresAt.toISOString()}:`,
      input.resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
      'My Shule ERP',
    ].join('\n');
  }

  private renderPasswordRecoveryHtml(input: PasswordRecoveryEmailInput): string {
    const safeName = this.escapeHtml(input.displayName);
    const safeUrl = this.escapeHtml(input.resetUrl);
    const expiry = this.escapeHtml(input.expiresAt.toISOString());

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 20px;">
        <p>Hello ${safeName},</p>
        <p>We received a request to reset your My Shule ERP password.</p>
        <p>
          <a href="${safeUrl}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">
            Reset password
          </a>
        </p>
        <p style="color:#475569;font-size:14px;">This link expires at ${expiry}.</p>
        <p style="color:#475569;font-size:14px;">If you did not request this, you can ignore this email.</p>
        <p>My Shule ERP</p>
      </div>
    `;
  }

  private renderInvitationText(input: InvitationEmailInput): string {
    const supportNote = this.getInvitationSupportNote(input);

    return [
      `Hello ${input.displayName},`,
      '',
      `${input.inviterName} has invited you to join ${input.schoolName} as ${input.assignedRole} in My Shule ERP.`,
      `Accept this secure invitation before ${input.expiresAt.toISOString()}:`,
      input.inviteUrl,
      '',
      supportNote,
      'If you were not expecting this invitation, ignore this email.',
      'My Shule ERP',
    ].join('\n');
  }

  private renderInvitationHtml(input: InvitationEmailInput): string {
    const safeName = this.escapeHtml(input.displayName);
    const safeSchoolName = this.escapeHtml(input.schoolName);
    const safeAssignedRole = this.escapeHtml(input.assignedRole);
    const safeInviterName = this.escapeHtml(input.inviterName);
    const safeUrl = this.escapeHtml(input.inviteUrl);
    const expiry = this.escapeHtml(input.expiresAt.toISOString());
    const safeSupportNote = this.escapeHtml(this.getInvitationSupportNote(input));

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 20px;">
        <p>Hello ${safeName},</p>
        <p><strong>${safeInviterName}</strong> has invited you to join <strong>${safeSchoolName}</strong> as <strong>${safeAssignedRole}</strong> in My Shule ERP.</p>
        <p>
          <a href="${safeUrl}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">
            Accept invitation
          </a>
        </p>
        <p style="color:#475569;font-size:14px;">This invitation expires at ${expiry}.</p>
        <p style="color:#475569;font-size:14px;">${safeSupportNote}</p>
        <p style="color:#475569;font-size:14px;">If you were not expecting this invitation, ignore this email.</p>
        <p>My Shule ERP</p>
      </div>
    `;
  }

  private getInvitationSupportNote(input: InvitationEmailInput): string {
    return (
      input.supportNote?.trim() ||
      'If you need help, contact your school administrator or MyShule support.'
    );
  }

  private renderEmailVerificationText(input: EmailVerificationEmailInput): string {
    return [
      `Hello ${input.displayName},`,
      '',
      'Verify your My Shule ERP email address to keep your account recovery and security notices working.',
      `Open this secure link before ${input.expiresAt.toISOString()}:`,
      input.verifyUrl,
      '',
      'If you did not request this, you can ignore this email.',
      'My Shule ERP',
    ].join('\n');
  }

  private renderEmailVerificationHtml(input: EmailVerificationEmailInput): string {
    const safeName = this.escapeHtml(input.displayName);
    const safeUrl = this.escapeHtml(input.verifyUrl);
    const expiry = this.escapeHtml(input.expiresAt.toISOString());

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 20px;">
        <p>Hello ${safeName},</p>
        <p>Verify your My Shule ERP email address to keep your account recovery and security notices working.</p>
        <p>
          <a href="${safeUrl}" style="display:inline-block;background:#047857;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700;">
            Verify email
          </a>
        </p>
        <p style="color:#475569;font-size:14px;">This link expires at ${expiry}.</p>
        <p style="color:#475569;font-size:14px;">If you did not request this, you can ignore this email.</p>
        <p>My Shule ERP</p>
      </div>
    `;
  }

  private renderMfaLoginCodeText(input: MfaLoginCodeEmailInput): string {
    return [
      `Hello ${input.displayName},`,
      '',
      'Use this My Shule ERP verification code to complete your sign-in:',
      input.code,
      '',
      `This code expires at ${input.expiresAt.toISOString()}.`,
      'If you did not try to sign in, reset your password and contact support.',
      'My Shule ERP',
    ].join('\n');
  }

  private renderMfaLoginCodeHtml(input: MfaLoginCodeEmailInput): string {
    const safeName = this.escapeHtml(input.displayName);
    const safeCode = this.escapeHtml(input.code);
    const expiry = this.escapeHtml(input.expiresAt.toISOString());

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 20px;">
        <p>Hello ${safeName},</p>
        <p>Use this My Shule ERP verification code to complete your sign-in:</p>
        <p style="font-size:28px;letter-spacing:6px;font-weight:800;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 18px;text-align:center;color:#065f46;">
          ${safeCode}
        </p>
        <p style="color:#475569;font-size:14px;">This code expires at ${expiry}.</p>
        <p style="color:#475569;font-size:14px;">If you did not try to sign in, reset your password and contact support.</p>
        <p>My Shule ERP</p>
      </div>
    `;
  }

  private renderSupportNotificationText(input: SupportNotificationEmailInput): string {
    return [
      input.title,
      '',
      input.body,
      '',
      'My Shule ERP Support',
    ].join('\n');
  }

  private renderSupportNotificationHtml(input: SupportNotificationEmailInput): string {
    const safeTitle = this.escapeHtml(input.title);
    const safeBody = this.escapeHtml(input.body);

    return `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px;margin:0 auto;padding:32px 20px;">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;">${safeTitle}</h1>
        <p>${safeBody}</p>
        <p style="color:#475569;font-size:14px;">My Shule ERP Support</p>
      </div>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
