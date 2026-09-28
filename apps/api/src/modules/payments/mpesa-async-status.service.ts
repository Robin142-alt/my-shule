import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { PrismaService } from "../../database/prisma.service";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { PiiEncryptionService } from "../security/pii-encryption.service";
import { TenantFinanceConfigRepository } from "../tenant-finance/tenant-finance-config.repository";
import type { MpesaC2bTransactionStatusResult } from "./services/mpesa-transaction-status.service";

export const MPESA_ASYNC_STATUS_SCHEMA = `
CREATE TABLE IF NOT EXISTS mpesa_status_requests (
 id uuid PRIMARY KEY,tenant_id text NOT NULL,payment_id uuid NOT NULL,trans_id text NOT NULL,
 token_hash text NOT NULL,conversation_id text,result_conversation_id text,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','verified','failed','review','request_failed','timed_out')),
 result_code text,amount_minor bigint,receipt_number text,receiver_shortcode text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_mpesa_status_transaction ON mpesa_status_requests(tenant_id,trans_id,created_at DESC);
ALTER TABLE mpesa_status_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_status_requests FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mpesa_status_school ON mpesa_status_requests;
CREATE POLICY mpesa_status_school ON mpesa_status_requests FOR ALL USING(tenant_id=current_setting('app.tenant_id',true)) WITH CHECK(tenant_id=current_setting('app.tenant_id',true));
`;
interface StatusRequest {
  id: string;
  state: string;
  token_hash: string;
  conversation_id: string | null;
  result_conversation_id: string | null;
  trans_id: string;
  amount_minor: string | null;
  receipt_number: string | null;
  receiver_shortcode: string | null;
  created_at: Date;
  result_code: string | null;
}

@Injectable()
export class MpesaAsyncStatusService {
  constructor(
    private readonly db: PrismaService,
    private readonly context: RequestContextService,
    private readonly encryption: PiiEncryptionService,
    private readonly configs: TenantFinanceConfigRepository,
  ) {}

