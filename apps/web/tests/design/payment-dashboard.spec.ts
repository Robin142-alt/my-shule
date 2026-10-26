import { expect, test } from "@playwright/test";
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import {
  SCHOOL_SESSION_COOKIE,
  SUPERADMIN_SESSION_COOKIE,
  serializeExperienceSession,
} from "@/lib/auth/experience-routing";

// Real dashboard rendering against controlled API responses; database/RBAC
// behaviour is exercised separately by the disposable PostgreSQL suite.
for (const role of ["principal", "accountant", "bursar"] as const) {
  for (const width of [1440, 390]) {
    test(`${role} payment setup and notification links at ${width}px`, async ({
      page,
    }) => {
      // This journey now crosses setup, receipts, reconciliation, invoices and refund review.
      test.setTimeout(60000);
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
      const school = "payment-dashboard-fixture";
      const user = {
        user_id: "fixture-user",
        tenant_id: school,
        role,
        display_name: "School staff",
        email: "staff@example.test",
        session_id: "fixture-session",
        permissions:
          role === "principal"
            ? [
                "auth:read",
                "principal:read",
                "principal:write",
                "billing:read",
                "billing:write",
                "notifications:read",
              ]
            : [
                "auth:read",
                "billing:read",
                "billing:write",
                "notifications:read",
              ],
      };
      const session = {
        audience: "school",
        tenantSlug: school,
        userLabel: "School staff",
        user,
        role,
        roleContext: normalizeDashboardRoleContext(null, role),
        homePath: `/school/${role}`,
        redirectTo: `/school/${role}`,
      };
      await page.context().addCookies([
        {
          name: SCHOOL_SESSION_COOKIE,
          value: serializeExperienceSession({
            experience: "school",
            role,
            tenantSlug: school,
            userLabel: "School staff",
            homePath: session.homePath,
          }),
          url: "http://127.0.0.1:3005",
        },
      ]);
      const revision = {
        id: "00000000-0000-4000-8000-000000000411",
        tenant_id: school,
        provider_code: "equity",
        channel_kind: "bank_account",
        display_name: "School fees account",
        account_name: "Fixture School",
        account_number: "0123456789",
        bank_name: "Equity",
        status: "pending_approval",
        reason: "School fees collection",
        requested_by: "accountant",
        created_at: "2026-09-30T08:00:00Z",
      };
      let correctionRequested=false,correctionExecuted=false;
      let refundRecorded=role==='principal',refundApproved=false;
      let creditStatus=role==='principal'?'pending':'approved';
      await page.route("**/api/**", async (route) => {
        if (route.request().headers().accept?.includes('text/event-stream')) {
          await route.fulfill({contentType:'text/event-stream',body:': local dashboard fixture\n\n'});
          return;
        }
        const url = new URL(route.request().url());
        const path = url.pathname;
        let response: unknown = [];
        if (path === "/api/auth/csrf") response = { token: "local-fixture-csrf" };
        else if (path === '/api/legal/access') response={ready:true};
        else if (path === "/api/auth/me") response = { session, user };
        else if (path === "/api/school/modules/me")
          response = ["principal_dashboard", "finance", "communication"];
        else if (path.includes("permissions"))
          response = { data: user.permissions };
        else if(path.endsWith('/billing/student-balances')) response=[{student_id:'refund-learner',student_name:'Linked Learner',currency_code:'KES',invoiced_amount_minor:'10000',paid_amount_minor:'10000',credit_amount_minor:'2000',balance_amount_minor:'-2000'}];
        else if(path.endsWith('/billing/credit-refunds/sources/refund-learner')) response={items:[{source_kind:'manual',source_id:'00000000-0000-4000-8000-000000000434',receipt_number:'CREDIT-RECEIPT',available_minor:'2000',reserved_minor:'0'}]};
        else if(path.endsWith('/billing/credit-refunds/credit-refund-fixture/decision')) {
          expect(role).toBe('principal');expect(route.request().postDataJSON()).toEqual({decision:'approve',reason:'Checked original payer and unused credit'});
          creditStatus='approved';response={status:creditStatus};
        }
        else if(path.endsWith('/billing/credit-refunds/credit-refund-fixture/payout')) {
          expect(route.request().postDataJSON()).toMatchObject({external_reference:'CREDIT-PAYOUT',evidence_reference:'Bank debit advice in finance register'});
          creditStatus='completed';response={status:creditStatus};
        }
        else if(path.endsWith('/billing/credit-refunds')) {
          if(route.request().method()==='POST') {
            expect(route.request().postDataJSON()).toMatchObject({source_kind:'manual',amount_minor:'1200',reason:'Return unused school fees'});
            creditStatus='pending';response={status:creditStatus};
          }else response={items:[{id:'credit-refund-fixture',amount_minor:'1200',receipt_number:'CREDIT-RECEIPT',student_name:'Linked Learner',
            reason:'Return unused school fees',status:creditStatus,can_review:role==='principal'&&creditStatus==='pending',can_cancel:creditStatus!=='completed',can_complete:creditStatus==='approved'}]};
        }
        else if (path.endsWith('/billing/manual-fee-payments')) response=[{
          id:'00000000-0000-4000-8000-000000000433',receipt_number:'STK-RECEIPT',payment_method:'mpesa_c2b',
          status:'cleared',student_name:'Linked Learner',amount_minor:'15000',received_at:'2026-10-20T08:00:00Z',metadata:{source:'stk_payment'},
        },{id:'00000000-0000-4000-8000-000000000434',receipt_number:'REVERSED-RECEIPT',payment_method:'bank_deposit',
          status:'reversed',student_name:'Linked Learner',amount_minor:'15000',received_at:'2026-01-09T08:00:00Z'}];
        else if(path.endsWith('/billing/refund-evidence/refund-fixture/decision')) {
          expect(role).toBe('principal');expect(route.request().postDataJSON()).toEqual({decision:'approve',reason:'Checked original payout evidence'});
          refundApproved=true;response={status:'approved'};
        }
        else if(path.endsWith('/billing/refund-evidence')) {
          if(route.request().method()==='POST') {
            expect(route.request().postDataJSON()).toMatchObject({receipt_id:'00000000-0000-4000-8000-000000000434',source_kind:'manual',amount_minor:'15000',external_reference:'REFUND-PROOF'});
            refundRecorded=true;response={status:'pending_review'};
          }else response={items:refundRecorded?[{id:'refund-fixture',amount_minor:'15000',external_reference:'REFUND-PROOF',
            evidence_reference:'Original bank statement page 3',reason:'Full authorized refund',status:refundApproved?'approved':'pending_review',
            paid_at:'2026-01-10T10:00:00Z',can_review:role==='principal'&&!refundApproved}]:[]};
        }
        else if (path.endsWith('/payment-intents/00000000-0000-4000-8000-000000000433/reversal-requests')) {
          expect(route.request().postDataJSON()).toEqual({reason:'Verified original receipt requires correction'});
          correctionRequested=true;
          response={status:'pending_first_approval',message:'Correction requested. Two independent reviews are required.'};
        }
        else if (path.endsWith('/reconciliation/approval-requests/approval-fixture/approve')) {
          expect(role).toBe('principal');correctionExecuted=true;response={status:'approved'};
        }
        else if (path.endsWith('/reconciliation/approval-requests')) response=correctionRequested?[{
          id:'approval-fixture',action:'reversal',status:correctionExecuted?'approved':role==='principal'?'pending_second_approval':'pending_first_approval',amount_minor:'15000',
          reason:'Verified original receipt requires correction',can_approve:role==='principal'&&!correctionExecuted,can_cancel:!correctionExecuted,
          execution:correctionExecuted?{reversal_ledger_transaction_id:'fixture-ledger'}:null,
        }]:[];
        else if (path.endsWith("/collection-channel-summary"))
          response = {
            total: 1,
            pending_approval: revision.status === "pending_approval" ? 1 : 0,
            awaiting_connection: revision.status === "approved" ? 1 : 0,
            ready: 0,
            active: 0,
            sandbox: 0,
            attention: 0,
          };
        else if (path.endsWith("/collection-providers"))
          response = [
            {
              code: "equity",
              name: "Equity",
              channel_kinds: ["bank_account"],
              connection_modes: ["statement"],
              credential_fields: [],
            },
          ];
        else if (path.endsWith("/decision")) {
          expect(role).toBe("principal");
          expect(route.request().postDataJSON().reason).toBe(
            "Verified against school bank records",
          );
          revision.status = "approved";
          response = revision;
        } else if (path.endsWith("/collection-channels"))
          response =
            url.searchParams.get("status") === "pending_approval" &&
            revision.status !== "pending_approval"
              ? []
              : [revision];
        else if (path.endsWith("/principal/approvals"))
          response = {
            pendingTotal: 0,
            urgentApprovals: 0,
            requests: [],
            categories: [],
            recentApprovals: [],
          };
        else if (path.endsWith("/principal/exams"))
          response = { reportsPending: 0, recentResults: [] };
        else if (path.endsWith("/notifications/badges"))
          response = {
            unreadCount: 1,
            urgentCount: 0,
            byModule: { finance: 1 },
          };
        else if (path.endsWith("/notifications"))
          response = [
            {
              id: "notice-a",
              title: "Payment setup requested",
              message: "Review your school fees account",
              status: "ACTION_REQUIRED",
              actionUrl: `/payment-setup?revision=${revision.id}`,
              actionLabel: "Review payment setup",
            },
          ];
        else if (
          path.endsWith("/school-profile") ||
          path.endsWith("/school/identity")
        )
          response = { schoolName: "Fixture School" };
        else if (path.endsWith("/principal/dashboard"))
          response = {
            tenant_id: school,
            generated_at: new Date().toISOString(),
            enabled_modules: ["finance"],
            alerts: [],
            notifications: [],
            realtime_channels: [],
          };
        await route.fulfill({ json: response });
      });
      await page.goto(
        `/school/${role}/${role === "principal" ? "approvals" : "payment-setup"}`,
      );
      await expect(
        page.getByRole("heading", { name: role === 'principal' ? 'Payment setup approvals' : 'School payment channels' }),
      ).toBeVisible();
      await expect(
        page.getByText("School fees account", { exact: true }),
      ).toBeVisible();
      if (role === "principal") {
        await expect(page.getByText("Payment setup", { exact: true })).toBeVisible();
        await expect(page.getByText("All caught up! No pending approvals.")).toHaveCount(0);
        await page
          .getByRole("button", { name: "Review request", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Approve destination" }),
        ).toBeDisabled();
        await page
          .getByLabel("Decision reason")
          .fill("Verified against school bank records");
        await page.getByLabel(/I have verified/).check();
        await page.getByRole("button", { name: "Approve destination" }).click();
        await expect(
          page.getByText("Payment setup approved and removed from this queue."),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Review request", exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByRole("button", { name: "Add payment channel" }),
        ).toBeEnabled();
        await expect(
          page.getByRole("button", { name: "Review request", exact: true }),
        ).toHaveCount(0);
      }
      await page
        .getByRole("button", { name: "Open school notifications", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Review payment setup", exact: true })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`/school/${role}/payment-setup\\?revision=${revision.id}$`),
      );
      await expect(
        page.getByText("Showing the setup linked from your notification."),
      ).toBeVisible();
      await expect(
        page.getByText("School fees account", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "View all setups" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "View all setups" }).click();
      await expect(page.getByLabel("Show setups")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(errors).toEqual([]);
      await page.screenshot({
        path: `../../artifacts/payment-dashboard/${role}-${width}.png`,
        fullPage: true,
      });
      if(role!=='principal') {
        await page.goto(`/school/${role}/payments`);
        await page.getByRole('button',{name:'Record refund evidence',exact:true}).filter({visible:true}).click();
        await page.getByLabel('Outgoing payment reference').fill('REFUND-PROOF');
        await page.getByLabel('Refund paid at').fill('2026-01-10T10:00');
        await page.getByLabel('Evidence location and details').fill('Original bank statement page 3');
        await page.getByLabel('Reason',{exact:true}).fill('Full authorized refund');
        await page.getByRole('checkbox',{name:/I checked the full amount/}).check();
        await page.getByRole('button',{name:'Submit evidence',exact:true}).click();
        await expect(page.getByText(/Awaiting independent Principal review/)).toBeVisible();
        await expect(page.getByRole('dialog')).toBeInViewport({ratio:1});
        await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.getByRole('button',{name:'Request reversal',exact:true}).filter({visible:true}).click();
        await expect(page.getByText(/Two independent reviewers/)).toBeVisible();
        await page.getByLabel('Reason',{exact:true}).fill('Verified original receipt requires correction');
        await page.getByRole('button',{name:'Request approval',exact:true}).click();
        await expect(page.getByText('Correction requested. Two independent reviews are required.')).toBeVisible();
        await page.goto(`/school/${role}/collections`);
        await page.getByRole('button',{name:'M-Pesa reconciliation reviews',exact:true}).click();
        await page.getByRole('button',{name:'Approval requests',exact:true}).click();
        await expect(page.getByText('Verified original receipt requires correction',{exact:true})).toBeVisible();
        await expect(page.getByRole('button',{name:'Review request',exact:true})).toHaveCount(0);
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        await expect(page.getByRole('dialog')).toBeInViewport({ratio:1});
        await expect(page.getByRole('button',{name:'Close',exact:true})).toBeInViewport({ratio:1});
        await page.screenshot({path:`../../artifacts/payment-dashboard/stk-review-${role}-${width}.png`});
      } else {
        correctionRequested=true;
        await page.goto('/school/principal/collections');
        await page.getByRole('button',{name:'Refund evidence',exact:true}).click();
        await page.getByRole('button',{name:'Review evidence',exact:true}).click();
        await page.getByLabel('Review notes').fill('Checked original payout evidence');
        await page.getByRole('checkbox',{name:/I checked the full amount/}).check();
        await page.getByRole('button',{name:'Confirm decision',exact:true}).click();
        await expect(page.getByText(/Refund evidence approved/)).toBeVisible();
        await expect(page.getByRole('dialog')).toBeInViewport({ratio:1});
        await page.screenshot({path:`../../artifacts/payment-dashboard/refund-review-${width}.png`});
        await page.getByRole('button',{name:'Close',exact:true}).click();
        await page.getByRole('button',{name:'M-Pesa reconciliation reviews',exact:true}).click();
        await page.getByRole('button',{name:'Approval requests',exact:true}).click();
        await page.getByRole('button',{name:'Final review',exact:true}).click();
        await expect(page.getByRole('button',{name:'Confirm approval',exact:true})).toBeDisabled();
        await page.getByRole('checkbox',{name:/I have checked the payment/}).check();
        await page.getByRole('button',{name:'Confirm approval',exact:true}).click();
        await expect(page.getByText('Correction executed and financial result verified.')).toBeVisible();
        expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        expect(errors).toEqual([]);
        await expect(page.getByRole('dialog')).toBeInViewport({ratio:1});
        await expect(page.getByRole('button',{name:'Close',exact:true})).toBeInViewport({ratio:1});
        await page.screenshot({path:`../../artifacts/payment-dashboard/stk-review-${role}-${width}.png`});
      }
      await page.getByRole('button',{name:'Close',exact:true}).click();
      if(role!=='principal') {
        await page.goto(`/school/${role}/invoices`);
        await page.getByRole('button',{name:'Learner balances',exact:true}).click();
        await page.getByRole('button',{name:'Refund credit',exact:true}).filter({visible:true}).click();
        await page.getByLabel('Credit receipt').selectOption('manual:00000000-0000-4000-8000-000000000434');
        await page.getByLabel('Refund amount (KES)').fill('12');
        await page.getByLabel('Reason',{exact:true}).fill('Return unused school fees');
        await page.getByRole('dialog').getByRole('checkbox').check();
        await page.getByRole('button',{name:'Request refund',exact:true}).click();
        await expect(page.getByText(/Credit reserved for independent Principal review/)).toBeVisible();
        await page.getByRole('button',{name:'Close',exact:true}).click();
        creditStatus='approved';
        await page.goto(`/school/${role}/collections`);
      }
      await page.getByRole('button',{name:'Credit refunds',exact:true}).click();
      if(role==='principal') {
        await page.getByRole('button',{name:'Review refund',exact:true}).click();
        await page.getByLabel('Reason',{exact:true}).fill('Checked original payer and unused credit');
        await page.getByRole('dialog').getByRole('checkbox').check();
        await page.getByRole('button',{name:'Confirm decision',exact:true}).click();
        await expect(page.getByText(/Refund approved. Return the approved amount/)).toBeVisible();
      }
      await page.getByRole('button',{name:'Record payout',exact:true}).click();
      await page.getByLabel('Outgoing payment reference').fill('CREDIT-PAYOUT');
      await page.getByLabel('Paid at',{exact:true}).fill('2026-10-25T10:00');
      await page.getByLabel('Evidence location and details').fill('Bank debit advice in finance register');
      await page.getByRole('dialog').getByRole('checkbox').check();
      await expect(page.getByRole('dialog')).toBeInViewport({ratio:1});
      await expect(page.getByRole('button',{name:'Confirm payout',exact:true})).toBeInViewport({ratio:1});
      await page.screenshot({path:`../../artifacts/payment-dashboard/credit-refund-${role}-${width}.png`});
      await page.getByRole('button',{name:'Confirm payout',exact:true}).click();
      await expect(page.getByText(/Payout recorded. The fee statement/)).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

for (const width of [1440, 390]) {
  test(`Super Admin connects an approved account and refreshes queue counts at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.context().addCookies([{ name: SUPERADMIN_SESSION_COOKIE,
      value: serializeExperienceSession({ experience: "superadmin", homePath: "/superadmin/dashboard", userLabel: "Fixture Owner" }),
      url: "http://127.0.0.1:3005" }]);
    const revision = { id: "00000000-0000-4000-8000-000000000422", tenant_id: "payment-dashboard-fixture", school_name: "Fixture School", provider_code: "equity", channel_kind: "bank_account", display_name: "School fees account", account_name: "Fixture School", account_number: "0123456789", bank_name: "Equity", status: "approved", reason: "School fees collection", requested_by: "accountant", created_at: "2026-09-30T08:00:00Z", connection_mode: "statement", environment: "production", last_test_status: "" };
    await page.route("**/api/**", async route => {
      const path = new URL(route.request().url()).pathname;
      let response: unknown = [];
      if (path === "/api/auth/csrf") response = { token: "local-fixture-csrf" };
      else if (path === '/api/legal/access') response={ready:true};
      else if (path.endsWith("/payment-integrations/summary")) response = { total: 1, pending_approval: 0, awaiting_connection: revision.status === "active" ? 0 : 1, ready: revision.status === "ready" ? 1 : 0, active: revision.status === "active" ? 1 : 0, sandbox: 0, attention: 0 };
      else if (path.endsWith("/payment-integrations/providers")) response = [{ code: "equity", name: "Equity", description: "Statement review", channel_kinds: ["bank_account"], connection_modes: ["statement"], credential_fields: [] }];
      else if (path.endsWith("/payment-integrations")) response = [revision];
      else if (path.endsWith("/connect")) { revision.status = "connecting"; response = revision; }
      else if (path.endsWith("/test")) { revision.status = "ready"; revision.last_test_status = "statement_review_ready"; response = revision; }
      else if (path.endsWith("/activate")) { revision.status = "active"; response = revision; }
      await route.fulfill({ json: response });
    });
    await page.goto("/superadmin/gateways");
    const summary = page.getByRole("region", { name: "Payment integration queue" });
    await expect(summary.getByText("Awaiting Super Admin").locator("..")).toHaveText("Awaiting Super Admin1");
    await page.getByRole("button", { name: "Connect channel", exact: true }).click();
    await expect(page.getByLabel("Connection method")).toHaveValue("statement");
    await page.getByRole("button", { name: "Save connection" }).click();
    await page.getByRole("button", { name: "Check connection" }).click();
    await expect(summary.getByText("Ready to activate").locator("..")).toHaveText("Ready to activate1");
    await page.getByRole("button", { name: "Activate channel" }).click();
    await expect(summary.getByText("Awaiting Super Admin").locator("..")).toHaveText("Awaiting Super Admin0");
    await expect(summary.getByText("Live channels").locator("..")).toHaveText("Live channels1");
    await expect(page.getByText("Active — statement review required", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `../../artifacts/payment-dashboard/superadmin-${width}.png`, fullPage: true });
  });
}
