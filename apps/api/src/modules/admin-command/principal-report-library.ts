import {
  BadRequestException,
  Body,
  Post,
  Optional,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Injectable,
  Param,
  Query,
  StreamableFile,
  UnauthorizedException,
} from "@nestjs/common";
import { Permissions } from "../../auth/decorators/permissions.decorator";
import { RequestContextService } from "../../common/request-context/request-context.service";
import { ModuleAccessService } from "../module-access/module-access.service";
import { RequiresModule } from "../module-access/module-access.decorator";
import { AdminCommandOperationsService } from "./admin-command-operations.service";

import { AdminCommandRepository } from "./repositories/admin-command.repository";

const GENERATORS = [
  {
    id: "department_performance",
    module: "principal-academics",
    title: "Department performance report",
  },
  {
    id: "subject_register",
    module: "academics",
    title: "Subjects and departments",
  },
  {
    id: "attendance_register",
    module: "principal-attendance",
    title: "School attendance overview",
  },
  { id: "staff_summary", module: "staff", title: "Staff oversight report" },
  {
    id: "finance_summary",
    module: "finance",
    title: "School finance overview",
  },
] as const;
type Source = {
  label: string;
  module: string;
  permissions: string[];
  aliases: string[];
};
// Each saved report retains its source module's access boundary. Confidential
// counselling case notes are deliberately available only through their own service.
const SOURCES: Source[] = [
  {
    label: "Exams",
    module: "exams",
    permissions: ["exams:read"],
    aliases: ["exams", "exams-manager-command"],
  },
  {
    label: "Finance",
    module: "finance",
    permissions: ["finance:read"],
    aliases: [
      "finance",
      "billing",
      "accountant-command",
      "payments",
      "mpesa",
      "tenant-finance",
      "tenant_finance",
    ],
  },
  {
    label: "Academics",
    module: "academics",
    permissions: ["academics:read"],
    aliases: ["academics"],
  },
  {
    label: "Academic leadership",
    module: "academics",
    permissions: ["academics:read", "exams:read"],
    aliases: [
      "dean-academics-command",
      "hod-command",
      "teacher-command",
      "class-teacher-command",
      "grade-master",
    ],
  },
  {
    label: "Department performance",
    module: "exams",
    permissions: ["academics:read", "exams:read"],
    aliases: ["principal-academics"],
  },
  {
    label: "Learner attendance",
    module: "academics",
    permissions: ["academics:read", "students:read"],
    aliases: ["principal-attendance"],
  },
  {
    label: "Staff",
    module: "staff",
    permissions: ["hr:read"],
    aliases: ["staff", "hr"],
  },
  {
    label: "Discipline",
    module: "discipline",
    permissions: ["discipline:reports"],
    aliases: ["discipline", "discipline-master-command"],
  },
  {
    label: "Library",
    module: "library",
    permissions: ["library:read"],
    aliases: ["library", "librarian-command"],
  },
  {
    label: "Admissions",
    module: "admissions",
    permissions: ["admissions:read"],
    aliases: ["admissions", "admissions-command"],
  },
  {
    label: "Students",
    module: "students",
    permissions: ["students:read"],
    aliases: ["students"],
  },
  {
    label: "Timetable",
    module: "timetable",
    permissions: ["timetable:read"],
    aliases: ["timetable"],
  },
  {
    label: "Inventory",
    module: "inventory",
    permissions: ["inventory:read"],
    aliases: ["inventory", "storekeeper-command"],
  },
  {
    label: "Procurement",
    module: "procurement",
    permissions: ["procurement:read"],
    aliases: ["procurement", "procurement-officer-command"],
  },
  {
    label: "Transport",
    module: "transport",
    permissions: ["transport:read"],
    aliases: ["transport", "transport-manager-command"],
  },
  {
    label: "Boarding",
    module: "boarding",
    permissions: ["boarding:read"],
    aliases: ["boarding", "boarding-master-command"],
  },
  {
    label: "Laboratory",
    module: "lab_management",
    permissions: ["labs:read"],
    aliases: ["labs", "laboratory-technician-command"],
  },
  {
    label: "Health",
    module: "clinic_health",
    permissions: ["clinic:reports"],
    aliases: ["clinic"],
  },
  {
    label: "Nursing operations",
    module: "clinic_health",
    permissions: ["nurse:read"],
    aliases: ["nurse-command"],
  },
  {
    label: "Security",
    module: "visitor_management",
    permissions: ["security:read"],
    aliases: ["security-officer-command"],
  },
  {
    label: "Secretary",
    module: "visitor_management",
    permissions: ["secretary:read"],
    aliases: ["secretary-command"],
  },
  {
    label: "Communication",
    module: "communication_sms",
    permissions: ["school_sms:read"],
    aliases: ["communication", "school_sms", "school-sms"],
  },
  {
    label: "Leadership",
    module: "admin_command_centers",
    permissions: [
      "principal:read",
      "finance:read",
      "academics:read",
      "exams:read",
      "hr:read",
      "discipline:reports",
    ],
    aliases: ["admin-command", "admin_command", "deputy-command"],
  },
];

