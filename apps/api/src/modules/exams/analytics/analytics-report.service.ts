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
import { createAnalyticsReportCsv } from './analytics-report-csv';

@Injectable()
export class AnalyticsReportService {
  constructor(private readonly context:RequestContextService,private readonly exams:ExamsService,private readonly repository:ExamsRepository,
    private readonly snapshots:ReportSnapshotRepository,private readonly events:SchoolOperationalEventsService) {}

  async generate(input:unknown, fixedScope?: 'subject') {
    const actor=this.context.requireStore();
    if(!actor.tenant_id||!actor.user_id)throw new UnauthorizedException('An authenticated school account is required.');
    if(!input||typeof input!=='object'||Array.isArray(input))throw new BadRequestException('Choose a report and valid analytics filters.');
    const body=input as Record<string,unknown>;
    if(!ANALYTICS_REPORT_SECTIONS.includes(body.section as AnalyticsReportSection))throw new BadRequestException('Unknown analytics report.');
    if(body.format!==undefined&&(body.section!=='library'||!['pdf','csv','both'].includes(String(body.format))))throw new BadRequestException('Choose PDF, CSV or both for a library report.');
    if(!body.filters||typeof body.filters!=='object'||Array.isArray(body.filters)||Object.values(body.filters).some(value=>typeof value!=='string'))throw new BadRequestException('Invalid analytics report filters.');
    if(body.learner_selection!==undefined&&(typeof body.learner_selection!=='string'||!['all','page'].includes(body.learner_selection)))throw new BadRequestException('Choose all matching learners or the current page.');
    // Authority, data and totals are always recomputed through the existing scope resolver.
    const filters = {...body.filters as Record<string,string>,...(body.section==='library'?{analytics_mode:'library'}:{})};
    const data=await this.exams.getAnalytics(fixedScope ? { ...filters, scope: fixedScope } : filters, true);
    // Pagination is an explicit learner-only choice; other report sections remain complete.
    if(body.learner_selection==='page') {
      const {page,page_size}=data.learners;
      data.learners={...data.learners,items:data.learners.items.slice((page-1)*page_size,page*page_size),coverage:'page'};
    }
    const identity=await this.repository.executeSql<{school_name:string;school_address:string|null;school_motto:string|null;generated_by:string}>(`
      SELECT tenant.name AS school_name, NULLIF(tenant.settings->>'address','') AS school_address,
        NULLIF(tenant.settings->>'motto','') AS school_motto,
        COALESCE(NULLIF(staff.display_name,''), $3::text) AS generated_by
      FROM tenants tenant LEFT JOIN staff_profiles staff ON staff.tenant_id=tenant.tenant_id AND staff.user_id::text=$2
      WHERE tenant.tenant_id=$1 LIMIT 1`,[actor.tenant_id,actor.user_id,actor.role??'School staff']);
    if(!identity.rows[0])throw new BadRequestException('School details are required before generating this report.');
    const report=buildAnalyticsPrintReport(data,body.section as AnalyticsReportSection,identity.rows[0],`AI-${randomUUID().replaceAll('-','').slice(0,20).toUpperCase()}`,new Date().toISOString());
    const csvOnly=body.format==='csv';
    const artifact=csvOnly?createAnalyticsReportCsv(report):await createAnalyticsReportPdf(report);
    const manifest=createReportSnapshotManifest({tenantId:actor.tenant_id,module:'exams',reportId:report.document_number,title:report.title,format:csvOnly?'csv':'pdf',artifact,
      filters:{...data.filters,section:body.section,learner_selection:body.learner_selection??'all'},generatedByUserId:actor.user_id});
    await this.snapshots.saveManifest(manifest);
    const csv=body.section==='library'&&body.format!=='pdf'?(csvOnly?artifact:createAnalyticsReportCsv(report)):null;
    if(csv&&!csvOnly)await this.snapshots.saveManifest(createReportSnapshotManifest({tenantId:actor.tenant_id,module:'exams',reportId:report.document_number+'-CSV',title:report.title,format:'csv',artifact:csv,
      filters:{...data.filters,section:body.section},generatedByUserId:actor.user_id}));
    await this.events.recordSchoolOperation({event:{id:report.document_number,type:'exams.analytics_report.generated',module:'exams',actorRole:actor.role,
      title:'Academic report generated',body:`${report.title} prepared for internal academic review.`,entityId:manifest.snapshot_id,
      payload:{snapshot_id:manifest.snapshot_id,document_number:report.document_number,scope:data.scope.level,section:body.section,learner_selection:body.learner_selection??'all',checksum:artifact.checksumSha256,...(csv?{csv_checksum:csv.checksumSha256}:{})}}});
    return {report,filename:artifact.filename,pdf_base64:csvOnly?'':artifact.content.toString('base64'),...(csv?{csv_base64:csv.content.toString('base64'),csv_filename:csv.filename}:{})};
  }
}
