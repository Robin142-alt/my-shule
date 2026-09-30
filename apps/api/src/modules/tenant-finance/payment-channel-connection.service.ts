import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PaymentChannelRevision } from "./payment-channel-workflow.types";
import { PaymentIngressConfigService } from './payment-ingress-config.service';

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
    if (!tokenResponse.ok)
      throw new BadGatewayException(
        "Safaricom did not accept these credentials. Check the application and environment.",
      );
    const token = (await tokenResponse.json()) as { access_token?: unknown };
    if (typeof token.access_token !== "string" || !token.access_token)
      throw new BadGatewayException("Safaricom did not return an access token");
    // Registration changes the provider callback destination; run only on this
    // explicit Super Admin action after the Principal has approved the destination.
    const urls = this.callbackUrls(revision,credentials);
    if (
      credentials._callback_trust_mode === 'edge_signed' && !this.config.get<string>("mpesa.callbackSecret")
    ) {
      throw new BadRequestException(
        "Configure the authenticated payment callback gateway before connecting automatic collections",
      );
    }
    const registration = await fetch(`${base}/mpesa/c2b/v1/registerurl`, {
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
    const result = (await registration.json()) as { ResponseCode?: unknown };
    if (!registration.ok || String(result.ResponseCode) !== "0") {
      throw new BadGatewayException(
        "Safaricom has not accepted callback registration. Confirm the Paybill and registration with Safaricom.",
      );
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
