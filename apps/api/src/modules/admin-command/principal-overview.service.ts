import { Controller, Get, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { PrismaService } from '../../database/prisma.service';
import { RequiresModule } from '../module-access/module-access.decorator';
import { ModuleAccessService } from '../module-access/module-access.service';
import { PRINCIPAL_FEE_BALANCES_SQL } from "./principal-fee-balances";
import { RECEPTION_QUEUE_SQL, receptionEntry } from './reception-queue';

type Section<T> = { state: 'ready'; data: T } | { state: 'error' | 'locked' | 'hidden' };

@Injectable()
export class PrincipalOverviewService {
  private readonly logger = new Logger(PrincipalOverviewService.name);
  constructor(private readonly context: RequestContextService, private readonly prisma: PrismaService,
    private readonly modules: ModuleAccessService) {}

  async getDetails() {
    const actor = this.context.getStore();
    if (!actor?.is_authenticated || !actor.tenant_id || !actor.user_id) {
      throw new UnauthorizedException("A verified school session is required");
    }
    const tenant = actor.tenant_id;
    const enabled = await this.modules.listCurrentTenantModules();
    const allows = (permission: string) =>
      actor.permissions.some(
        (p) =>
          p === "*:*" ||
          p === "*" ||
          p === permission ||
          p === `${permission.split(":")[0]}:*`,
      );
    const read = <T>(sql: string, params: unknown[] = []) =>
      this.prisma.executeWithTenant(tenant, actor.user_id, (tx) =>
        tx.$queryRawUnsafe<T[]>(sql, tenant, ...params),
      );
    const section = async <T>(
      label: string,
      permitted: boolean,
      load: () => Promise<T>,
    ): Promise<Section<T>> => {
      if (!permitted) return { state: "locked" };
      try {
        return { state: "ready", data: await load() };
      } catch {
        this.logger.warn(`Principal overview ${label} could not be loaded`);
        return { state: "error" };
      }
    };

    const [calendar, lessons, health, visitors, finance] = await Promise.all([
      section("calendar", true, async () => {
        const rows = await read<{
          name: string;
          year: string;
          week: number;
          weeks: number;
          days_left: number;
        }>(`
          SELECT term.name, year.name AS year,
            ((timezone('Africa/Nairobi', NOW())::date - term.starts_on) / 7 + 1)::int AS week,
            CEIL((term.ends_on - term.starts_on + 1) / 7.0)::int AS weeks,
            (term.ends_on - timezone('Africa/Nairobi', NOW())::date)::int AS days_left
          FROM academic_terms term JOIN academic_years year
            ON year.tenant_id=term.tenant_id AND year.id::text=term.academic_year_id::text
          WHERE term.tenant_id=$1 AND term.status='active' AND term.archived_at IS NULL
            AND year.archived_at IS NULL
            AND timezone('Africa/Nairobi', NOW())::date BETWEEN term.starts_on AND term.ends_on
          ORDER BY term.starts_on DESC, term.id LIMIT 1
        `);
        return rows[0] ?? null;
      }),
      section("lessons", allows("academics:read"), async () => {
        const rows = await read<{
          taught: number;
          recorded: number;
        }>(`/* overview:lessons */
          SELECT COUNT(*) FILTER (WHERE lesson_status='taught')::int AS taught, COUNT(*)::int AS recorded
          FROM academics_lesson_logs WHERE tenant_id=$1
            AND log_date=timezone('Africa/Nairobi', NOW())::date
        `);
        return rows[0];
      }),
      section("health", allows("clinic:reports"), async () => {
        const rows = await read<{ cases: number }>(`/* overview:health */
          SELECT COUNT(*)::int AS cases FROM clinic_visits
          WHERE tenant_id=$1 AND visit_date::date=timezone('Africa/Nairobi', NOW())::date
        `);
        return rows[0];
      }),
      section("visitors", true, async () => {
        const rows = await read<Parameters<typeof receptionEntry>[0]>(
          `${RECEPTION_QUEUE_SQL}
          AND lower(status) IN ('pending','waiting')
          AND (payload->>'host_user_id'=$2 OR payload->>'target_user_id'=$2
            OR (NULLIF(COALESCE(payload->>'host_user_id',payload->>'target_user_id'),'') IS NULL
              AND (lower(payload->>'person_to_see')='principal' OR payload->>'target_role'='principal')))
          ORDER BY created_at ASC, id ASC
        `,
          [actor.user_id],
        );
        return rows.map((row) => receptionEntry(row));
      }),
      enabled.includes("finance")
        ? section("finance", allows("finance:read"), async () => {
            const rows = await read<{
              collected_today_minor: string;
              arrears_minor: string;
            }>(PRINCIPAL_FEE_BALANCES_SQL);
            return {
              collectedTodayMinor: rows[0].collected_today_minor,
              arrearsMinor: rows[0].arrears_minor,
              currency: "KES",
            };
          })
        : Promise.resolve({ state: "hidden" } as const),
    ]);
    return {
      generatedAt: new Date().toISOString(),
      calendar,
      lessons,
      health,
      visitors,
      finance,
    };
  }
}

@Controller('admin-command/principal')
@RequiresModule('admin_command_centers', 'principal_dashboard')
@Permissions('principal:read')
export class PrincipalOverviewController {
  constructor(private readonly overview: PrincipalOverviewService) {}
  @Get('overview-details')
  getDetails() { return this.overview.getDetails(); }
}