const STORED_FILE = `EXISTS(SELECT 1 FROM file_objects file WHERE file.tenant_id=snapshot.tenant_id
  AND file.sha256=snapshot.artifact->>'checksum_sha256'
  AND (file.retention_expires_at IS NULL OR file.retention_expires_at>now())
  AND (file.storage_path=snapshot.artifact->>'storage_path'
    OR (NULLIF(snapshot.artifact->>'storage_path','') IS NULL AND file.metadata->>'module'=snapshot.module AND file.metadata->>'report_id'=snapshot.report_id)))`;

@Injectable()
export class PrincipalReportLibraryService {
  constructor(
    private readonly context: RequestContextService,
    private readonly modules: ModuleAccessService,
    private readonly operations: AdminCommandOperationsService,
    @Optional() private readonly repository?: AdminCommandRepository,
  ) {}

  private async access() {
    const actor = this.context.requireStore();
    if (!actor.is_authenticated || !actor.tenant_id || !actor.user_id)
      throw new UnauthorizedException("A verified school session is required");
    if (!["principal", "owner", "school_admin"].includes(actor.role ?? ""))
      throw new ForbiddenException(
        "School leadership access is required for Principal reports",
      );
    const permits = (permission: string) =>
      actor.permissions.some(
        (saved) =>
          saved === "*:*" ||
          saved === permission ||
          saved === `${permission.split(":")[0]}:*`,
      );
    if (!permits("principal:read") || !permits("reports:read"))
      throw new ForbiddenException("Principal reports permission is required");
    const enabled = await this.modules.listCurrentTenantModules();
    const sources = SOURCES.filter(
      (source) =>
        enabled.includes(source.module) && source.permissions.every(permits),
    );
    return {
      actor,
      tenant: actor.tenant_id,
      sources,
      permits,
      aliases: sources.flatMap((source) => source.aliases),
    };
  }

