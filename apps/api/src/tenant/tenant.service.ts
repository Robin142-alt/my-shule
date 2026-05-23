import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ResolvedTenantContext,
  TenantTrustBoundaryService,
} from './tenant-trust-boundary.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly tenantTrustBoundaryService?: TenantTrustBoundaryService,
  ) {}

  async resolveTenantIdForRequest(
    hostHeader?: string,
    forwardedTenantId?: string | string[],
    forwardedTenantSignature?: string | string[],
  ): Promise<string> {
    const resolved = await this.resolveTenantContextForRequest(
      hostHeader,
      forwardedTenantId,
      forwardedTenantSignature,
    );

    return resolved.tenant_id;
  }

  async resolveTenantContextForRequest(
    hostHeader?: string,
    forwardedTenantId?: string | string[],
    forwardedTenantSignature?: string | string[],
  ): Promise<ResolvedTenantContext> {
    if (this.tenantTrustBoundaryService) {
      return this.tenantTrustBoundaryService.resolveTenantContext({
        host_header: hostHeader,
        forwarded_tenant_id: forwardedTenantId,
        forwarded_tenant_signature: forwardedTenantSignature,
      });
    }

    return this.resolveTenantContext(hostHeader, forwardedTenantId, forwardedTenantSignature);
  }

  resolveTenantId(
    hostHeader?: string,
    forwardedTenantId?: string | string[],
    forwardedTenantSignature?: string | string[],
  ): string {
    return this.resolveTenantContext(
      hostHeader,
      forwardedTenantId,
      forwardedTenantSignature,
    ).tenant_id;
  }

  resolveTenantContext(
    hostHeader?: string,
    forwardedTenantId?: string | string[],
    forwardedTenantSignature?: string | string[],
  ): ResolvedTenantContext {
    const explicitTenantId = this.normalizeForwardedTenantId(forwardedTenantId);

    if (explicitTenantId) {
      this.assertTenantId(explicitTenantId);

      if (this.isTrustedForwardedTenantId(explicitTenantId, forwardedTenantSignature)) {
        return {
          tenant_id: explicitTenantId,
          source: 'signed_header',
        };
      }
    }

    const host = this.normalizeHost(hostHeader);
    const baseDomain = String(this.configService.get<string>('app.baseDomain') ?? 'localhost').toLowerCase();
    const defaultTenantId = this.configService.get<string>('app.defaultTenantId');

    if (host === 'localhost') {
      if (defaultTenantId) {
        return {
          tenant_id: defaultTenantId,
          source: 'localhost_default',
        };
      }

      throw new BadRequestException('DEFAULT_TENANT_ID must be configured for localhost requests');
    }

    if (host === baseDomain) {
      if (defaultTenantId) {
        return {
          tenant_id: defaultTenantId,
          source: 'base_domain_default',
        };
      }

      throw new BadRequestException('No tenant subdomain was provided for this request');
    }

    if (host.endsWith(`.${baseDomain}`)) {
      const subdomain = host.slice(0, -(baseDomain.length + 1));
      this.assertTenantId(subdomain);
      return {
        tenant_id: subdomain,
        source: 'subdomain',
      };
    }

    if (host.endsWith('.localhost')) {
      const subdomain = host.replace(/\.localhost$/, '');
      this.assertTenantId(subdomain);
      return {
        tenant_id: subdomain,
        source: 'subdomain',
      };
    }

    if (defaultTenantId) {
      return {
        tenant_id: defaultTenantId,
        source: 'base_domain_default',
      };
    }

    throw new BadRequestException(`Unable to derive tenant from host "${host}"`);
  }

  private normalizeHost(hostHeader?: string): string {
    if (!hostHeader || hostHeader.trim().length === 0) {
      throw new BadRequestException('Host header is required to resolve the tenant');
    }

    return hostHeader.replace(/:\d+$/, '').trim().toLowerCase();
  }

  private normalizeForwardedTenantId(forwardedTenantId?: string | string[]): string | null {
    const rawValue = Array.isArray(forwardedTenantId)
      ? forwardedTenantId[0]
      : forwardedTenantId;
    const normalized = rawValue?.trim().toLowerCase() ?? '';

    return normalized.length > 0 ? normalized : null;
  }

  private normalizeForwardedTenantSignature(
    forwardedTenantSignature?: string | string[],
  ): string | null {
    const rawValue = Array.isArray(forwardedTenantSignature)
      ? forwardedTenantSignature[0]
      : forwardedTenantSignature;
    const normalized = rawValue?.trim().toLowerCase() ?? '';

    return normalized.length > 0 ? normalized : null;
  }

  private isTrustedForwardedTenantId(
    tenantId: string,
    forwardedTenantSignature?: string | string[],
  ): boolean {
    const secret = this.configService.get<string>('app.trustedTenantHeaderSecret')?.trim() ?? '';
    const signature = this.normalizeForwardedTenantSignature(forwardedTenantSignature);

    if (!secret || !signature) {
      return false;
    }

    const expected = createHmac('sha256', secret).update(tenantId).digest('hex');

    try {
      return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  }

  private assertTenantId(tenantId: string): void {
    const isValidTenantId = /^[a-z0-9-]+$/.test(tenantId);

    if (!isValidTenantId) {
      throw new BadRequestException(`Invalid tenant identifier "${tenantId}"`);
    }
  }
}

