import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Pool, PoolClient } from "pg";
import { RequestContextService } from "../src/common/request-context/request-context.service";
import { PAYMENT_CHANNEL_WORKFLOW_SCHEMA } from "../src/modules/tenant-finance/payment-channel-workflow-schema.service";
import { COLLECTION_PAYMENTS_SCHEMA } from "../src/modules/payments/collection-payments-schema.service";
import { PaymentChannelWorkflowService } from "../src/modules/tenant-finance/payment-channel-workflow.service";
import { CollectionPaymentsService } from "../src/modules/payments/collection-payments.service";
import type { PaymentChannelRevisionView } from "../src/modules/tenant-finance/payment-channel-workflow.types";
import { PaymentInboxRecoveryService } from "../src/modules/payments/services/payment-inbox-recovery.service";

describe("Collection approval, persistence and school boundaries", () => {
  const schema = `collection_test_${randomUUID().replaceAll("-", "")}`;
  const dbRole = `${schema}_role`;
  const school = "amani-school",
    otherSchool = "baraka-school",
    accountant = randomUUID(),
    principal = randomUUID();
  const student = randomUUID();
  const referencedInvoice = randomUUID();
  const context = new RequestContextService();
  const transactions = new AsyncLocalStorage<PoolClient>();
  let pool: Pool;
  let workflow: PaymentChannelWorkflowService;
  let collections: CollectionPaymentsService;
  let revision: PaymentChannelRevisionView;
  let postCount = 0;
  let lastReceipt: {
    invoice_id?: string;
    asset_account_code?: string;
    fee_control_account_code?: string;
  };

  async function inTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (transactions.getStore()) return work();
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`SET LOCAL ROLE ${dbRole}`);
      const actor = context.requireStore();
      await client.query(
        `SELECT set_config('app.tenant_id',$1,true),set_config('app.role',$2,true),set_config('app.is_authenticated','true',true)`,
        [actor.tenant_id ?? "", actor.role],
      );
      const result = await transactions.run(client, work);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  const db = {
    withRequestTransaction: inTransaction,
    query: (sql: string, params: unknown[] = []): Promise<any> =>
      transactions.getStore()
        ? transactions.getStore()!.query(sql, params)
        : inTransaction(() => transactions.getStore()!.query(sql, params)),
  };
  function as<T>(
    role: string,
    work: () => Promise<T>,
    tenant = school,
    user = role === "principal" ? principal : accountant,
  ) {
    return context.run(
      {
        request_id: randomUUID(),
        tenant_id: tenant,
        role,
        user_id: user,
        audience: role === "platform_owner" ? "superadmin" : "school",
        is_authenticated: true,
        permissions: ["*:*"],
        session_id: null,
        client_ip: null,
        user_agent: "test",
        method: "POST",
        path: "/test",
        started_at: new Date().toISOString(),
      },
      work,
    );
  }
  const request = {
    provider_code: "equity" as const,
    channel_kind: "bank_account" as const,
    display_name: "Fees account",
    account_name: "School A",
    account_number: "012345678",
    reason: "School fees collection",
  };

  beforeAll(async () => {
    const url = new URL(
      process.env.DATABASE_URL ?? "postgresql://invalid/invalid",
    );
    if (
      process.env.MYSHULE_DISPOSABLE_POSTGRES !== "1" ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/my_shule_disposable_")
    )
      throw new Error("Use the disposable local PostgreSQL test harness");
    pool = new Pool({
      connectionString: url.toString(),
      max: 8,
      connectionTimeoutMillis: 5000,
      options: `-c search_path=${schema},public`,
    });
    await pool.query(`CREATE SCHEMA ${schema}; CREATE SCHEMA IF NOT EXISTS app; CREATE ROLE ${dbRole} NOLOGIN;
      CREATE TABLE tenant_payment_channels(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text NOT NULL,channel_type text,name text,bank_account_id uuid,status text,metadata jsonb,UNIQUE(tenant_id,id));
      CREATE TABLE tenants(tenant_id text PRIMARY KEY,name text);
      CREATE TABLE tenant_financial_accounts(tenant_id text PRIMARY KEY,mpesa_clearing_account_code text,fee_control_account_code text);
      CREATE TABLE students(id uuid PRIMARY KEY,tenant_id text,admission_number text,status text);
      CREATE TABLE invoices(id uuid PRIMARY KEY,tenant_id text,invoice_number text,status text,total_amount_minor bigint,amount_paid_minor bigint,metadata jsonb);
      CREATE TABLE student_guardians(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE student_portal_access(tenant_id text,student_id uuid,user_id uuid,status text);
      CREATE TABLE test_effects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,kind text);
      CREATE TABLE callback_logs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,checkout_request_id text,callback_trust_status text,processing_status text,updated_at timestamptz);
      CREATE TABLE mpesa_verification_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id text,callback_log_id uuid,checkout_request_id text,c2b_payment_id uuid,mpesa_receipt_number text,transaction_status text,next_retry_at timestamptz,updated_at timestamptz);
      ${PAYMENT_CHANNEL_WORKFLOW_SCHEMA}
      ${COLLECTION_PAYMENTS_SCHEMA}
      GRANT USAGE ON SCHEMA ${schema},app TO ${dbRole}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA ${schema} TO ${dbRole};`);
    await pool.query(
      `INSERT INTO tenants VALUES($1,'School A'),($2,'School B');`,
      [school, otherSchool],
    );
    await pool.query(
      `INSERT INTO students VALUES($1::uuid,$2,'ADM-1','active')`,
      [student, school],
    );
    const effect = (kind: string) =>
      db.query("INSERT INTO test_effects(tenant_id,kind) VALUES($1,$2)", [
        context.requireStore().tenant_id,
        kind,
      ]);
    const otherStudent = randomUUID();
    await pool.query(`INSERT INTO students VALUES($1,$2,'ADM-OTHER','active')`,[otherStudent,school]);
    await pool.query(`INSERT INTO invoices VALUES($1,$2,'INV-LINKED','open',10000,0,$3::jsonb),($4,$2,'INV-OTHER','open',10000,0,$5::jsonb)`,
      [referencedInvoice,school,JSON.stringify({student_id:student}),randomUUID(),JSON.stringify({student_id:otherStudent})]);
    const audit = { record: () => effect("audit") },
      events = { publish: () => effect("event") },
      notifications = {
        upsertFromSchoolOperation: () => effect("notification"),
      };
    workflow = new PaymentChannelWorkflowService(
      context,
      db as never,
      {} as never,
      {} as never,
      {
        createBankAccount: async () => ({ id: randomUUID() }),
        updatePaymentChannelStatus: (input: any) =>
          db.query(
            "UPDATE tenant_payment_channels SET status=$3 WHERE tenant_id=$1 AND id=$2::uuid",
            [input.tenant_id, input.channel_id, input.status],
          ),
      } as never,
      { test: async () => "statement_review_ready" } as never,
      audit as never,
      events as never,
      notifications as never,
    );
    collections = new CollectionPaymentsService(
      db as never,
      context,
      {
        createManualFeePayment: async (input: typeof lastReceipt) => {
          lastReceipt = input;
          postCount++;
          await effect("ledger");
          return {
            id: randomUUID(),
            ledger_transaction_id: randomUUID(),
            receipt_number: `R-${postCount}`,
          };
        },
        reverseManualFeePayment: async () => {
          await effect("reversal");
        },
      } as never,
      {
        findManualFeeInvoiceTargetByReference: async (
          _tenant: string,
          reference: string,
        ) =>
          reference.startsWith("INV-")
            ? {
                id: referencedInvoice,
                total_amount_minor: "10000",
                amount_paid_minor: "0",
                metadata: {
                  student_id:
                    reference === "INV-LINKED" ? student : randomUUID(),
                },
              }
            : null,
      } as never,
      events as never,
      audit as never,
      notifications as never,
      {
        recognize: async () => {
          await effect("suspense");
          return randomUUID();
        },
        release: async (payment: any) => {
          if (!payment.suspense_transaction_id) return null;
          await effect("suspense_release");
          return randomUUID();
        },
      } as never,
    );
  });
  afterAll(async () => {
    if (pool) {
      try {
        await pool.query(
          `DROP SCHEMA IF EXISTS ${schema} CASCADE; REVOKE USAGE ON SCHEMA app FROM ${dbRole}; DROP ROLE IF EXISTS ${dbRole}`,
        );
      } finally {
        await pool.end();
      }
    }
  });

  it("persists a request, separates approval from activation, and hides secrets", async () => {
    revision = await as("accountant", () => workflow.request(request));
    expect(revision.status).toBe("pending_approval");
    expect(revision).not.toHaveProperty("credentials_ciphertext");
    await expect(
      as("accountant", () =>
        workflow.decide(revision.id, {
          decision: "approve",
          reason: "Approved account",
        }),
      ),
    ).rejects.toThrow();
    await expect(
      as(
        "principal",
        () =>
          workflow.decide(revision.id, {
            decision: "approve",
            reason: "Approved account",
          }),
        school,
        accountant,
      ),
    ).rejects.toThrow("own payment setup");
    await expect(
      as("platform_owner", () => workflow.activate(school, revision.id)),
    ).rejects.toThrow();
    await as("principal", () =>
      workflow.decide(revision.id, {
        decision: "approve",
        reason: "Verified school bank statement",
      }),
    );
    await as("platform_owner", () =>
      workflow.connect(school, revision.id, {
        connection_mode: "statement",
        environment: "production",
        credentials: {},
      }),
    );
    await as("platform_owner", () => workflow.test(school, revision.id));
    revision = await as("platform_owner", () =>
      workflow.activate(school, revision.id),
    );
    expect(revision.status).toBe("active");
    const effectRows = await pool.query(
      "SELECT count(*)::int AS count FROM test_effects",
    );
    expect(effectRows.rows[0].count).toBe(15);
  });
  it("enforces school isolation through RLS and service queries", async () => {
    expect(await as("accountant", () => workflow.list(), otherSchool)).toEqual(
      [],
    );
    await expect(
      as(
        "principal",
        () =>
          workflow.decide(revision.id, {
            decision: "reject",
            reason: "Wrong school account",
          }),
        otherSchool,
      ),
    ).rejects.toThrow("not found");
    const direct = await as(
      "accountant",
      () => db.query("SELECT * FROM tenant_payment_channel_revisions"),
      otherSchool,
    );
    expect(direct.rows).toHaveLength(0);
    const platform = await as("platform_owner", () => workflow.platformList());
    expect(platform[0].school_name).toBe("School A");
  });
  it("does not post a statement until a different Principal confirms it", async () => {
    await pool.query(
      `INSERT INTO tenant_financial_accounts VALUES($1,'1115-SCHOOL-MPESA','1105-SCHOOL-FEES')`,
      [school],
    );
    const input = {
      provider_transaction_id: "BANK-1",
      amount_minor: "12500",
      account_reference: "ADM-1",
      occurred_at: new Date().toISOString(),
    };
    const pending = await as("accountant", () =>
      collections.statement(revision.id, input, "School bank statement page 1"),
    );
    expect(pending.status).toBe("pending_review");
    expect(pending.fee_control_account_code).toBe("1105-SCHOOL-FEES");
    expect(pending.asset_account_code).toBe("1120-BANK-CLEARING");
    await pool.query(
      `UPDATE tenant_financial_accounts SET fee_control_account_code='1106-NEW-SCHOOL-FEES' WHERE tenant_id=$1`,
      [school],
    );
    expect(postCount).toBe(0);
    await expect(
      as("accountant", () =>
        collections.decide(pending.id, "approve", "Verified statement"),
      ),
    ).rejects.toThrow();
    const posted = await as("principal", () =>
      collections.decide(
        pending.id,
        "approve",
        "Verified school bank statement",
      ),
    );
    expect(posted.status).toBe("posted");
    expect(posted.receipt_number).toBe("R-1");
    expect(posted.fee_control_account_code).toBe("1105-SCHOOL-FEES");
    expect(lastReceipt.fee_control_account_code).toBe("1105-SCHOOL-FEES");
    const replay = await as("accountant", () =>
      collections.statement(revision.id, input, "Same statement page"),
    );
    expect(replay.id).toBe(posted.id);
    expect(postCount).toBe(1);
    await expect(
      as("accountant", () =>
        db.query(
          "UPDATE collection_payments SET asset_account_code='1010-CASH-ON-HAND' WHERE tenant_id=$1 AND id=$2",
          [school, posted.id],
        ),
      ),
    ).rejects.toThrow("immutable");
    await expect(
      as("accountant", () =>
        db.query(
          "UPDATE collection_payments SET amount_minor=1 WHERE tenant_id=$1 AND id=$2",
          [school, posted.id],
        ),
      ),
    ).rejects.toThrow("immutable");
    await expect(
      as("accountant", () =>
        db.query("DELETE FROM collection_payments WHERE tenant_id=$1", [
          school,
        ]),
      ),
    ).rejects.toThrow("cannot be deleted");
  });
  it("serializes duplicate provider confirmations and rolls back failed postings", async () => {
    const input = {
      provider_code: "equity",
      provider_transaction_id: "BANK-2",
      destination_account: request.account_number,
      amount_minor: "7500",
      currency_code: "KES",
      account_reference: "ADM-1",
      occurred_at: new Date().toISOString(),
    };
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        as("accountant", () =>
          collections.recognizeVerified(school, input, revision.channel_id),
        ),
      ),
    );
    expect(new Set(results.map((row) => row.id)).size).toBe(1);
    expect(postCount).toBe(2);
    await expect(
      as("accountant", () =>
        collections.recognizeVerified(
          school,
          { ...input, amount_minor: "9999" },
          revision.channel_id,
        ),
      ),
    ).rejects.toThrow("conflicts");
    await expect(
      as("accountant", () =>
        collections.recognizeVerified(
          school,
          { ...input, provider_transaction_id: "BAD-STUDENT" },
          revision.channel_id,
          randomUUID(),
        ),
      ),
    ).rejects.toThrow("does not own the reference");
    const failed = await pool.query(
      `SELECT * FROM collection_payments WHERE provider_transaction_id='BAD-STUDENT'`,
    );
    expect(failed.rows).toHaveLength(0);
  });
  it("leases only trusted stale callbacks and recovers each school independently of Redis availability", async () => {
    await pool.query(
      `INSERT INTO callback_logs(tenant_id,checkout_request_id,callback_trust_status,processing_status,updated_at)
      VALUES($1,'trusted-a','edge_signed','received',now()-interval '10 minutes'),
        ($1,'untrusted-a','received_unverified','received',now()-interval '10 minutes'),
        ($2,'trusted-b','provider_verified','processing',now()-interval '10 minutes')`,
      [school, otherSchool],
    );
    const dispatches: string[] = [];
    const recovery = new PaymentInboxRecoveryService(db as never, context, {
      enqueuePayment: async (input: {
        tenant_id: string;
        checkout_request_id: string;
      }) => {
        dispatches.push(`${input.tenant_id}:${input.checkout_request_id}`);
        if (input.tenant_id === school)
          throw new Error("Redis temporarily unavailable");
      },
      enqueueMpesaVerification: async () => {
        throw new Error("No verification jobs were inserted");
      },
    } as never);
    await recovery.sweep();
    expect(dispatches).toEqual([
      `${school}:trusted-a`,
      `${otherSchool}:trusted-b`,
    ]);
    await recovery.sweep();
    expect(dispatches).toHaveLength(2);
    const untrusted = await pool.query(
      `SELECT updated_at<now()-interval '5 minutes' AS untouched FROM callback_logs WHERE checkout_request_id='untrusted-a'`,
    );
    expect(untrusted.rows[0].untouched).toBe(true);
  });

  it("keeps incorrect references unmatched and requires a separate reversal decision", async () => {
    const unmatched = await as("accountant", () =>
      collections.recognizeVerified(
        school,
        {
          provider_code: "equity",
          provider_transaction_id: "BANK-3",
          destination_account: request.account_number,
          amount_minor: "100",
          currency_code: "KES",
          account_reference: "WRONG",
          occurred_at: new Date().toISOString(),
        },
        revision.channel_id,
      ),
    );
    expect(unmatched.status).toBe("unmatched");
    expect(postCount).toBe(2);
    await expect(
      as(
        "accountant",
        () => collections.match(unmatched.id, student, "Verified reference"),
        otherSchool,
      ),
    ).rejects.toThrow("not found");
    const posted = await as("accountant", () =>
      collections.match(unmatched.id, student, "Verified parent and statement"),
    );
    expect(posted.status).toBe("posted");
    expect(postCount).toBe(3);
    const reversal = await as("accountant", () =>
      collections.requestReversal(posted.id, "Provider confirmed a refund"),
    );
    await expect(
      as("accountant", () =>
        collections.decideReversal(
          reversal.id,
          "approve",
          "Bank refund verified",
        ),
      ),
    ).rejects.toThrow();
    await as("principal", () =>
      collections.decideReversal(
        reversal.id,
        "approve",
        "Bank refund verified",
      ),
    );
    const rows = await as("accountant", () => collections.list());
    expect(rows.find((row) => row.id === posted.id)?.status).toBe("reversed");
  });

  it("honours the selected invoice and rejects a reference owned by another student", async () => {
    const input = {
      provider_code: "equity",
      provider_transaction_id: "BANK-INVOICE",
      destination_account: request.account_number,
      amount_minor: "5000",
      currency_code: "KES",
      account_reference: "INV-LINKED",
      occurred_at: new Date().toISOString(),
    };
    const posted = await as("accountant", () =>
      collections.recognizeVerified(school, input, null, student),
    );
    expect(posted.invoice_id).toBe(referencedInvoice);
    expect(posted.channel_id).toBe(revision.channel_id);
    expect(lastReceipt.invoice_id).toBe(referencedInvoice);
    const count = postCount;
    await expect(
      as("accountant", () =>
        collections.recognizeVerified(
          school,
          {
            ...input,
            provider_transaction_id: "BANK-WRONG-INVOICE",
            account_reference: "INV-OTHER",
          },
          revision.channel_id,
          student,
        ),
      ),
    ).rejects.toThrow("does not own");
    expect(postCount).toBe(count);
    expect(
      (
        await pool.query(
          `SELECT id FROM collection_payments WHERE provider_transaction_id='BANK-WRONG-INVOICE'`,
        )
      ).rows,
    ).toHaveLength(0);
  });
});
