import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

import { DatabaseService } from '../database/database.service';

export interface ResolveTenantContextInput {
  host_header?: string;
  forwarded_tenant_id?: string | string[];
  forwarded_tenant_signature?: string | string[];
}

export interface ResolvedTenantContext {
  tenant_id: string;
  source: 'signed_header' | 'subdomain' | 'custom_domain' | 'localhost_default' | 'base_domain_default';
}

@Injectable()
export class TenantTrustBoundaryService {
  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly databaseService?: DatabaseService,
  ) {}

  async resolveTenantContext(input: ResolveTenantContextInput): Promise<ResolvedTenantContext> {
    const explicitTenantId = this.normalizeForwardedTenantId(input.forwarded_tenant_id);

    if (explicitTenantId) {
      this.assertTenantId(explicitTenantId);

      if (this.isTrustedForwardedTenantId(explicitTenantId, input.forwarded_tenant_signature)) {
        return {
          tenant_id: explicitTenantId,
          source: 'signed_header',
        };
      }
    }

    const host = this.normalizeHost(input.host_header);
    const baseDomain = this.baseDomain();
    const defaultTenantId = this.defaultTenantId();

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

    const customDomainTenantId = await this.findTenantIdByVerifiedDomain(host);

    if (customDomainTenantId) {
      return {
        tenant_id: customDomainTenantId,
        source: 'custom_domain',
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

  private async findTenantIdByVerifiedDomain(host: string): Promise<string | null> {
    if (!this.databaseService) {
      return null;
    }

    const result = await this.databaseService.query<{ tenant_id: string }>(
      `
        SELECT tenant_id
        FROM tenant_domains
        WHERE domain = $1
          AND status = 'active'
          AND verified_at IS NOT NULL
        LIMIT 1
      `,
      [host],
    );
    const tenantId = result.rows[0]?.tenant_id?.trim().toLowerCase() ?? '';

    if (!tenantId) {
      return null;
    }

    this.assertTenantId(tenantId);
    return tenantId;
  }

  private baseDomain(): string {
    return String(this.configService.get<string>('app.baseDomain') ?? 'localhost').toLowerCase();
  }

  private defaultTenantId(): string | null {
    const tenantId = this.configService.get<string>('app.defaultTenantId')?.trim().toLowerCase() ?? '';
    return tenantId || null;
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
