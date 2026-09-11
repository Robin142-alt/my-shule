import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RequestContextService } from '../../../common/request-context/request-context.service';
import { ReportSnapshotRepository } from '../../../common/reports/report-snapshot.repository';
import { createReportSnapshotManifest } from '../../../common/reports/report-snapshot-manifest';
import { SchoolOperationalEventsService } from '../../events/school-operational-events.service';
import { ExamsService } from '../exams.service';
import { ExamsRepository } from '../repositories/exams.repository';
import { ANALYTICS_REPORT_SECTIONS, type AnalyticsReportSection } from './analytics-report-contract';
import { buildAnalyticsPrintReport } from './analytics-report-model';
import { createAnalyticsReportPdf } from './analytics-report-pdf';

@Injectable()
export class AnalyticsReportService {
  constructor(private readonly context:RequestContextService,private readonly exams:ExamsService,private readonly repository:ExamsRepository,
    private readonly snapshots:ReportSnapshotRepository,private readonly events:SchoolOperationalEventsService) {}

  async generate(input:unknown) {
    const actor=this.context.requireStore();
    if(!actor.tenant_id||!actor.user_id)throw new UnauthorizedException('An authenticated school account is required.');
    if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Choose a report and valid analytics filters.');
    const body=input as Record<string,unknown>;
    if(!ANALYTICS_REPORT_SECTIONS.includes(body.section as AnalyticsReportSection))throw new BadRequestException('Unknown analytics report.');
    if(!body.filters||typeof body.filters!=='object'||Array.isArray(body.filters)||Object.values(body.filters).some(value=>typeof value!=='string'))throw new BadRequestException('Invalid analytics report filters.');
    // Authority, data and totals are always recomputed through the existing scope resolver.
    const data=await this.exams.getAnalytics(body.filters as Record<string,string>);
    const identity=await this.repository.executeSql<{school_name:string;school_address:string|null;school_motto:string|null;generated_by:string}>(`
      SELECT tenant.name AS school_name, NULLIF(tenant.settings->>'address','') AS school_address,
        NULLIF(tenant.settings->>'motto','') AS school_motto,
        COALESCE(NULLIF(staff.display_name,''), $3::text) AS generated_by
      FROM tenants tenant LEFT JOIN staff_profiles staff ON staff.tenant_id=tenant.tenant_id AND staff.user_id::text=$2
      WHERE tenant.tenant_id=$1 LIMIT 1`,[actor.tenant_id,actor.user_id,actor.role??'School staff']);
    if(!identity.rows[0])throw new BadRequestException('School details are required before generating this report.');
    const report=buildAnalyticsPrintReport(data,body.section as AnalyticsReportSection,identity.rows[0],`AI-${randomUUID().replaceAll('-','').slice(0,20).toUpperCase()}`,new Date().toISOString());
    const artifact=await createAnalyticsReportPdf(report);
    const manifest=createReportSnapshotManifest({tenantId:actor.tenant_id,module:'exams',reportId:report.document_number,title:report.title,format:'pdf',artifact,
      filters:{...data.filters,section:body.section},generatedByUserId:actor.user_id});
    await this.snapshots.saveManifest(manifest);
    await this.events.recordSchoolOperation({event:{id:report.document_number,type:'exams.analytics_report.generated',module:'exams',actorRole:actor.role,
      title:'Academic report generated',body:`${report.title} prepared for internal academic review.`,entityId:manifest.snapshot_id,
      payload:{snapshot_id:manifest.snapshot_id,document_number:report.document_number,scope:data.scope.level,section:body.section,checksum:artifact.checksumSha256}}});
    return {report,filename:artifact.filename,pdf_base64:artifact.content.toString('base64')};
  }
}
