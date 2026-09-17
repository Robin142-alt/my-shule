"use client";

import { useState } from "react";
import { ArrowRight, RefreshCw, Search, SlidersHorizontal, X } from "lucide-react";
import { AcademicIntelligenceReport } from "./academic-intelligence-report";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import type { LiveExamsAnalyticsResponse } from "@/lib/modules/exams-client";
import { isAcademicIntelligence, scopeNames, displayNumber, displayChange } from "@/lib/modules/academic-intelligence";
import { AcademicIntelligencePanels } from "./academic-intelligence-panels";

export type AcademicIntelligenceAudience = "principal" | "deputy" | "dean" | "exams-manager" | "hod" | "hos" | "grade-master" | "teacher" | "class-teacher";
export interface AcademicIntelligenceWorkspaceProps {
  audience: AcademicIntelligenceAudience;
  onOpenMarks?: () => void;
  onOpenInterventions?: () => void;
  onOpenReportCards?: () => void;
}
const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50";
const field = "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900";
function record(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object"; }
export function isLiveExamsAnalyticsResponse(value: unknown): value is LiveExamsAnalyticsResponse {
  if(!record(value)||!record(value.scope)||!record(value.kpis)||!record(value.studentProgress)||!record(value.data_quality)) return false;
  const progress=value.studentProgress, quality=value.data_quality, kpis=value.kpis;
  return Object.keys(scopeNames).includes(String(value.scope.level)) && Array.isArray(value.trends) && Array.isArray(value.subjectPerformance)
    && ["topPerformers","topImprovers","atRiskStudents"].every(key=>Array.isArray(progress[key]))
    && ["final_mark_count","explicit_evidence_count","missing_or_incomplete_count"].every(key=>typeof quality[key]==="number")
    && (value.kpis.school_average===null || (typeof value.kpis.school_average==="number" && Number.isFinite(value.kpis.school_average)))
    && ["pending_reviews","missing_marks_alerts","active_exams"].every(key=>typeof kpis[key]==="number");
}
export function AcademicIntelligenceWorkspace(props: AcademicIntelligenceWorkspaceProps) {
  const publishedOnly = props.audience === "hod" || props.audience === "hos";
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [view,setView]=useState("Overview");
  const query=new URLSearchParams(filters).toString();
  const {data,isLoading,isFetching,error,refetch}=useSchoolQuery<LiveExamsAnalyticsResponse>((props.audience === "hos" ? "/exams/analytics/subject" : "/exams/analytics")+(query?"?"+query:""),{staleTime:30000});
  const legacy=isLiveExamsAnalyticsResponse(data)?data:undefined;
  const analytics=isAcademicIntelligence(data)?data:undefined;
  const malformed=Boolean(data&&(!legacy || ("performance" in data&&!analytics)));
  const changeFilters=(changes:Record<string,string>)=>setFilters(previous=>Object.fromEntries(Object.entries({...previous,...changes,page:"1"}).filter(([,v])=>v!=="")));
  const drill=(changes:Record<string,string>,nextView="Learners")=>{changeFilters(changes);setView(nextView);};
  const openView=(nextView:string)=>{
    if(nextView==='At Risk'&&!filters.risk_level)changeFilters({risk_level:'At Risk'});
    else if(nextView==='Learners'&&filters.risk_level==='At Risk')changeFilters({risk_level:''});
    setView(nextView);
  };
  const tabs=["Overview","Performance","Comparisons","Learners","At Risk","Trends"];
  const moreViews=["Interventions","Exam Operations","Reports","Targets","Advanced","Exam Analysis"].filter(tab=>tab!=="Reports"||props.onOpenReportCards);
  const activeFilters=Object.entries(filters).filter(([key,value])=>value&&!['scope','page','exam_series_id','academic_year_id','academic_term_id','comparison_exam_id'].includes(key));
  const descriptions:Record<string,string>={Overview:'Your results, changes and next steps in one place.',Performance:'Understand achievement bands and which results are included.',Comparisons:'Compare subjects, classes and previous exams.',Learners:'Find a learner, review their progress and plan support.','At Risk':'Prioritize learners who may need support.',Trends:'See how results change over time.',Interventions:'Review planned support and measured outcomes.','Exam Operations':'Find unfinished marks and move reports toward approval.',Reports:'Check report-card readiness.',Targets:'Review the available target evidence.',Advanced:'Explore variation, gaps and the limits of the evidence.','Exam Analysis':'Review exam results and available assessment evidence.'};
  const selectedScope=analytics?.scope.level;
  const scopeTitle=selectedScope ? scopeNames[selectedScope] : props.audience==="hos"?"Head of Subject":props.audience==="grade-master"?"Grade/Form Master":"Academic";
  const title=selectedScope==="subject"?"Subject Academic Intelligence":selectedScope==="grade"?"Grade/Form Academic Intelligence":"Academic Intelligence";
  const options=analytics?.options;
  function select(label:string,key:string,values:{id:string;name:string}[],defaultLabel="All",visible=true) {
    if(!visible)return null;
    return <label className="space-y-1 text-sm font-semibold text-slate-700">{label}<select aria-label={label} className={field} value={filters[key]??""} onChange={e=>changeFilters({[key]:e.target.value,...(key==="academic_year_id"?{academic_term_id:"",exam_series_id:""}:key==="academic_term_id"?{exam_series_id:""}:{})})}><option value="">{defaultLabel}</option>{values.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>;
  }
  const examOptions=options?.exams.filter(e=>(!filters.academic_year_id||e.academic_year_id===filters.academic_year_id)&&(!filters.academic_term_id||e.academic_term_id===filters.academic_term_id))??[];
  const metrics=analytics?[
    [selectedScope==="school"?"School average":selectedScope==="department"?"Department average":selectedScope==="subject"?"Subject average":selectedScope==="grade"?"Grade average":selectedScope==="class"?"Class average":"Average score",displayNumber(analytics.performance.mean,"%"),"Performance"],
    ["Mean grade",analytics.performance.mean_grade??"No common grading policy","Performance"],
    ["Pass rate",displayNumber(analytics.performance.pass_rate,"%"),"Performance"],
    ["Change from previous exam",displayChange(analytics.change),"Comparisons"],
    ["Target","No target configured","Targets"],
    ["At-Risk Learners",String(analytics.risk.at_risk_count),"At Risk"],
    [props.audience==="principal"?"High performers":"Most improved",String(props.audience==="principal"?analytics.risk.high_performers:analytics.risk.most_improved_count),"Learners"],
    ["Marks completion",displayNumber(analytics.operations.completion_rate,"%"),"Exam Operations"],
  ]:[];
  return <section className="min-w-0 space-y-5 text-slate-900" aria-labelledby="academic-intelligence-title">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div><p className="text-sm font-semibold text-blue-700">{scopeTitle}</p><h2 id="academic-intelligence-title" className="mt-1 text-2xl font-bold">{title}</h2><p className="mt-2 max-w-2xl text-sm text-slate-600">{publishedOnly ? "Review published exam results within your academic responsibility and plan learner support." : "See what changed, find learners who need support, and take the next step."}</p></div>
      <div className="flex flex-wrap gap-2"><button className={button} disabled={isFetching} onClick={()=>void refetch()}><RefreshCw aria-hidden="true" className={"mr-2 inline h-4 w-4"+(isFetching?" animate-spin":"")}/>Refresh</button>
        {analytics&&!error&&!malformed&&<AcademicIntelligenceReport subjectOnly={props.audience === "hos"} key={query} filters={{...filters,scope:analytics.scope.level,...(analytics.filters.exam_series_id?{exam_series_id:analytics.filters.exam_series_id}:{})}} view={view} disabled={isFetching}/>}
      </div>
    </header>
    {(error||malformed)&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5"><h3 className="font-bold">Academic intelligence could not be loaded</h3><p>{error?.message??"The live exams service returned an incomplete analytics response. No values were displayed as real school data."}</p><button className={button+" mt-3"} onClick={()=>void refetch()}>Retry live data</button></div>}
    {isLoading?<div aria-label="Loading academic intelligence" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({length:8},(_,i)=><div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100"/>)}</div>:legacy&&!error&&!malformed?<>
      {analytics&&options&&<div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {select("Academic Year","academic_year_id",[...new Map(options.exams.map(e=>[e.academic_year_id,{id:e.academic_year_id,name:e.year_name}])).values()])}
          {select("Term","academic_term_id",[...new Map(options.exams.filter(e=>!filters.academic_year_id||e.academic_year_id===filters.academic_year_id).map(e=>[e.academic_term_id,{id:e.academic_term_id,name:e.term_name}])).values()])}
          {select("Exam","exam_series_id",examOptions,"Latest exam")}
          <label className="space-y-1 text-sm font-semibold text-slate-700">Responsibility<select aria-label="Responsibility" className={field} value={filters.scope??analytics.scope.level} onChange={e=>{setFilters({scope:e.target.value});setView("Overview");}}>{analytics.scope.available_scopes.filter(scope=>props.audience!=="hos"||scope==="subject").map(scope=><option key={scope} value={scope}>{scopeNames[scope]}</option>)}</select></label>
        </div>
        <details><summary className="cursor-pointer py-2 text-sm font-semibold text-slate-700"><SlidersHorizontal aria-hidden="true" className="mr-2 inline h-4 w-4"/>More Filters{activeFilters.length>0?` (${activeFilters.length} active)`:""}</summary><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {select("Department","department_id",options.departments,"All authorized departments",selectedScope==="school")}
          {select("Subject","subject_id",options.subjects,"All authorized subjects")}
          {select("Grade/Form","grade_level",options.grades.map(id=>({id,name:id})),"All authorized grades",selectedScope!=="class")}
          {select("Stream","stream_id",options.streams,"All authorized streams")}
          {select("Class","class_section_id",options.classes,"All authorized classes")}
          {select("Teacher allocation","teacher_user_id",options.teachers,"All authorized allocations",selectedScope!=="assignment")}

          {select("Risk Level","risk_level",["At Risk","Low","Moderate","High","Critical"].map(id=>({id,name:id})))}
          {select("Recognition","learner_group",[{id:'high_performers',name:'High performers'},{id:'most_improved',name:'Most improved'},{id:'passing_all',name:'Passing all subjects'},{id:'declining',name:'Declining results'},{id:'consistent_improvers',name:'Consistently improving'},{id:'consistent_high',name:'Consistently high performers'}])}
          {select("Grade / Achievement","grade",(analytics.distribution??[]).filter(b=>b.id!=='ungraded').map(b=>({id:b.label,name:b.label})))}
          {select("Marks Status","marks_status",(publishedOnly ? ["published"] : ["missing","draft","submitted","reviewed","locked","published"]).map(id=>({id,name:id})))}
          {select("Publication Status","publication_status",(publishedOnly ? ["published"] : ["draft_requested","draft_generated","under_review","approved","published"]).map(id=>({id,name:id.replaceAll("_"," ")})))}
        </div></details>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3"><p className="text-sm text-slate-600"><strong className="text-slate-800">{options.exams.find(e=>e.id===analytics.filters.exam_series_id)?.name??"No exam evidence in this scope"}</strong> · {analytics.performance.learners_examined} {analytics.performance.learners_examined===1?'learner':'learners'} with {publishedOnly ? "published" : "approved"} results <span role="status">{isFetching?" · Updating…":""}</span></p>{Object.keys(filters).length>0&&<button className="min-h-11 px-2 text-sm font-semibold text-blue-700 hover:underline" onClick={()=>setFilters({...(filters.scope?{scope:filters.scope}:{}),...(view==='At Risk'?{risk_level:'At Risk'}:{})})}>Clear filters</button>}</div>
        {activeFilters.length>0&&<div aria-label="Active filters" className="flex flex-wrap gap-2">{activeFilters.map(([key,value])=>{
          const groups:Record<string,{id:string;name:string}[]>={subject_id:options.subjects,department_id:options.departments,class_section_id:options.classes,stream_id:options.streams,teacher_user_id:options.teachers};
          const label:Record<string,string>={subject_id:'Subject',department_id:'Department',class_section_id:'Class',stream_id:'Stream',teacher_user_id:'Teacher',risk_level:'Risk',learner_query:'Search',learner_group:'Recognition',grade_level:'Grade/Form',grade:'Achievement',marks_status:'Marks',publication_status:'Publication'};
          const name=groups[key]?.find(item=>item.id===value)?.name??value.replaceAll('_',' ');
          return <button key={key} className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-medium text-blue-800" aria-label={`Remove ${label[key]??key} filter`} onClick={()=>{changeFilters({[key]:''});if(key==='risk_level'&&view==='At Risk')setView('Learners');}}><span className="truncate">{label[key]??key}: {name}</span><X aria-hidden="true" size={13} className="shrink-0"/></button>;
        })}</div>}
      </div>}
      {!analytics&&<p>{scopeNames[legacy.scope.level]}</p>}
      {legacy.data_quality.final_mark_count===0&&<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6"><h3 className="text-lg font-bold">{publishedOnly ? "No published exam results yet" : "No approved academic results yet"}</h3><p className="mt-2 text-sm">{publishedOnly ? "Analytics appear after the Principal publishes the exam results. Refresh after publication to review your assigned subjects and learners." : "Analytics will appear after marks are completed and approved. Missing marks are never treated as zero."}</p><div className="mt-4 flex flex-wrap gap-3">{props.onOpenMarks&&<button className={button} onClick={props.onOpenMarks}>Open marks workflow</button>}{props.onOpenReportCards&&<button className={button} onClick={props.onOpenReportCards}>Open report cards</button>}</div></div>}
      {analytics&&<>
        <div className="space-y-4">
          <div className="flex min-w-0 flex-col gap-2 border-b border-slate-200 pb-2 lg:flex-row lg:items-center">
            <nav aria-label="Academic analytics sections" className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-1">{tabs.map(tab=><button key={tab} type="button" aria-current={view===tab?"page":undefined} onClick={()=>openView(tab)} className={"min-h-11 shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-blue-600 "+(view===tab?"bg-blue-700 text-white":"text-slate-600 hover:bg-slate-100")}>{tab}</button>)}</nav>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">More views<select aria-label="More views" value={moreViews.includes(view)?view:''} onChange={event=>{if(event.target.value)openView(event.target.value);}} className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 lg:w-44"><option value="">Choose a view</option>{moreViews.map(tab=><option key={tab} value={tab}>{tab}</option>)}</select></label>
          </div>
          <div><h3 className="text-lg font-bold">{view}</h3><p className="mt-1 text-sm text-slate-500">{descriptions[view]}</p></div>
        </div>
        {(view==='Learners'||view==='At Risk')&&<form role="search" className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4" onSubmit={event=>{event.preventDefault();const form=new FormData(event.currentTarget);changeFilters({learner_query:String(form.get('learner_query')??'').trim()});}}>
          <label className="min-w-48 flex-1 space-y-1 text-sm font-semibold text-slate-700">Find a learner<input aria-label="Learner search" name="learner_query" type="search" maxLength={160} placeholder="Name or admission number" className={field} defaultValue={filters.learner_query??''} key={filters.learner_query??''}/></label>
          <button type="submit" className={button}><Search size={16} aria-hidden="true" className="mr-2 inline"/>Search</button>
          <p className="w-full text-xs text-slate-500">Search applies to the learner list. Summary figures keep the full academic selection.</p>
        </form>}
        {view==="Overview"&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label,value,next],index)=><button key={label} aria-label={`${label} ${value}`} onClick={()=>label==='High performers'||label==='Most improved'?drill({learner_group:label==='High performers'?'high_performers':'most_improved'}):openView(next)} className={"group min-h-28 rounded-xl border p-4 text-left transition-colors hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-blue-600 "+(index<4?'border-slate-200 bg-white':'border-slate-200 bg-slate-50')}><span className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600">{label}<ArrowRight aria-hidden="true" size={14} className="shrink-0 text-slate-400 group-hover:text-blue-600"/></span><strong className={"mt-3 block tabular-nums "+(value.length>18?'text-sm leading-6 text-slate-600':index<4?'text-2xl tracking-tight':'text-xl')}>{value}</strong><span aria-hidden="true" className="mt-2 block text-xs text-slate-500">{next==='Comparisons'?'Compared with previous results':next==='Targets'?'Intervention goals remain available':`View ${next.toLowerCase()}`}</span></button>)}</div>}
        <AcademicIntelligencePanels data={analytics} view={view} onView={openView} onDrill={drill} onPage={page=>setFilters(f=>({...f,page:String(page)}))} onCompare={id=>changeFilters({comparison_exam_id:id})} onRefresh={()=>void refetch()} {...props}/>
      </>}
    </>:null}
  </section>;
}
