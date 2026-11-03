"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Loader2, ChartNoAxesCombined, Send, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/components/providers/permission-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { isSchoolQueryForPath, useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { ExamWorkflowTracker, type ExamWorkflowData } from "../exam-workflow-tracker";
import { useVerifiedPrincipalDashboardApi } from "./verified-tenant-api";
import { PrincipalHeader, PrincipalMetrics, PrincipalPanel, PrincipalTrend, principalStyles as s } from './workspace-ui';

type ExamPerformance = {
  filters: { exam_series_id: string | null };
  options: { exams: Array<{id:string;name:string}> };
  kpis: {school_average:number|null; missing_marks_alerts:number};
  trends: Array<{exam_series_id:string;exam_series_name:string;average_score:number|null}>;
};

type AcademicYear = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current?: boolean;
};

type AcademicTerm = {
  id: string;
  academic_year_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current?: boolean;
};

type ExamSeriesResult = {
  id: string;
  exam_id: string;
  title: string;
  status: string;
  startsOn: string;
  endsOn: string;
  totalReportCards: number;
  approvedReportCards: number;
  publishedReportCards: number;
  blockedReportCards: number;
  canPublish: boolean;
};

type PrincipalExamsData = {
  status: "active" | "degraded" | "setup_required";
  activeExams: number;
  reportsPending: number;
  missingMarksAlerts: number;
  averageScore: number;
  performanceTrend: Array<{ label: string; value: number }>;
  recentResults: ExamSeriesResult[];
  releaseQueue?: ExamSeriesResult[];
};

function toDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export function PrincipalExamsReportsWorkspace({onOpenReports}:{onOpenReports?:()=>void} = {}) {
  const queryClient = useQueryClient();
  const tenantId = useOptionalSchoolTenantId();
  const { data, isLoading, error, refetch } = useSchoolQuery<PrincipalExamsData>("/admin-command/principal/exams");
  const {
    data: academicYears,
    isLoading: yearsLoading,
    error: yearsError,
    refetch: refetchYears,
  } = useSchoolQuery<AcademicYear[]>("/academics/academic-years");
  const {
    data: academicTerms,
    isLoading: termsLoading,
    error: termsError,
    refetch: refetchTerms,
  } = useSchoolQuery<AcademicTerm[]>("/academics/academic-terms");
  const requestPrincipalApi = useVerifiedPrincipalDashboardApi();
  const { hasPermission } = usePermissions();
  const [performanceExam,setPerformanceExam]=useState('');
  const performance=useSchoolQuery<ExamPerformance>(`/exams/analytics?scope=school&page_size=1${performanceExam?`&exam_series_id=${encodeURIComponent(performanceExam)}`:''}`);
  const workflow=useSchoolQuery<ExamWorkflowData>('/exams/workflow');
  const [publicationPage,setPublicationPage]=useState(0);
  const [publicationSearch,setPublicationSearch]=useState('');

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishingSeriesId, setPublishingSeriesId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [examName, setExamName] = useState("");
  const [selectedYearId, setSelectedYearId] = useState("");
  const [selectedTermId, setSelectedTermId] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");

  const years = Array.isArray(academicYears) ? academicYears : [];
  const terms = useMemo(
    () => Array.isArray(academicTerms) ? academicTerms : [],
    [academicTerms],
  );
  const results = Array.isArray(data?.recentResults) ? data.recentResults : [];
  const trend = (performance.data?.trends??[]).map(item=>({label:item.exam_series_name,value:item.average_score}));
  const releaseQueue = Array.isArray(data?.releaseQueue)
    ? data.releaseQueue
    : results.filter((series) => series.canPublish);
  const canReleaseReportCards = hasPermission("principal:write") && hasPermission("exams:publish");
  const publicationRows=[...new Map([...releaseQueue,...results].map(series=>[series.id,series])).values()].filter(series=>series.title.toLowerCase().includes(publicationSearch.toLowerCase()));
  const filteredTerms = useMemo(
    () => terms.filter((term) => term.academic_year_id === selectedYearId),
    [selectedYearId, terms],
  );

  const applyTerm = (termId: string) => {
    setSelectedTermId(termId);
    const term = terms.find((candidate) => candidate.id === termId);
    setStartsOn(term?.starts_on?.slice(0, 10) ?? "");
    setEndsOn(term?.ends_on?.slice(0, 10) ?? "");
  };

  const applyYear = (yearId: string) => {
    setSelectedYearId(yearId);
    const yearTerms = terms.filter((term) => term.academic_year_id === yearId);
    const term = yearTerms.find((candidate) => candidate.is_current) ?? yearTerms[0];
    applyTerm(term?.id ?? "");
  };

  const openExamModal = () => {
    const year = years.find((candidate) => candidate.is_current) ?? years[0];
    setExamName("");
    setFormError("");
    setIsExamModalOpen(true);
    applyYear(year?.id ?? "");
  };

  const handleCreateExam = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = terms.find((candidate) => candidate.id === selectedTermId);
    if (!term) {
      setFormError("Select an active academic term before creating the exam series.");
      return;
    }
    const termStart = term.starts_on.slice(0, 10);
    const termEnd = term.ends_on.slice(0, 10);
    if (!startsOn || !endsOn || startsOn > endsOn || startsOn < termStart || endsOn > termEnd) {
      setFormError(`Exam dates must fall within ${term.name} (${toDateLabel(termStart)} - ${toDateLabel(termEnd)}).`);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    try {
      await requestPrincipalApi("/admin-command/exams/cycles", {
        method: "POST",
        body: {
          name: examName.trim(),
          academic_term_id: term.id,
          starts_on: startsOn,
          ends_on: endsOn,
        },
      });
      toast.success("Exam series created.");
      setIsExamModalOpen(false);
      await refetch();
    } catch (submissionError) {
      setFormError(submissionError instanceof Error ? submissionError.message : "The exam series could not be created.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishSeries = async (series: ExamSeriesResult) => {
    if (!series.canPublish) return;
    setPublishingSeriesId(series.id);
    setFormError("");
    try {
      await requestPrincipalApi(`/admin-command/principal/exams-report-cards/${series.id}/publish`, { method: "POST" });
      toast.success(`${series.title} report cards published.`);
      await Promise.all([
        refetch(),
        workflow.refetch(),
        queryClient.invalidateQueries({
          predicate: (query) => isSchoolQueryForPath(query.queryKey, tenantId, "/exams/workflow"),
        }),
      ]);
    } catch (publishError) {
      toast.error(publishError instanceof Error ? publishError.message : "The report cards could not be published.");
    } finally {
      setPublishingSeriesId(null);
    }
  };

  const setupLoading = yearsLoading || termsLoading;
  const setupUnavailable = setupLoading || Boolean(yearsError || termsError) || years.length === 0 || terms.length === 0;
  const score = performance.data?.kpis.school_average;
  const generatedCards = workflow.data?.series.reduce((total,series)=>total+series.counts.report_cards,0);

  return (
    <div className={s.stack}>
      <PrincipalHeader icon={ChartNoAxesCombined} tone="violet" title="Exams & report cards" description="Academic performance, marks readiness and the final release of report cards." actions={<>
        <Button variant="outline" onClick={()=>void Promise.all([refetch(),performance.refetch(),workflow.refetch()])}>Refresh</Button>
        {onOpenReports&&<Button variant="outline" onClick={onOpenReports}>Browse generated reports</Button>}
        {hasPermission('exams:write')&&<Button onClick={openExamModal} disabled={setupUnavailable}>+ New Exam</Button>}
      </>}/>
      <PrincipalMetrics items={[
        {label:'School average',value:score==null?'—':`${score.toLocaleString(undefined,{maximumFractionDigits:1})}%`,detail:'Selected exam · school grading weights',icon:ChartNoAxesCombined,tone:'blue'},
        {label:'Generated cards',value:generatedCards??'—',detail:'Current exam workflow records',icon:FileText,tone:'violet'},
        {label:'Awaiting Principal release',value:workflow.data?.metrics.report_cards_awaiting_principal??'—',detail:'Generated cards awaiting release',icon:ClipboardList,tone:'amber'},
        {label:'Published report cards',value:workflow.data?.metrics.report_cards_released??'—',detail:'Released to authorized portals',icon:Send,tone:'mint'},
      ]}/>
      <div className={s.columns}>
        <PrincipalPanel title="Exam Performance Trend" description="Historical results calculated with the same subject weights and grading rules as the Overview." tone="violet">
          <label className={s.field}>Performance through exam<select value={performanceExam} onChange={event=>setPerformanceExam(event.target.value)} disabled={performance.isLoading}><option value="">Latest exam</option>{performance.data?.options.exams.map(exam=><option key={exam.id} value={exam.id}>{exam.name}</option>)}</select></label>
          {performance.isLoading?<p role="status" className={s.empty}>Loading exam performance…</p>:performance.error?<p role="alert" className={s.error}>{performance.error.message}<Button variant="outline" onClick={()=>void performance.refetch()}>Retry performance</Button></p>:<PrincipalTrend label="Exam averages" points={trend} percentage/>}
          {performance.data&&<p className={s.notice}>{performance.data.kpis.missing_marks_alerts} missing or incomplete assessments in the selected exam. Missing scores are not treated as zero.</p>}
        </PrincipalPanel>
        <PrincipalPanel title="Report-card publication" description="The Exams Manager generates cards after reviewed marks are locked. Release makes eligible cards available to parents and learners." tone="mint">
          <div className={s.toolbar}><label className={s.field}>Find exam series<input type="search" value={publicationSearch} onChange={event=>{setPublicationSearch(event.target.value);setPublicationPage(0);}} placeholder="Search exam name"/></label></div>
          {error?<p role="alert" className={s.error}>{error.message}<Button variant="outline" onClick={()=>void refetch()}>Retry publication records</Button></p>:isLoading?<p role="status" className={s.empty}>Loading report-card publication…</p>:publicationRows.length===0?<p className={s.empty}>No exam series or report-card batches match this view.</p>:<>
            <div className={s.boundedList} aria-label="Report-card publication records" tabIndex={0}>
              {publicationRows.slice(publicationPage*5,publicationPage*5+5).map(series=>{
                const published=series.totalReportCards>0&&series.publishedReportCards===series.totalReportCards;
                const guidance=series.totalReportCards===0?'Generate cards through the Exams Manager workflow.':series.blockedReportCards>0?`${series.blockedReportCards} cards require completion or regeneration.`:`${series.publishedReportCards} of ${series.totalReportCards} cards published.`;
                return <article key={series.id} className={s.calendarItem}><div><strong>{series.title}</strong><p>{toDateLabel(series.startsOn)} – {toDateLabel(series.endsOn)}</p><p>{guidance}</p></div>
                  {published?<span className={s.badge} data-tone="mint"><CheckCircle2 size={14}/>Published</span>:series.canPublish&&canReleaseReportCards?<Button size="sm" disabled={Boolean(publishingSeriesId)} onClick={()=>void publishSeries(series)}>{publishingSeriesId===series.id?'Publishing…':'Publish generated cards'}</Button>:<span className={s.badge} data-tone="amber">{series.canPublish?'Release permission required':'Not ready'}</span>}
                </article>;
              })}
            </div>
            <div className={s.actions}><Button variant="outline" aria-label="Previous publication page" disabled={publicationPage===0} onClick={()=>setPublicationPage(publicationPage-1)}>Previous</Button><span>Page {publicationPage+1} of {Math.ceil(publicationRows.length/5)}</span><Button variant="outline" aria-label="Next publication page" disabled={(publicationPage+1)*5>=publicationRows.length} onClick={()=>setPublicationPage(publicationPage+1)}>Next</Button></div>
          </>}
        </PrincipalPanel>
      </div>
      {workflow.error&&<p role="alert" className={s.error}>Report-card counts could not load.<Button variant="outline" onClick={()=>void workflow.refetch()}>Retry counts</Button></p>}
      {(yearsError||termsError)?<p role="alert" className={s.error}>Academic setup could not load.<Button variant="outline" onClick={()=>void Promise.all([refetchYears(),refetchTerms()])}>Retry setup</Button></p>:!setupLoading&&(!years.length||!terms.length)?<p className={s.empty}>Configure the school academic year and term before creating an exam series.</p>:null}
      <details className={s.panel}><summary className={s.panelHeading}>Exam and report-card release workflow</summary><div className={`${s.panelBody} ${s.boundedList}`}><ExamWorkflowTracker heading="Exam and report-card release workflow" compact/></div></details>

      <Modal open={isExamModalOpen} onClose={() => !isSubmitting && setIsExamModalOpen(false)} title="Create Exam Series">
        <form onSubmit={handleCreateExam} className="space-y-4">
          {formError ? (
            <div role="alert" className="rounded border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600">{formError}</div>
          ) : null}
          <label className="block space-y-2 text-sm font-medium">
            Exam name
            <input value={examName} onChange={(event) => setExamName(event.target.value)} required className="w-full rounded border p-2 text-sm" placeholder="e.g. Term 1 Midterm" />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Academic year
            <select value={selectedYearId} onChange={(event) => applyYear(event.target.value)} required className="w-full rounded border bg-white p-2 text-sm text-black">
              <option value="">Select academic year</option>
              {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
            </select>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            Term / semester
            <select value={selectedTermId} onChange={(event) => applyTerm(event.target.value)} required className="w-full rounded border bg-white p-2 text-sm text-black">
              <option value="">Select term</option>
              {filteredTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2 text-sm font-medium">
              Starts on
              <input type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} required className="w-full rounded border p-2 text-sm" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Ends on
              <input type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} required className="w-full rounded border p-2 text-sm" />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setIsExamModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !selectedTermId || !examName.trim()}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Exam Series
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
