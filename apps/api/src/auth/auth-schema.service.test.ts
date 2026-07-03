import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthSchemaService } from './auth-schema.service';

test('AuthSchemaService qualifies password recovery token columns inside the consume function', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(
    bootstrapSql,
    /SELECT\s+token\.id,\s*token\.user_id,\s*token\.email,\s*token\.tenant_id[\s\S]+FROM auth_action_tokens token/,
  );
});

test('AuthSchemaService allows school password recovery to resolve one active tenant user without a usable tenant slug', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  const recoveryLookupFunction = bootstrapSql.match(
    /CREATE OR REPLACE FUNCTION app\.find_user_for_password_recovery[\s\S]+?\$\$;/,
  )?.[0] ?? '';

  assert.match(recoveryLookupFunction, /matching_recovery_users/);
  assert.match(recoveryLookupFunction, /u\.tenant_id <> 'global'/);
  assert.match(recoveryLookupFunction, /count\(\*\)[\s\S]+=\s*1/i);
});

test('AuthSchemaService links accepted parent invitations to student guardian rows', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  const consumeInviteFunction = bootstrapSql.match(
    /CREATE OR REPLACE FUNCTION app\.consume_invite_acceptance_action[\s\S]+?\$\$;/,
  )?.[0] ?? '';

  assert.match(consumeInviteFunction, /IF invite_role_code = 'parent' THEN[\s\S]+UPDATE student_guardians/);
  assert.match(consumeInviteFunction, /user_id = invited_user_id/);
  assert.match(consumeInviteFunction, /lower\(email\) = lower\(invite_email\)/);
  assert.match(consumeInviteFunction, /status = 'active'/);
});

test('AuthSchemaService marks accepted invitations and active school memberships', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  const consumeInviteFunction = bootstrapSql.match(
    /CREATE OR REPLACE FUNCTION app\.consume_invite_acceptance_action[\s\S]+?\$\$;/,
  )?.[0] ?? '';

  assert.match(consumeInviteFunction, /status = 'active'/);
  assert.match(consumeInviteFunction, /full_name,\s*display_name/);
  assert.match(consumeInviteFunction, /full_name = invite_display_name/);
  assert.match(consumeInviteFunction, /ON CONFLICT \(tenant_id, user_id\)[\s\S]+status = 'active'/);
  assert.match(consumeInviteFunction, /metadata = auth_action_tokens\.metadata \|\| jsonb_build_object\([\s\S]*'status',\s*'accepted'[\s\S]*'accepted_at'/);
  assert.match(consumeInviteFunction, /consumed_at = NOW\(\)/);
});

test('AuthSchemaService resolves invite acceptance column-name conflicts', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  const consumeInviteFunction = bootstrapSql.match(
    /CREATE OR REPLACE FUNCTION app\.consume_invite_acceptance_action[\s\S]+?\$\$;/,
  )?.[0] ?? '';

  assert.match(consumeInviteFunction, /#variable_conflict use_column/);
  assert.match(consumeInviteFunction, /ON CONFLICT \(tenant_id, user_id\)/);
});

test('AuthSchemaService checks expected tenant before consuming invitation tokens', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  const consumeInviteFunction = bootstrapSql.match(
    /CREATE OR REPLACE FUNCTION app\.consume_invite_acceptance_action[\s\S]+?\$\$;/,
  )?.[0] ?? '';

  assert.match(bootstrapSql, /DROP FUNCTION IF EXISTS app\.consume_invite_acceptance_action\(text,\s*text,\s*text\)/);
  assert.match(consumeInviteFunction, /input_expected_tenant_id text/);
  assert.match(consumeInviteFunction, /NULLIF\(input_expected_tenant_id,\s*''\) IS NOT NULL/);
  assert.match(consumeInviteFunction, /NULLIF\(input_expected_tenant_id,\s*''\) <> invite_tenant_id/);
  assert.match(consumeInviteFunction, /RAISE EXCEPTION 'Invitation tenant mismatch'/);
  assert.ok(
    consumeInviteFunction.indexOf('Invitation tenant mismatch') <
      consumeInviteFunction.indexOf('UPDATE auth_action_tokens'),
  );
});

