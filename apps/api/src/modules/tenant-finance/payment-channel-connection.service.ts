import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentChannelRevision } from "./payment-channel-workflow.types";
import { PaymentIngressConfigService } from './payment-ingress-config.service';

async function providerBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {};
  } catch { return {}; }
}

/** Only allowlisted diagnostic fields may reach persisted errors, audits or notifications. */
function providerFailure(message: string, response: Response, body: Record<string, unknown>, secrets: string[]) {
  const values = secrets.filter(Boolean).flatMap(value => [value, encodeURIComponent(value)]).sort((a,b)=>b.length-a.length);
  const safe = (value: unknown, limit: number) => {
    if (typeof value !== 'string' && typeof value !== 'number') return '';
    let text = String(value);
    for (const secret of values) text = text.split(secret).join('[redacted]');
    return text.replace(/https?:\/\/[^\s<>"']+/gi, '[redacted URL]')
      .replace(/\b(?:Bearer|Basic)\s+\S+/gi, '[redacted authorization]')
      .replace(/[a-f0-9]{64,}/gi, '[redacted token]').replace(/<[^>]*>/g, '')
      .replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
  };
  const fields = [['ResponseCode',64],['ResponseDescription',300],['errorCode',64],['errorMessage',300]] as const;
  const details = fields.map(([key,limit]) => {const value=safe(body[key],limit);return value ? `${key}=${value}` : '';}).filter(Boolean).join('; ').slice(0,480);
  return new BadGatewayException(`${message} (HTTP ${response.status})${details ? `: ${details}` : ''}`);
}

@Injectable()
export class PaymentChannelConnectionService {
  constructor(private readonly config: ConfigService, private readonly ingress: PaymentIngressConfigService) {}

  callbackUrls(revision: PaymentChannelRevision, credentials: Record<string,string>) {
    return this.ingress.urls(revision, credentials._callback_token ?? '');
  }

  schoolStkCallbackUrl(revision: PaymentChannelRevision, credentials: Record<string,string>) {
    return this.ingress.stkUrl(revision, credentials._callback_token ?? '');
  }

  callbackUrl(): string {
    const value = this.config.get<string>("mpesa.callbackUrl") ?? "";
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new BadRequestException(
        "The platform callback address has not been configured",
      );
    }
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new BadRequestException(
        "The platform callback address must be a public HTTPS address without credentials",
      );
    }
    return url.toString();
  }

  async test(
    revision: PaymentChannelRevision,
    credentials: Record<string, string>,
  ): Promise<string> {
    if (revision.connection_mode === "statement")
      return "statement_review_ready";
    if (revision.provider_code !== "safaricom")
      throw new BadRequestException(
        "Automatic integration is not available for this provider",
      );
    const urls = this.callbackUrls(revision,credentials);
    if (credentials._callback_trust_mode === 'edge_signed' && !this.config.get<string>('mpesa.callbackSecret')) {
      throw new BadRequestException('Configure the authenticated payment callback gateway before connecting automatic collections');
    }
    // Fixed provider hosts: no admin-supplied URLs or redirects can receive secrets.
    const base =
      revision.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
    const tokenResponse = await fetch(
      `${base}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${credentials.consumer_key}:${credentials.consumer_secret}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(15000),
        redirect: "error",
      },
    );
    const token = await providerBody(tokenResponse);
    const secrets = [...Object.values(credentials), Buffer.from(`${credentials.consumer_key}:${credentials.consumer_secret}`).toString('base64')];
    if (!tokenResponse.ok)
      throw providerFailure('Safaricom authentication failed',tokenResponse,token,secrets);
    if (typeof token.access_token !== "string" || !token.access_token)
      throw new BadGatewayException("Safaricom did not return an access token");
    // Registration changes the provider callback destination; run only on this
    // explicit Super Admin action after the Principal has approved the destination.
    const registration = await fetch(`${base}/mpesa/c2b/v2/registerurl`, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ShortCode: revision.account_number,
        ResponseType: "Completed",
        ConfirmationURL: urls.confirmation_url,
        ValidationURL: urls.validation_url,
      }),
    });
    const result = await providerBody(registration);
    if (!registration.ok || (result.ResponseCode !== "0" && result.ResponseCode !== 0)) {
      throw providerFailure('Safaricom callback registration failed',registration,result,[...secrets,token.access_token]);
    }
    return "provider_registration_accepted";
  }

  async simulate(revision: PaymentChannelRevision, credentials: Record<string,string>, reference: string, amount: string, msisdn: string) {
    if (revision.environment !== 'sandbox' || revision.provider_code !== 'safaricom')
      throw new BadRequestException('Simulation is only available in the Safaricom sandbox');
    const base = 'https://sandbox.safaricom.co.ke';
    const auth = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: {Authorization:`Basic ${Buffer.from(`${credentials.consumer_key}:${credentials.consumer_secret}`).toString('base64')}`},
      redirect:'error',signal:AbortSignal.timeout(15000),
    });
    if (!auth.ok) throw new BadGatewayException('Safaricom sandbox authentication failed');
    const token = await auth.json() as {access_token?:string};
    if (!token.access_token) throw new BadGatewayException('Safaricom sandbox did not return an access token');
    const response = await fetch(`${base}/mpesa/c2b/v1/simulate`, {
      method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),
      headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({ShortCode:revision.account_number,CommandID:'CustomerPayBillOnline',Amount:amount,Msisdn:msisdn,BillRefNumber:reference}),
    });
    const result = await response.json() as {ResponseCode?:string};
    if (!response.ok || String(result.ResponseCode)!=='0') throw new BadGatewayException('Safaricom did not accept the sandbox simulation');
  }
}