  async verify(
    tenant: string,
    transId: string,
  ): Promise<MpesaC2bTransactionStatusResult> {
    const payment = (
      await this.db.query<{
        id: string;
        mpesa_config_id: string;
        business_short_code: string;
        amount_minor: string;
        received_at: Date;
      }>(
        `SELECT id,mpesa_config_id,business_short_code,amount_minor::text,received_at FROM mpesa_c2b_payments WHERE tenant_id=$1 AND trans_id=$2`,
        [tenant, transId],
      )
    ).rows[0];
    if (!payment)
      throw new NotFoundException("C2B payment was not found in this school");
    const previous = (
      await this.db.query<StatusRequest>(
        `SELECT *,amount_minor::text FROM mpesa_status_requests WHERE tenant_id=$1 AND trans_id=$2 ORDER BY created_at DESC LIMIT 1`,
        [tenant, transId],
      )
    ).rows[0];
    if (previous?.state === "verified") {
      if (
        previous.conversation_id !== previous.result_conversation_id ||
        previous.receipt_number !== transId ||
        previous.receiver_shortcode !== payment.business_short_code ||
        previous.amount_minor !== payment.amount_minor
      )
        throw new BadRequestException(
          "Provider transaction identity or amount did not match; reconciliation is required",
        );
      return {
        provider_status: "provider_verified",
        trans_id: transId,
        result_code: "0",
        result_desc: "Provider transaction verified",
        amount_minor: previous.amount_minor,
        raw_provider_response: { status_request_id: previous.id },
      };
    }
    if (previous?.state === "failed")
      return {
        provider_status: "provider_failed",
        trans_id: transId,
        result_code: previous.result_code,
        result_desc: "Provider reported transaction failure",
        amount_minor: null,
        raw_provider_response: { status_request_id: previous.id },
      };
    if (previous?.state === "review")
      throw new BadRequestException(
        "Provider result was incomplete or did not confirm settlement; statement review is required",
      );
    if (
      previous?.state === "pending" &&
      Date.now() - new Date(previous.created_at).getTime() < 300000
    )
      return this.pending(transId);
    const config = await this.configs.findMpesaConfigForTenantById(
      tenant,
      payment.mpesa_config_id,
    );
    if (!config || config.shortcode !== payment.business_short_code)
      throw new BadRequestException(
        "The historical school Paybill configuration is unavailable",
      );
    const revision = (
      await this.db.query<{
        id: string;
        credentials_ciphertext: string;
        environment: string;
      }>(
        `SELECT r.id,r.credentials_ciphertext,r.environment FROM tenant_payment_channel_revisions r
    JOIN tenant_payment_channels c ON c.tenant_id=r.tenant_id AND c.id=r.channel_id WHERE r.tenant_id=$1 AND c.mpesa_config_id=$2::uuid
    AND r.activated_at <= $3::timestamptz ORDER BY r.activated_at DESC LIMIT 1`,
        [tenant, config.id, payment.received_at],
      )
    ).rows[0];
    if (!revision?.credentials_ciphertext)
      throw new BadRequestException(
        "Configure school-specific transaction verification through approved payment setup",
      );
    const credentials = JSON.parse(
      this.encryption.decrypt(
        revision.credentials_ciphertext,
        `collection-channel:${tenant}:${revision.id}:credentials`,
      ),
    ) as Record<string, string>;
    if (!credentials.security_credential || !credentials.initiator_name)
      throw new BadRequestException(
        "School transaction verification credentials are incomplete",
      );
    const base =
      revision.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke";
    const auth = await fetch(
      `${base}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${credentials.consumer_key}:${credentials.consumer_secret}`).toString("base64")}`,
        },
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!auth.ok)
      throw new BadGatewayException("Safaricom authentication is unavailable");
    const access = (await auth.json()) as { access_token?: string };
    if (!access.access_token)
      throw new BadGatewayException("Safaricom did not return an access token");
    const requestId = randomUUID(),
      token = randomBytes(32).toString("hex");
    await this.db.query(
      `INSERT INTO mpesa_status_requests(id,tenant_id,payment_id,trans_id,token_hash) VALUES($1::uuid,$2,$3::uuid,$4,$5)`,
      [
        requestId,
        tenant,
        payment.id,
        transId,
        createHash("sha256").update(token).digest("hex"),
      ],
    );
    const url = new URL(config.callback_url);
    const prefix = url.pathname.startsWith("/api/") ? "/api" : "";
    const callback = `${url.origin}${prefix}/payments/mpesa/transaction-status/${tenant}/${requestId}/${token}`;
    const response = await fetch(`${base}/mpesa/transactionstatus/v1/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access.access_token}`,
        "Content-Type": "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        Initiator: credentials.initiator_name,
        SecurityCredential: credentials.security_credential,
        CommandID: "TransactionStatusQuery",
        TransactionID: transId,
        PartyA: config.shortcode,
        IdentifierType: "4",
        ResultURL: `${callback}/result`,
        QueueTimeOutURL: `${callback}/timeout`,
        Remarks: "School fee reconciliation",
        Occasion: "fee-payment",
      }),
    });
    const result = (await response.json()) as {
      ResponseCode?: string;
      ConversationID?: string;
    };
    if (
      !response.ok ||
      String(result.ResponseCode) !== "0" ||
      !result.ConversationID
    ) {
      await this.db.query(
        `UPDATE mpesa_status_requests SET state='request_failed',updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid AND state='pending'`,
        [tenant, requestId],
      );
      throw new BadGatewayException(
        "Safaricom did not accept the transaction status query",
      );
    }
    await this.db.query(
      `UPDATE mpesa_status_requests SET conversation_id=$3,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
      [tenant, requestId, result.ConversationID],
    );
    return this.pending(transId);
  }
  async receive(
    tenant: string,
    id: string,
    token: string,
    payload: unknown,
    timeout = false,
  ) {
    const parent = this.context.requireStore();
    return this.context.run({ ...parent, tenant_id: tenant }, () =>
      this.db.withRequestTransaction(async () => {
        const request = (
          await this.db.query<StatusRequest>(
            `SELECT * FROM mpesa_status_requests WHERE tenant_id=$1 AND id=$2::uuid FOR UPDATE`,
            [tenant, id],
          )
        ).rows[0];
        const digest = createHash("sha256").update(token).digest("hex");
        if (
          !request ||
          !timingSafeEqual(Buffer.from(digest), Buffer.from(request.token_hash))
        )
          throw new UnauthorizedException(
            "Unknown payment verification request",
          );
        if (request.state !== "pending")
          return { ResultCode: 0, ResultDesc: "Already received" };
        if (timeout) {
          await this.db.query(
            `UPDATE mpesa_status_requests SET state='timed_out',updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
            [tenant, id],
          );
          return { ResultCode: 0, ResultDesc: "Timeout recorded" };
        }
        const result = (
          payload as {
            Result?: {
              ConversationID?: unknown;
              ResultCode?: unknown;
              ResultParameters?: {
                ResultParameter?: Array<{ Key?: unknown; Value?: unknown }>;
              };
            };
          }
        )?.Result;
        if (
          !result ||
          typeof result.ConversationID !== "string" ||
          result.ResultCode === undefined
        )
          throw new BadRequestException("Invalid provider status result");
        if (
          request.conversation_id &&
          result.ConversationID !== request.conversation_id
        )
          throw new BadRequestException(
            "Provider conversation does not match this verification request",
          );
        const parameters = new Map<string, unknown>();
        for (const item of result.ResultParameters?.ResultParameter ?? []) {
          if (typeof item.Key === "string") {
            if (parameters.has(item.Key))
              throw new BadRequestException("Ambiguous provider result");
            parameters.set(item.Key, item.Value);
          }
        }
        const receipt = String(parameters.get("ReceiptNo") ?? "");
        const amount = String(
          parameters.get("Amount") ?? parameters.get("TransactionAmount") ?? "",
        );
        const receiver = String(
          parameters.get("CreditPartyName") ??
            parameters.get("ReceiverPartyPublicName") ??
            "",
        )
          .split(/\s+-\s+/)[0]
          .trim();
        const state = String(parameters.get("TransactionStatus") ?? "");
        let amountMinor: string | null = null;
        if (/^\d{1,16}(\.\d{1,2})?$/.test(amount)) {
          const [major, fraction = ""] = amount.split(".");
          amountMinor = (
            BigInt(major) * 100n +
            BigInt(fraction.padEnd(2, "0"))
          ).toString();
        }
        const settled =
          String(result.ResultCode) === "0" &&
          state === "Completed" &&
          receipt === request.trans_id &&
          amountMinor &&
          receiver;
        await this.db.query(
          `UPDATE mpesa_status_requests SET state=$3,result_conversation_id=$4,result_code=$5,amount_minor=$6::bigint,receipt_number=$7,receiver_shortcode=$8,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,
          [
            tenant,
            id,
            settled ? "verified" : "review",
            result.ConversationID,
            String(result.ResultCode),
            amountMinor,
            receipt,
            receiver,
          ],
        );
        return { ResultCode: 0, ResultDesc: "Verification result received" };
      }),
    );
  }
  private pending(transId: string): MpesaC2bTransactionStatusResult {
    return {
      provider_status: "provider_pending",
      trans_id: transId,
      result_code: null,
      result_desc: "Awaiting asynchronous provider verification",
      amount_minor: null,
      raw_provider_response: { status: "awaiting_provider" },
    };
  }
}