test('AuthSchemaService defines email verification token functions and route policies', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(bootstrapSql, /CREATE OR REPLACE FUNCTION app\.create_email_verification_action/);
  assert.match(bootstrapSql, /CREATE OR REPLACE FUNCTION app\.consume_email_verification_action/);
  assert.match(bootstrapSql, /purpose = 'email_verification'/);
  assert.match(bootstrapSql, /\/auth\/email-verification\//);
});

test('AuthSchemaService persists safe email outbox delivery diagnostics for platform invites', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(bootstrapSql, /last_error_code text/);
  assert.match(bootstrapSql, /last_error_summary text/);
  assert.match(bootstrapSql, /provider_status_code integer/);
  assert.match(bootstrapSql, /input_error_code text DEFAULT NULL/);
  assert.match(bootstrapSql, /input_provider_status_code integer DEFAULT NULL/);
  assert.match(bootstrapSql, /request_path NOT LIKE '%\/auth\/invitations%'/);
  assert.match(bootstrapSql, /\/platform\/schools/);
  assert.match(bootstrapSql, /ck_auth_email_outbox_provider_status_code/);
});

test('AuthSchemaService removes legacy email outbox delivery overloads before recreating the current function', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(bootstrapSql, /DROP FUNCTION IF EXISTS app\.mark_auth_email_outbox_delivery\(uuid,\s*text\)/);
  assert.match(bootstrapSql, /DROP FUNCTION IF EXISTS app\.mark_auth_email_outbox_delivery\(text,\s*text\)/);
  assert.match(bootstrapSql, /CREATE OR REPLACE FUNCTION app\.mark_auth_email_outbox_delivery/);
});

test('AuthSchemaService does not grant broad public path access to auth token tables', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  const authTokenPolicy = bootstrapSql.match(
    /CREATE POLICY auth_action_tokens_rls_policy[\s\S]+?CREATE POLICY auth_email_outbox_rls_policy/,
  )?.[0] ?? '';
  const emailOutboxPolicy = bootstrapSql.match(
    /CREATE POLICY auth_email_outbox_rls_policy[\s\S]+?DROP POLICY IF EXISTS auth_mfa_challenges_rls_policy/,
  )?.[0] ?? '';

  assert.match(authTokenPolicy, /app\.auth_action_token_operation/);
  assert.match(emailOutboxPolicy, /app\.auth_email_outbox_operation/);
  assert.doesNotMatch(authTokenPolicy, /app\.path/);
  assert.doesNotMatch(emailOutboxPolicy, /app\.path/);
});

test('AuthSchemaService keeps invitation action tokens nullable until invite acceptance', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(bootstrapSql, /ALTER TABLE auth_action_tokens ALTER COLUMN user_id DROP NOT NULL/);
});

test('AuthSchemaService returns auth security state from user lookup functions', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(
    bootstrapSql,
    /app\.find_user_by_email_for_auth[\s\S]+email_verified_at timestamptz[\s\S]+mfa_enabled boolean[\s\S]+mfa_verified_at timestamptz/,
  );
  assert.match(
    bootstrapSql,
    /app\.create_global_user_from_invitation[\s\S]+users\.email_verified_at[\s\S]+users\.mfa_enabled[\s\S]+users\.mfa_verified_at/,
  );
  assert.match(
    bootstrapSql,
    /app\.create_global_user_from_invitation[\s\S]+INSERT INTO users \(tenant_id, email, password_hash, full_name, display_name, status, email_verified_at\)/,
  );
});

test('AuthSchemaService creates MFA, trusted-device, and magic-link persistence', async () => {
  let bootstrapSql = '';
  const service = new AuthSchemaService({
    runSchemaBootstrap: async (sql: string) => {
      bootstrapSql = sql;
    },
  } as never);

  await service.onModuleInit();

  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS auth_mfa_challenges/);
  assert.match(bootstrapSql, /CREATE TABLE IF NOT EXISTS auth_trusted_devices/);
  assert.match(bootstrapSql, /'magic_login'/);
  assert.match(bootstrapSql, /ALTER TABLE auth_mfa_challenges FORCE ROW LEVEL SECURITY/);
  assert.match(bootstrapSql, /ALTER TABLE auth_trusted_devices FORCE ROW LEVEL SECURITY/);
});
