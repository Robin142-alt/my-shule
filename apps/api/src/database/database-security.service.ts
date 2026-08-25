import { Inject, Injectable, Logger, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import format from 'pg-format';
import { Pool } from 'pg';

import { DATABASE_POOL } from './database.constants';
import { retryDatabaseOperation } from './database-retry';

interface CurrentRoleState {
  current_user: string;
  session_user: string;
  rolsuper: boolean;
  rolbypassrls: boolean;
}

interface ManagedFunctionState {
  signature: string;
  owner_name: string;
  security_definer: boolean;
}

const MANAGED_SECURITY_DEFINER_FUNCTIONS = [
  'app.claim_outbox_events(integer,integer)',
  'app.claim_communication_sms_outbox(integer,integer)',
  'app.find_user_by_email_for_auth(text)',
  'app.find_active_memberships_by_user_for_auth(uuid)',
  'app.find_platform_owner_by_email_for_auth(text)',
  'app.find_platform_owner_by_id_for_auth(uuid)',
  'app.create_global_user_from_invitation(text,text,text)',
  'app.find_user_for_password_recovery(text,text,text,text)',
  'app.create_password_recovery_action(text,uuid,text,text,timestamptz,text,jsonb)',
  'app.create_email_verification_action(text,uuid,text,text,timestamptz,text,jsonb)',
  'app.mark_auth_email_outbox_delivery(uuid,text,text,text,integer)',
  'app.consume_password_recovery_action(text,text)',
  'app.consume_email_verification_action(text)',
  'app.consume_invite_acceptance_action(text,text,text,text)',
  'app.find_daraja_integration_by_id_for_callback(uuid)',
  'app.find_parent_auth_subject_for_otp(text,text)',
] as const;

const WORKER_ONLY_SECURITY_DEFINER_FUNCTIONS = [
  'app.claim_outbox_events(integer,integer)',
  'app.claim_communication_sms_outbox(integer,integer)',
] as const;

@Injectable()
export class DatabaseSecurityService implements OnModuleInit, OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSecurityService.name);
  private runtimeRoleName: string | null = null;
  private currentUserName: string | null = null;

  constructor(
    @Inject(DATABASE_POOL) private readonly pool: Pool,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await retryDatabaseOperation(
      this.logger,
      'Database security bootstrap',
      Number(this.configService.get<number>('database.connectMaxRetries') ?? 10),
      Number(this.configService.get<number>('database.connectRetryDelayMs') ?? 2000),
      async () => {
        await this.pool.query('CREATE SCHEMA IF NOT EXISTS app');

        const currentRoleState = await this.getCurrentRoleState();
        this.currentUserName = currentRoleState.current_user;

        if (!currentRoleState.rolbypassrls) {
          this.logger.log(
            `Database role "${currentRoleState.current_user}" does not bypass RLS; runtime role delegation is not required`,
          );
          return;
        }

        const configuredRuntimeRole =
          this.configService.get<string>('database.runtimeRole')?.trim() || 'my_shule_runtime';

        await this.ensureRuntimeRole(configuredRuntimeRole, currentRoleState.current_user);
        await this.grantRuntimeRolePrivileges(configuredRuntimeRole);

        this.runtimeRoleName = configuredRuntimeRole;
        this.logger.warn(
          `Database role "${currentRoleState.current_user}" bypasses RLS; request transactions will assume runtime role "${configuredRuntimeRole}"`,
        );
      },
    );
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.repairManagedFunctionOwnership();

    if (this.runtimeRoleName) {
      await this.grantRuntimeRolePrivileges(this.runtimeRoleName);
    }
  }

  getRuntimeRoleName(): string | null {
    if (!this.runtimeRoleName || this.runtimeRoleName === this.currentUserName) {
      return null;
    }

    return this.runtimeRoleName;
  }

  private async ensureRuntimeRole(runtimeRoleName: string, currentUserName: string): Promise<void> {
    const existingRole = await this.pool.query<{ rolname: string }>(
      `
        SELECT rolname
        FROM pg_roles
        WHERE rolname = $1
        LIMIT 1
      `,
      [runtimeRoleName],
    );

    if (!existingRole.rows[0]) {
      await this.pool.query(format('CREATE ROLE %I NOLOGIN NOBYPASSRLS', runtimeRoleName));
    }

    await this.pool.query(format('ALTER ROLE %I NOBYPASSRLS NOLOGIN', runtimeRoleName));
    await this.pool.query(format('GRANT %I TO %I', runtimeRoleName, currentUserName));
  }

  private async grantRuntimeRolePrivileges(runtimeRoleName: string): Promise<void> {
    await this.pool.query(format('GRANT USAGE ON SCHEMA public TO %I', runtimeRoleName));
    await this.pool.query(format('GRANT USAGE ON SCHEMA app TO %I', runtimeRoleName));
    await this.pool.query(
      format('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I', runtimeRoleName),
    );
    await this.pool.query(
      format('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', runtimeRoleName),
    );
    await this.pool.query(
      format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO %I', runtimeRoleName),
    );
    await this.pool.query(
      format('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO %I', runtimeRoleName),
    );
    await this.pool.query(
      format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
        this.currentUserName ?? 'current_user',
        runtimeRoleName,
      ),
    );
    await this.pool.query(
      format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
        this.currentUserName ?? 'current_user',
        runtimeRoleName,
      ),
    );
    await this.pool.query(
      format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO %I',
        this.currentUserName ?? 'current_user',
        runtimeRoleName,
      ),
    );
    await this.pool.query(
      format(
        'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO %I',
        this.currentUserName ?? 'current_user',
        runtimeRoleName,
      ),
    );

    for (const functionSignature of WORKER_ONLY_SECURITY_DEFINER_FUNCTIONS) {
      const existingFunction = await this.pool.query<{ signature: string }>(
        'SELECT to_regprocedure($1)::text AS signature WHERE to_regprocedure($1) IS NOT NULL',
        [functionSignature],
      );

      if (existingFunction.rows[0]) {
        await this.pool.query(
          format('REVOKE EXECUTE ON FUNCTION %s FROM %I', functionSignature, runtimeRoleName),
        );
      }
    }
  }

  private async repairManagedFunctionOwnership(): Promise<void> {
    if (!this.currentUserName) {
      return;
    }

    let repairedCount = 0;

    for (const functionSignature of MANAGED_SECURITY_DEFINER_FUNCTIONS) {
      const result = await this.pool.query<ManagedFunctionState>(
        `
          SELECT
            p.oid::regprocedure::text AS signature,
            pg_get_userbyid(p.proowner) AS owner_name,
            p.prosecdef AS security_definer
          FROM pg_proc p
          WHERE p.oid = to_regprocedure($1)
          LIMIT 1
        `,
        [functionSignature],
      );
      const state = result.rows[0];

      if (!state || !state.security_definer || state.owner_name === this.currentUserName) {
        continue;
      }

      await this.pool.query(
        format('ALTER FUNCTION %s OWNER TO %I', functionSignature, this.currentUserName),
      );
      repairedCount += 1;
    }

    if (repairedCount > 0) {
      this.logger.warn(
        `Repaired ownership for ${repairedCount} managed SECURITY DEFINER function(s) after database migration`,
      );
    }
  }

  private async getCurrentRoleState(): Promise<CurrentRoleState> {
    const result = await this.pool.query<CurrentRoleState>(`
      SELECT
        current_user AS current_user,
        session_user AS session_user,
        r.rolsuper,
        r.rolbypassrls
      FROM pg_roles r
      WHERE r.rolname = current_user
      LIMIT 1
    `);

    const currentRoleState = result.rows[0];

    if (!currentRoleState) {
      throw new Error('Unable to determine current PostgreSQL role state');
    }

    return currentRoleState;
  }
}
