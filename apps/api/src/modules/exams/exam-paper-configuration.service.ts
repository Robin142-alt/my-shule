import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { RequestContextService } from '../../common/request-context/request-context.service';
import { SchoolOperationalEventsService } from '../events/school-operational-events.service';
import { markEntryAccessSql } from './mark-entry-window-policy';
import { paperClassScopeSql } from './exam-result-policy';

export interface PaperConfigurationInput {
  version: number;
  papers: Array<{ id?: string; name: string; max_score: number; weight?: number | null;
    categories?: Array<{ id?: string; name: string; max_score: number }> }>;
}

export function validatePaperConfiguration(input: PaperConfigurationInput) {
  if (!input || !Number.isInteger(input.version) || input.version < 1 || !Array.isArray(input.papers)
    || input.papers.length < 1 || input.papers.length > 20) throw new BadRequestException('Keep between 1 and 20 papers and refresh the configuration before saving.');
  const names = new Set<string>(); const ids = new Set<string>();
  const positive = (value: number) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 9999 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  for (const paper of input.papers) {
    if (!paper || typeof paper.name !== 'string' || !paper.name.trim() || paper.name.length > 100
      || names.has(paper.name.trim().toLowerCase())) throw new BadRequestException('Each paper needs a unique name of up to 100 characters.');
    names.add(paper.name.trim().toLowerCase());
    if (paper.id && ids.has(paper.id)) throw new BadRequestException('A paper cannot appear twice.');
    if (paper.id) ids.add(paper.id);
    if (!positive(paper.max_score) || (paper.weight != null && !positive(paper.weight))) throw new BadRequestException('Maximum marks and custom weights must be positive numbers, up to 9999, with at most two decimal places.');
    if (paper.categories !== undefined && (!Array.isArray(paper.categories) || paper.categories.length > 30)) throw new BadRequestException('Use up to 30 categories per paper.');
    const categoryNames = new Set<string>(); const categoryIds = new Set<string>();
    for (const category of paper.categories ?? []) {
      if (!category || typeof category.name !== 'string' || !category.name.trim() || category.name.length > 100
        || categoryNames.has(category.name.trim().toLowerCase()) || !positive(category.max_score)
        || (category.id && categoryIds.has(category.id))) throw new BadRequestException('Categories need unique names and positive maximum marks.');
      categoryNames.add(category.name.trim().toLowerCase()); if (category.id) categoryIds.add(category.id);
    }
    if (paper.categories?.length && Math.abs(paper.categories.reduce((sum, c) => sum + c.max_score, 0) - paper.max_score) > 0.001)
      throw new BadRequestException('The paper maximum must equal the sum of its category maxima.');
  }
  if (input.papers.some(p => p.weight != null) && input.papers.some(p => p.weight == null)) throw new BadRequestException('Set a weight for every paper, or use combined maximum marks for all papers.');
}

@Injectable()
export class ExamPaperConfigurationService {
  constructor(private readonly prisma: PrismaService, private readonly context: RequestContextService,
    private readonly events: SchoolOperationalEventsService) {}

  private async scope(tx: any, tenant: string, actor: string, windowId: string, write: boolean) {
    const rows = await tx.$queryRawUnsafe(`SELECT w.*, series.status AS exam_status, series.locked_at, series.published_at,
      ${markEntryAccessSql('w', 'series', '$3')} AS entry_open,
      EXISTS (SELECT 1 FROM teacher_subject_assignments t WHERE t.tenant_id = w.tenant_id
        AND t.teacher_user_id = $3::text AND t.class_section_id = w.class_section_id::text AND t.subject_id = w.subject_id::text
        AND (t.academic_term_id IS NULL OR t.academic_term_id = series.academic_term_id::text)
        AND t.status = 'active' AND t.mark_entry_allowed = TRUE AND t.effective_from <= CURRENT_DATE
        AND (t.effective_to IS NULL OR t.effective_to >= CURRENT_DATE)) AS assigned
      FROM exam_mark_entry_windows w JOIN exam_series series ON series.tenant_id = w.tenant_id AND series.id = w.exam_series_id
      WHERE w.tenant_id = $1 AND w.id = $2::uuid ${write ? 'FOR UPDATE OF series, w' : ''}`, tenant, windowId, actor);
    const scope = rows[0];
    if (!scope) throw new NotFoundException('Markbook was not found in this school.');
    const store = this.context.getStore();
    const manager = ['exams_manager', 'exams_officer', 'principal', 'deputy_principal'].includes(String(store?.role))
      && store?.permissions?.includes('exams:write');
    if (!scope.assigned && !manager) throw new ForbiddenException('Only the assigned subject teacher or an authorized exams manager can configure these papers.');
    if (write && (scope.locked_at || scope.published_at || ['locked', 'published', 'archived'].includes(scope.exam_status)
      || (!manager && !scope.entry_open))) throw new ConflictException('Reopen this examination for marks before changing papers.');
    return scope;
  }

