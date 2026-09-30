import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import {
  ForbiddenException,
  ValidationPipe,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DEFAULT_ROLE_CATALOG } from "../../auth/auth.constants";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { RbacGuard } from "../../guards/rbac.guard";
import {
  PaymentChannelWorkflowController,
  PlatformPaymentIntegrationsController,
} from "./payment-channel-workflow.controller";
import { CollectionPaymentsController } from "../payments/collection-payments.controller";
import { PaymentChannelQueryDto } from "./dto/payment-channel-query.dto";

const handlers = [
  [
    PaymentChannelWorkflowController,
    PaymentChannelWorkflowController.prototype.decide,
  ],
  [
    CollectionPaymentsController,
    CollectionPaymentsController.prototype.decision,
  ],
  [
    CollectionPaymentsController,
    CollectionPaymentsController.prototype.reversalDecision,
  ],
] as const;

for (const [controller, handler] of handlers) {
  test(`default Principal can reach ${controller.name}.${handler.name}; ordinary billing writers cannot`, async () => {
    const context = new RequestContextService();
    const guard = new RbacGuard(new Reflector(), context);
    const execution = {
      getClass: () => controller,
      getHandler: () => handler,
    } as unknown as ExecutionContext;
    for (const role of [
      "principal",
      "accountant",
      "bursar",
      "parent",
      "student",
    ]) {
      const permissions = DEFAULT_ROLE_CATALOG.find(
        (item) => item.code === role,
      )!.permissions;
      await context.run(
        {
          request_id: "test",
          tenant_id: "school-a",
          user_id: "actor",
          role,
          permissions,
          is_authenticated: true,
          session_id: null,
          client_ip: null,
          user_agent: null,
          method: "POST",
          path: "/test",
          started_at: new Date().toISOString(),
        },
        async () => {
          if (role === "principal") {
            assert.equal(permissions.includes("billing:write"), false);
            assert.equal(guard.canActivate(execution), true);
          } else
            assert.throws(
              () => guard.canActivate(execution),
              ForbiddenException,
            );
        },
      );
    }
  });
}

test("dashboard list filters validate page bounds and revision identity without accepting tenant overrides", async () => {
  const pipe = new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const validate = (value: object) =>
    pipe.transform(value, { type: "query", metatype: PaymentChannelQueryDto });
  const query = await validate({
    status: "connection",
    limit: "50",
    offset: "100",
    audience: "superadmin",
  });
  assert.equal(query.limit, 50);
  assert.equal(query.offset, 100);
  for (const value of [
    { limit: "101" },
    { offset: "-1" },
    { revision: "bogus" },
    { tenant_id: "another-school" },
    { status: "bogus" },
  ]) {
    await assert.rejects(() => validate(value));
  }
});

test("platform payment queue retains platform-owner RBAC", () => {
  const context = new RequestContextService();
  const guard = new RbacGuard(new Reflector(), context);
  const execution = {
    getClass: () => PlatformPaymentIntegrationsController,
    getHandler: () => PlatformPaymentIntegrationsController.prototype.summary,
  } as unknown as ExecutionContext;
  context.run(
    {
      request_id: "test",
      tenant_id: "school-a",
      user_id: "actor",
      role: "principal",
      permissions: ["principal:write", "billing:read"],
      is_authenticated: true,
      session_id: null,
      client_ip: null,
      user_agent: null,
      method: "GET",
      path: "/test",
      started_at: new Date().toISOString(),
    },
    () => assert.throws(() => guard.canActivate(execution), ForbiddenException),
  );
});
