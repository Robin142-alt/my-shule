import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Optional,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { RequestContextService } from "../../../common/request-context/request-context.service";
import { PrismaService } from "../../../database/prisma.service";
import {
  AUTH_ANONYMOUS_USER_ID,
  SUPERADMIN_ROLE_OWNER,
} from "../../../auth/auth.constants";
import { PaymentsJobProducerService } from "./payments-job-producer.service";
import { PaymentIngressService } from '../ingress/payment-ingress.service';

interface PendingVerification {
  id: string;
  callback_log_id: string | null;
  checkout_request_id: string | null;
  c2b_payment_id: string | null;
  mpesa_receipt_number: string | null;
}

/** Runs only in the payments worker. Row leases coordinate multiple replicas. */
@Injectable()
export class PaymentInboxRecoveryService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(PaymentInboxRecoveryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private afterTenant = "";
  constructor(
    private readonly db: PrismaService,
    private readonly context: RequestContextService,
    private readonly producer: PaymentsJobProducerService,
    @Optional() private readonly ingress?: PaymentIngressService,
  ) {}

  onApplicationBootstrap() {
    this.timer = setInterval(() => {
      void this.sweep();
    }, 15000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep() {
    if (this.running) return;
    this.running = true;
    try {
      await this.context.run(
        {
          request_id: randomUUID(),
          tenant_id: null,
          user_id: AUTH_ANONYMOUS_USER_ID,
          role: SUPERADMIN_ROLE_OWNER,
          audience: "superadmin",
          is_authenticated: true,
          permissions: ["*:*"],
          session_id: null,
          client_ip: null,
          user_agent: "system:payment-inbox-recovery",
          method: "WORKER",
          path: "/internal/payments/recovery",
          started_at: new Date().toISOString(),
        },
        async () => {
          // Only tenant identities are enumerated globally. Financial reads and
          // writes below always run with the individual school's RLS context.
          const tenants = await this.db.query<{ tenant_id: string }>(
            `SELECT tenant_id FROM tenants WHERE tenant_id>$1 ORDER BY tenant_id LIMIT 100`,
            [this.afterTenant],
          );
          for (const { tenant_id } of tenants.rows) {
            await this.context.run(
              { ...this.context.requireStore(), tenant_id },
              () => this.recoverSchool(tenant_id),
            );
            this.afterTenant = tenant_id;
          }
          if (tenants.rows.length < 100) this.afterTenant = "";
        },
      );
    } catch {
      this.logger.error(
        "Payment inbox recovery failed; durable jobs remain available for retry",
      );
    } finally {
      this.running = false;
    }
  }

  private async recoverSchool(tenant: string) {
    await this.ingress?.recoverSchool(tenant);
    // Callback acceptance commits before Redis dispatch. Also recover a worker
    // that stopped after taking a callback; posting itself remains idempotent.
    const callbacks = await this.db.withRequestTransaction(() =>
      this.db.query<{ id: string; checkout_request_id: string }>(
        `WITH due AS (
          SELECT id FROM callback_logs WHERE tenant_id=$1
            AND callback_trust_status IN ('edge_signed','provider_verified')
            AND processing_status IN ('received','queued','processing','failed')
            AND checkout_request_id IS NOT NULL
            AND updated_at<NOW()-INTERVAL '5 minutes'
          ORDER BY updated_at,id LIMIT 50 FOR UPDATE SKIP LOCKED
        ) UPDATE callback_logs c SET updated_at=NOW() FROM due
          WHERE c.tenant_id=$1 AND c.id=due.id RETURNING c.id,c.checkout_request_id`,
        [tenant],
      ),
    );
    for (const callback of callbacks.rows) {
      try {
        await this.producer.enqueuePayment({
          tenant_id: tenant,
          checkout_request_id: callback.checkout_request_id,
          callback_log_id: callback.id,
          request_id: this.context.requireStore().request_id,
        });
      } catch {
        this.logger.warn(
          "Payment callback dispatch deferred; durable callback remains available",
        );
      }
    }
    const rows = await this.db.withRequestTransaction(async () =>
      this.db.query<PendingVerification>(
        `
      WITH due AS (
        SELECT j.id FROM mpesa_verification_jobs j
        WHERE j.tenant_id=$1 AND j.transaction_status IN ('pending','retry_scheduled','provider_verified')
          AND COALESCE(j.next_retry_at,j.updated_at + INTERVAL '5 minutes')<=NOW()
          AND (j.transaction_status<>'provider_verified' OR
            (j.c2b_payment_id IS NOT NULL AND NOT EXISTS (
              SELECT 1 FROM collection_payments p WHERE p.tenant_id=j.tenant_id
                AND p.provider_code='safaricom' AND p.provider_transaction_id=j.mpesa_receipt_number
            )) OR (j.callback_log_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM callback_logs c WHERE c.tenant_id=j.tenant_id AND c.id=j.callback_log_id AND c.processing_status<>'processed'
            )))
        ORDER BY j.next_retry_at NULLS LAST,j.id LIMIT 50 FOR UPDATE SKIP LOCKED
      ) UPDATE mpesa_verification_jobs j SET next_retry_at=NOW()+INTERVAL '5 minutes'
        FROM due WHERE j.tenant_id=$1 AND j.id=due.id
        RETURNING j.id,j.callback_log_id,j.checkout_request_id,j.c2b_payment_id,j.mpesa_receipt_number`,
        [tenant],
      ),
    );
    for (const row of rows.rows) {
      try {
        await this.producer.enqueueMpesaVerification({
          tenant_id: tenant,
          verification_job_id: row.id,
          callback_log_id: row.callback_log_id,
          checkout_request_id: row.checkout_request_id,
          c2b_payment_id: row.c2b_payment_id,
          mpesa_receipt_number: row.mpesa_receipt_number,
          request_id: this.context.requireStore().request_id,
        });
      } catch {
        this.logger.warn(
          "Payment verification dispatch deferred; the database lease will expire",
        );
      }
    }
  }
}