  async list(query: Record<string, string | undefined>) {
    const { tenant, sources, aliases, permits } = await this.access();
    const offset = Number(query.offset ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000)
      throw new BadRequestException("Invalid report page");
    for (const key of ["from", "to"])
      if (
        query[key] &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(query[key]!) ||
          Number.isNaN(Date.parse(query[key]!)))
      )
        throw new BadRequestException("Choose a valid report date");
    if (query.from && query.to && query.from > query.to)
      throw new BadRequestException(
        "The ending date must follow the starting date",
      );
    if (query.module && !aliases.includes(query.module))
      throw new ForbiddenException(
        "This report source is not authorized or available",
      );
    const selected = query.module ? [query.module] : aliases;
    const [records, categories] = await Promise.all([
      this.operations.readSql(
        `SELECT snapshot.id::text,snapshot.snapshot_id,snapshot.module,snapshot.report_id,snapshot.title,snapshot.format,
        snapshot.created_at::text,COALESCE(author.display_name,'School staff') AS generated_by,
        COALESCE(snapshot.filters->>'period',snapshot.filters->>'academic_year',snapshot.manifest#>>'{filters,academic_year}') AS period,
        CASE WHEN (${STORED_FILE}) OR (jsonb_typeof(snapshot.artifact->'content_base64')='string'
          AND length(snapshot.artifact->>'content_base64')>0 AND snapshot.artifact->>'checksum_sha256' ~ '^[a-f0-9]{64}$'
          AND snapshot.artifact->>'byte_length' ~ '^[1-9][0-9]*$') THEN 'stored' ELSE 'unavailable' END AS status
        FROM report_snapshots snapshot
        LEFT JOIN users author ON author.id::text=snapshot.generated_by_user_id
          AND EXISTS(SELECT 1 FROM tenant_memberships member WHERE member.tenant_id=snapshot.tenant_id AND member.user_id=author.id)
        WHERE snapshot.tenant_id=$1 AND snapshot.module=ANY($2::text[])
          AND ($3::text IS NULL OR snapshot.title ILIKE '%'||$3||'%' OR snapshot.report_id ILIKE '%'||$3||'%')
          AND ($4::date IS NULL OR timezone('Africa/Nairobi',snapshot.created_at)::date >= $4::date)
          AND ($5::date IS NULL OR timezone('Africa/Nairobi',snapshot.created_at)::date <= $5::date)
        ORDER BY snapshot.created_at DESC,snapshot.id DESC LIMIT 26 OFFSET $6`,
        [
          tenant,
          selected,
          query.q?.trim().slice(0, 200) || null,
          query.from || null,
          query.to || null,
          offset,
        ],
      ),
      this.operations.readSql(
        `SELECT module,COUNT(*)::int AS count FROM report_snapshots
        WHERE tenant_id=$1 AND module=ANY($2::text[]) GROUP BY module ORDER BY module`,
        [tenant, aliases],
      ),
    ]);
    const sourceLabel = (module: string) =>
      sources.find((source) => source.aliases.includes(module))?.label ??
      module;
    return {
      items: records.rows
        .slice(0, 25)
        .map((row) => ({ ...row, source_label: sourceLabel(row.module) })),
      has_more: records.rows.length > 25,
      offset,
      generation_options:
        permits("reports:write") && permits("principal:write")
          ? GENERATORS.filter((option) => aliases.includes(option.module))
          : [],
      categories: categories.rows.map((row) => ({
        module: row.module,
        label: sourceLabel(row.module),
        count: Number(row.count),
      })),
    };
  }

  async generate(input: { type?: string; request_id?: string }) {
    const { actor, tenant, aliases, permits } = await this.access();
    if (!permits("reports:write") || !permits("principal:write"))
      throw new ForbiddenException("Report generation permission is required");
    const option = GENERATORS.find((item) => item.id === input.type);
    if (!option || !aliases.includes(option.module))
      throw new ForbiddenException("Choose an authorized report source");
    if (!this.repository)
      throw new Error("The report data source is unavailable");
    if (
      !input.request_id ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
        input.request_id,
      )
    )
      throw new BadRequestException("Invalid generation request");
    const snapshotId = `principal-${actor.user_id}-${option.id}-${input.request_id}`;
    const previous = await this.operations.findReportSnapshot(
      tenant,
      option.module,
      snapshotId,
    );
    if (previous)
      return { snapshot_id: previous.snapshot_id, title: option.title };
    const repository = this.repository;
    const loaders = {
      department_performance: async () => ({
        Departments: (await repository.getAcademicsOverview(tenant))
          .departmentPerformance,
      }),
      subject_register: async () => {
        const result = await repository.getSubjectsOverview(tenant);
        return {
          Departments: result.departmentHeads,
          Subjects: result.subjectDistribution,
        };
      },
      attendance_register: () => repository.getAttendanceOverview(tenant),
      staff_summary: async () => {
        const result = await repository.getStaffOverview(tenant);
        return {
          Headcount: {
            Active: result.totalStaff,
            Teaching: result.teachingStaff,
            Support: result.supportStaff,
            OnLeave: result.onLeave,
          },
          Departments: result.staffDistribution,
        };
      },
      finance_summary: async () => {
        const result = await repository.getFinanceOverview(tenant);
        return {
          Collection: result.collectionData,
          OutstandingInvoices: result.outstandingInvoices,
          CollectionsToday: result.collectionsToday,
        };
      },
    };
    const sections = await loaders[option.id]();
    const saved = await this.operations.generateReportSnapshot({
      tenantId: tenant,
      module: option.module,
      reportId: option.id,
      title: option.title,
      format: "pdf",
      generatedByUserId: actor.user_id,
      sections,
      storeFile: true,
      snapshotId,
    });
    return { snapshot_id: saved.snapshotId, title: option.title };
  }

  async file(module: string, id: string, preview: boolean) {
    const { actor, tenant, aliases } = await this.access();
    if (!aliases.includes(module))
      throw new ForbiddenException(
        "This report source is not authorized or available",
      );
    const file = await this.operations.readReportArtifact(
      tenant,
      module,
      id,
      preview,
    );
    await this.operations.recordAudit(
      tenant,
      "principal.report.accessed",
      "report_snapshot",
      null,
      { snapshot_id: id, module, action: preview ? "preview" : "download" },
      actor.user_id,
    );
    return file;
  }
}

@Controller("admin-command/principal/reports")
@RequiresModule("admin_command_centers", "principal_dashboard")
@Permissions("principal:read", "reports:read")
export class PrincipalReportLibraryController {
  constructor(private readonly reports: PrincipalReportLibraryService) {}
  @Get("generated")
  @Header("Cache-Control", "private, no-store")
  list(@Query() query: Record<string, string | undefined>) {
    return this.reports.list(query);
  }

  @Post("generated")
  @Permissions("principal:write", "reports:write")
  generate(@Body() input: { type?: string; request_id?: string }) {
    return this.reports.generate(input);
  }

  @Get("generated/:module/:id/file")
  @Header("Cache-Control", "private, no-store")
  @Header("X-Content-Type-Options", "nosniff")
  @Header("Referrer-Policy", "no-referrer")
  async file(
    @Param("module") module: string,
    @Param("id") id: string,
    @Query("preview") preview?: string,
  ) {
    const file = await this.reports.file(module, id, preview === "true");
    const filename = String(file.filename ?? "report.pdf").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    return new StreamableFile(file.content, {
      type: file.contentType,
      disposition:
        preview === "true" ? "inline" : `attachment; filename="${filename}"`,
      length: file.byteLength,
    });
  }
}