  private async papers(tx: any, tenant: string, scope: any) {
    return tx.$queryRawUnsafe(`SELECT paper.id::text, paper.name, paper.max_score::float, paper.weight::float, paper.class_section_id::text,
      paper.uses_categories, COALESCE((SELECT jsonb_agg(jsonb_build_object('id',c.id,'name',c.component_name,'max_score',c.max_score) ORDER BY c.component_code,c.id)
        FROM exam_assessment_components c WHERE c.tenant_id = paper.tenant_id AND c.assessment_id = paper.id AND paper.uses_categories), '[]'::jsonb) AS categories
      FROM exam_assessments paper WHERE paper.tenant_id = $1 AND paper.exam_series_id = $2::uuid AND paper.subject_id = $3::uuid
        AND ${paperClassScopeSql('paper', '$4')} ORDER BY paper.paper_order,paper.created_at,paper.id`, tenant, scope.exam_series_id, scope.subject_id, scope.class_section_id);
  }

  async read(windowId: string) {
    const { tenant_id: tenant, user_id: actor } = this.identity();
    return this.prisma.executeWithTenant(tenant, actor, async tx => {
      const scope = await this.scope(tx, tenant, actor, windowId, false);
      return { version: scope.paper_config_version, papers: await this.papers(tx, tenant, scope) };
    });
  }

