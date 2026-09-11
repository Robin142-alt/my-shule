"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
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
const button = "min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50";
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
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [view,setView]=useState("Overview");
  const query=new URLSearchParams(filters).toString();
  const {data,isLoading,isFetching,error,refetch}=useSchoolQuery<LiveExamsAnalyticsResponse>("/exams/analytics"+(query?"?"+query:""),{staleTime:30000});
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
  const tabs=["Overview","Performance","Comparisons","Learners","Trends","Targets","At Risk","Advanced","Exam Analysis","Interventions","Exam Operations",...(props.onOpenReportCards?["Reports"]:[])];
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
  return <section className="space-y-5 text-slate-900" aria-labelledby="academic-intelligence-title">
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div><p className="text-sm font-semibold text-blue-700">{scopeTitle}</p><h2 id="academic-intelligence-title" className="mt-1 text-2xl font-bold">{title}</h2><p className="mt-2 max-w-3xl text-sm text-slate-600">Approved results, important changes, and clear follow-up for your authorized school responsibilities.</p></div>
      <button className={button} disabled={isFetching} onClick={()=>void refetch()}><RefreshCw className="mr-2 inline h-4 w-4"/>Refresh</button>
    </header>
    {(error||malformed)&&<div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-5"><h3 className="font-bold">Academic intelligence could not be loaded</h3><p>{error?.message??"The live exams service returned an incomplete analytics response. No values were displayed as real school data."}</p><button className={button+" mt-3"} onClick={()=>void refetch()}>Retry live data</button></div>}
    {isLoading?<div aria-label="Loading academic intelligence" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({length:8},(_,i)=><div key={i} className="h-28 animate-pulse rounded-xl bg-slate-100"/>)}</div>:legacy&&!error&&!malformed?<>
      {analytics&&options&&<div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {select("Academic Year","academic_year_id",[...new Map(options.exams.map(e=>[e.academic_year_id,{id:e.academic_year_id,name:e.year_name}])).values()])}
          {select("Term","academic_term_id",[...new Map(options.exams.filter(e=>!filters.academic_year_id||e.academic_year_id===filters.academic_year_id).map(e=>[e.academic_term_id,{id:e.academic_term_id,name:e.term_name}])).values()])}
          {select("Exam","exam_series_id",examOptions,"Latest authorized exam")}
          <label className="space-y-1 text-sm font-semibold text-slate-700">Responsibility<select aria-label="Responsibility" className={field} value={filters.scope??analytics.scope.level} onChange={e=>{setFilters({scope:e.target.value});setView("Overview");}}>{analytics.scope.available_scopes.map(scope=><option key={scope} value={scope}>{scopeNames[scope]}</option>)}</select></label>
        </div>
        <details><summary className="cursor-pointer py-2 font-semibold">More Filters</summary><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {select("Department","department_id",options.departments,"All authorized departments",selectedScope==="school")}
          {select("Subject","subject_id",options.subjects,"All authorized subjects")}
          {select("Grade/Form","grade_level",options.grades.map(id=>({id,name:id})),"All authorized grades",selectedScope!=="class")}
          {select("Stream","stream_id",options.streams,"All authorized streams")}
          {select("Class","class_section_id",options.classes,"All authorized classes")}
          {select("Teacher allocation","teacher_user_id",options.teachers,"All authorized allocations",selectedScope!=="assignment")}
          <label className="space-y-1 text-sm font-semibold text-slate-700">Learner<input aria-label="Learner search" type="search" maxLength={160} placeholder="Name or admission number" className={field} defaultValue={filters.learner_query??''} key={`${filters.scope??'default'}:${filters.learner_query??''}`} onBlur={e=>changeFilters({learner_query:e.target.value})} onKeyDown={e=>{if(e.key==='Enter')changeFilters({learner_query:e.currentTarget.value});}}/></label>
          {select("Risk Level","risk_level",["At Risk","Low","Moderate","High","Critical"].map(id=>({id,name:id})))}
          {select("Recognition","learner_group",[{id:'high_performers',name:'High performers'},{id:'most_improved',name:'Most improved'},{id:'passing_all',name:'Passing all subjects'},{id:'declining',name:'Declining results'},{id:'consistent_improvers',name:'Consistently improving'},{id:'consistent_high',name:'Consistently high performers'}])}
          {select("Grade / Achievement","grade",(analytics.distribution??[]).filter(b=>b.id!=='ungraded').map(b=>({id:b.label,name:b.label})))}
          {select("Marks Status","marks_status",["missing","draft","submitted","reviewed","locked","published"].map(id=>({id,name:id})))}
          {select("Publication Status","publication_status",["draft_requested","draft_generated","under_review","approved","published"].map(id=>({id,name:id.replaceAll("_"," ")})))}
        </div></details>
        <div className="flex flex-wrap items-center gap-3"><p className="text-sm text-slate-600">{options.exams.find(e=>e.id===analytics.filters.exam_series_id)?.name??"No exam evidence in this scope"}{isFetching?" Â· Updatingâ€¦":""}</p>{Object.keys(filters).length>0&&<button className={button} onClick={()=>setFilters({...(filters.scope?{scope:filters.scope}:{}),...(view==='At Risk'?{risk_level:'At Risk'}:{})})}>Clear filters</button>}</div>
      </div>}
      {!analytics&&<p>{scopeNames[legacy.scope.level]}</p>}
      {legacy.data_quality.final_mark_count===0&&<div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6"><h3 className="text-lg font-bold">No approved academic results yet</h3><p className="mt-2 text-sm">Analytics will appear after marks are completed and approved. Missing marks are never treated as zero.</p><div className="mt-4 flex flex-wrap gap-3">{props.onOpenMarks&&<button className={button} onClick={props.onOpenMarks}>Open marks workflow</button>}{props.onOpenReportCards&&<button className={button} onClick={props.onOpenReportCards}>Open report cards</button>}</div></div>}
      {analytics&&<>
        <nav aria-label="Academic analytics sections" className="flex flex-wrap gap-2">{tabs.map(tab=><button key={tab} type="button" aria-current={view===tab?"page":undefined} onClick={()=>openView(tab)} className={button+(view===tab?" border-blue-700 bg-blue-50 text-blue-800":"")}>{tab}</button>)}</nav>
        {view==="Overview"&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([label,value,next])=><button key={label} onClick={()=>label==='High performers'||label==='Most improved'?drill({learner_group:label==='High performers'?'high_performers':'most_improved'}):openView(next)} className="min-h-28 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-500"><span className="text-sm text-slate-600">{label}</span><strong className="mt-2 block text-xl">{value}</strong></button>)}</div>}
        <AcademicIntelligencePanels data={analytics} view={view} onView={openView} onDrill={drill} onPage={page=>setFilters(f=>({...f,page:String(page)}))} onCompare={id=>changeFilters({comparison_exam_id:id})} onRefresh={()=>void refetch()} {...props}/>
      </>}
    </>:null}
  </section>;
}
