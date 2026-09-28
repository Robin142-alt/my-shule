import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { AccountsRepository } from "../finance/repositories/accounts.repository";
import { TransactionService } from "../finance/transaction.service";
import type { CollectionPayment } from "./collection-payments.service";

/** Recognize money belonging to a school even before its student is known.
 * Release cancels only the suspense posting; the existing receipt service then
 * posts the allocation. Both happen in the caller's database transaction.
 */
@Injectable()
export class CollectionSuspenseService {
  constructor(
    private readonly db: PrismaService,
    private readonly context: RequestContextService,
    private readonly accounts: AccountsRepository,
    private readonly transactions: TransactionService,
  ) {}

  async recognize(payment: CollectionPayment): Promise<string> {
    if (payment.suspense_transaction_id) return payment.suspense_transaction_id;
    return this.post(payment, false);
  }

  async release(payment: CollectionPayment): Promise<string | null> {
    if (!payment.suspense_transaction_id) return null;
    if (payment.suspense_release_transaction_id)
      return payment.suspense_release_transaction_id;
    return this.post(payment, true);
  }

  private async post(
    payment: CollectionPayment,
    release: boolean,
  ): Promise<string> {
    if (this.context.requireStore().tenant_id !== payment.tenant_id)
      throw new ConflictException("Suspense posting school mismatch");
    const suspenseCode = "2110-UNALLOCATED-COLLECTIONS";
    await this.db.query(
      `INSERT INTO accounts(tenant_id,code,name,category,normal_balance,currency_code,allow_manual_entries,metadata)
      VALUES($1,$2,'Unallocated school collections','liability','credit','KES',true,'{"source":"collection_payments"}')
      ON CONFLICT(tenant_id,code) DO NOTHING`,
      [payment.tenant_id, suspenseCode],
    );
    const suspense = await this.accounts.findByCode(
      payment.tenant_id,
      suspenseCode,
    );
    const clearing = await this.accounts.findByCode(
      payment.tenant_id,
      payment.asset_account_code ??
        (payment.provider_code === "safaricom"
          ? "1110-MPESA-CLEARING"
          : "1120-BANK-CLEARING"),
    );
    if (!suspense || !clearing)
      throw new NotFoundException(
        "Configure the school collection clearing account before posting payments",
      );
    if (
      suspense.category !== "liability" ||
      suspense.normal_balance !== "credit" ||
      suspense.currency_code !== "KES"
    )
      throw new ConflictException(
        "Unallocated collections account configuration conflicts with the ledger contract",
      );
    const operation = release ? "release" : "receive";
    const result = await this.transactions.postTransaction({
      idempotency_key: `collection-suspense:${payment.id}:${operation}`,
      reference: `COLLECTION-${payment.id}-${operation}`,
      description: `${release ? "Release" : "Recognize"} unallocated school collection ${payment.provider_transaction_id}`,
      effective_at: new Date(payment.occurred_at).toISOString(),
      metadata: {
        source: "collection_suspense",
        collection_payment_id: payment.id,
        original_transaction_id: payment.suspense_transaction_id ?? null,
      },
      entries: [
        {
          account_id: clearing.id,
          direction: release ? "credit" : "debit",
          amount_minor: payment.amount_minor,
          currency_code: "KES",
        },
        {
          account_id: suspense.id,
          direction: release ? "debit" : "credit",
          amount_minor: payment.amount_minor,
          currency_code: "KES",
        },
      ],
    });
    return result.transaction_id;
  }
}