  async save(windowId: string, input: PaperConfigurationInput) {
    validatePaperConfiguration(input);
    const { tenant_id: tenant, user_id: actor } = this.identity();
    return this.prisma.executeWithTenant(tenant, actor, async tx => {
      const scope = await this.scope(tx, tenant, actor, windowId, true);
      if (scope.paper_config_version !== input.version) throw new ConflictException('Another teacher changed these papers. Refresh the settings before saving.');
      await tx.$queryRawUnsafe(`SELECT set_config('app.saving_exam_papers','1',true)`);
      const previous = await this.papers(tx, tenant, scope);
      const marks = await tx.$queryRawUnsafe<any[]>(`SELECT * FROM exam_marks WHERE tenant_id = $1 AND exam_series_id = $2::uuid
        AND class_section_id = $3::uuid AND subject_id = $4::uuid FOR UPDATE`, tenant, scope.exam_series_id, scope.class_section_id, scope.subject_id);
      if (marks.some(m => m.status !== 'draft')) throw new ConflictException('Return submitted marks for correction before changing this subject’s papers.');
      for (const paper of input.papers) {
        const original = previous.find((p: any) => p.id === paper.id);
        if (paper.id && !original) throw new BadRequestException('Paper does not belong to this markbook.');
        if ((paper.categories ?? []).some(c => c.id && !original?.categories.some((old: any) => old.id === c.id))) throw new BadRequestException('Category does not belong to this paper.');
        const existing = marks.filter(m => m.assessment_id === paper.id);
        if (existing.some(m => m.score !== null && Number(m.score) > paper.max_score)) throw new ConflictException('The new maximum is below an existing mark. Correct the marks first.');
        if (existing.length && JSON.stringify((original?.categories ?? []).map((c: any) => [c.id,c.name,Number(c.max_score)])) !== JSON.stringify((paper.categories ?? []).map(c => [c.id,c.name,c.max_score])))
          throw new ConflictException('Categories with saved marks must keep their structure. Use a new paper for a different structure.');
      }
      if (previous.some((p: any) => !input.papers.some(v => v.id === p.id) && marks.some(m => m.assessment_id === p.id)))
        throw new ConflictException('A paper with saved marks cannot be removed.');
      // Free names transactionally, allowing safe renames/swaps while preserving paper and mark IDs.
      await tx.$executeRawUnsafe(`UPDATE exam_assessments SET name = id::text WHERE tenant_id = $1 AND exam_series_id = $2::uuid
        AND subject_id = $3::uuid AND class_section_id = $4::uuid`, tenant, scope.exam_series_id, scope.subject_id, scope.class_section_id);
      const kept: string[] = [];
      for (const [paperOrder, paper] of input.papers.entries()) {
        const original = previous.find((p: any) => p.id === paper.id);
        const id = original?.class_section_id ? original.id : randomUUID(); kept.push(id);
        await tx.$executeRawUnsafe(`INSERT INTO exam_assessments (id,tenant_id,exam_series_id,subject_id,class_section_id,name,max_score,weight,uses_categories,created_by_user_id,paper_order)
          VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10::uuid,$11)
          ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,max_score=EXCLUDED.max_score,weight=EXCLUDED.weight,uses_categories=EXCLUDED.uses_categories,paper_order=EXCLUDED.paper_order,updated_at=NOW()
          WHERE exam_assessments.tenant_id = EXCLUDED.tenant_id`, id,tenant,scope.exam_series_id,scope.subject_id,scope.class_section_id,
          paper.name.trim(),paper.max_score,paper.weight ?? null,Boolean(paper.categories?.length),actor,paperOrder);
        if (original && id !== original.id) {
          await tx.$executeRawUnsafe(`UPDATE exam_marks SET assessment_id=$5::uuid, updated_at=NOW() WHERE tenant_id=$1 AND assessment_id=$2::uuid
            AND class_section_id=$3::uuid AND exam_series_id=$4::uuid`, tenant,original.id,scope.class_section_id,scope.exam_series_id,id);
        }
        const categoryIds: string[] = [];
        for (const [index, c] of (paper.categories ?? []).entries()) {
          const cid = c.id ?? randomUUID(); categoryIds.push(cid);
          const existingCategory = original?.categories.find((value: any) => value.id === cid);
          // Unchanged categories already hold saved evidence; do not run an INSERT guard for them.
          if (id === original?.id && existingCategory?.name === c.name.trim()
            && Number(existingCategory.max_score) === c.max_score) continue;
          await tx.$executeRawUnsafe(`INSERT INTO exam_assessment_components (id,tenant_id,assessment_id,component_code,component_name,max_score,weight)
            VALUES ($1::uuid,$2,$3::uuid,$4,$5,$6,1) ON CONFLICT(id) DO UPDATE SET component_name=EXCLUDED.component_name,max_score=EXCLUDED.max_score
            WHERE exam_assessment_components.tenant_id=EXCLUDED.tenant_id AND exam_assessment_components.assessment_id=EXCLUDED.assessment_id`, cid,tenant,id,String(index+1).padStart(3,'0'),c.name.trim(),c.max_score);
        }
        await tx.$executeRawUnsafe(`DELETE FROM exam_assessment_components WHERE tenant_id=$1 AND assessment_id=$2::uuid AND NOT (id=ANY($3::uuid[]))`, tenant,id,categoryIds);
      }
      await tx.$executeRawUnsafe(`DELETE FROM exam_assessment_components WHERE tenant_id=$1 AND assessment_id IN (SELECT id FROM exam_assessments
        WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND subject_id=$3::uuid AND class_section_id=$4::uuid AND NOT (id=ANY($5::uuid[])))`, tenant,scope.exam_series_id,scope.subject_id,scope.class_section_id,kept);
      await tx.$executeRawUnsafe(`DELETE FROM exam_assessments WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND subject_id=$3::uuid AND class_section_id=$4::uuid AND NOT (id=ANY($5::uuid[]))`,tenant,scope.exam_series_id,scope.subject_id,scope.class_section_id,kept);
      await tx.$executeRawUnsafe(`UPDATE exam_mark_entry_windows SET paper_config_version=paper_config_version+1,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`,tenant,windowId);
      await tx.$executeRawUnsafe(`DELETE FROM exam_result_snapshots WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND student_id IN
        (SELECT student_id FROM exam_marks WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND class_section_id=$3::uuid)`,tenant,scope.exam_series_id,scope.class_section_id);
      await tx.$executeRawUnsafe(`UPDATE student_report_cards SET metadata=metadata || '{"regeneration_required":true}'::jsonb,updated_at=NOW()
        WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND is_current=TRUE AND student_id IN
        (SELECT student_id FROM exam_marks WHERE tenant_id=$1 AND exam_series_id=$2::uuid AND class_section_id=$3::uuid)`,tenant,scope.exam_series_id,scope.class_section_id);
      await this.events.recordSchoolOperation({ schoolId:tenant, event: { id: randomUUID(), type:'exam.papers_configured',module:'exams',actorRole:String(this.context.getStore()?.role),
        title:'Exam papers configured',body:'Paper names, maximum marks and categories were updated.',entityId:windowId,severity:'info',
        payload:{exam_series_id:scope.exam_series_id,class_section_id:scope.class_section_id,subject_id:scope.subject_id,previous,papers:input.papers,version:input.version+1} },
        notifications:[{id:randomUUID(),schoolId:tenant,audienceRoles:['exams_manager','exams_officer'],title:'Exam papers updated',
          body:'A subject’s papers were configured. Review the updated markbooks.',sourceModule:'exams',actionUrl:'/school/exams-manager/marks-entry',priority:'normal'}] },tx);
      return { version:input.version+1,papers:await this.papers(tx,tenant,scope) };
    });
  }

  private identity() {
    const store = this.context.getStore();
    if (!store?.tenant_id || !store.user_id || !store.is_authenticated) throw new ForbiddenException('Sign in to your school before configuring papers.');
    return {tenant_id:store.tenant_id,user_id:store.user_id};
  }
}
