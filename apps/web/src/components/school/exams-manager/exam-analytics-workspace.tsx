"use client";

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, ChevronRight, Download, RefreshCw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { isAcademicIntelligence, type AcademicIntelligence } from '@/lib/modules/academic-intelligence';
import { LIBRARY_CATEGORIES, OVERVIEW_ANALYTICS, type LibraryCategory } from '../../../../../api/src/modules/exams/analytics/analytics-library-contract';
import { ExamAnalyticsCard } from './exam-analytics-card';
import { ExamAnalyticsExport } from './exam-analytics-export';
import styles from './exam-analytics.module.css';
import type { ExamAnalyticsScopeLevel } from '../../../../../api/src/modules/exams/analytics/analytics-contract';

export interface ExamAnalyticsWorkspaceProps {
  scope?: ExamAnalyticsScopeLevel;
  emptyActions?: { label: string; onClick: () => void }[];
  onOpenMarks?: () => void;
  onOpenReportCards?: () => void;
}
const scopeLabels:Record<ExamAnalyticsScopeLevel,string>={school:'Whole school',department:'Appointed departments',subject:'Appointed subjects',grade:'Appointed grades / forms',class:'Appointed classes',assignment:'Assigned classes & subjects'};

const queryKeys=['academic_year_id','academic_term_id','exam_series_id','comparison_exam_id','class_section_id','stream_id','subject_id','department_id','grade_level','student_id','teacher_user_id','learner_query','history_limit','analytic_ids','analytic_page','comparison_dimension','compare_left_id','compare_right_id'];
const names:Record<string,string>={class_section_id:'Class',stream_id:'Stream',subject_id:'Subject',department_id:'Department',grade_level:'Grade / form',student_id:'Student',teacher_user_id:'Teacher',learner_query:'Learner search'};
function validLibrary(data:unknown):data is AcademicIntelligence & {library:NonNullable<AcademicIntelligence['library']>} {
  if(!isAcademicIntelligence(data)||data.library?.version!==1)return false;
  const {catalog,items,history,comparison_options}=data.library;
  const metadata=(i:typeof catalog[number])=>i&&['id','title','question','note'].every(key=>typeof i[key as keyof typeof i]==='string')&&LIBRARY_CATEGORIES.includes(i.category)&&['metric','table','bar','line','matrix','insight'].includes(i.kind)&&Array.isArray(i.columns)&&i.columns.every(c=>typeof c==='string');
  return Array.isArray(catalog)&&catalog.every(metadata)&&Array.isArray(items)&&!!history&&Array.isArray(comparison_options)&&comparison_options.every(o=>o&&typeof o.id==='string'&&typeof o.name==='string')&&items.every(i=>metadata(i)&&Number.isInteger(i.page)&&i.page>0&&Number.isInteger(i.total)&&i.total>=0&&Array.isArray(i.rows)&&i.rows.every(r=>Array.isArray(r.values)&&r.values.length===i.columns.length&&r.values.every(v=>v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v))));
}
export function ExamAnalyticsWorkspace({scope,onOpenMarks,onOpenReportCards,emptyActions=[]}:ExamAnalyticsWorkspaceProps) {
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [category,setCategory]=useState<LibraryCategory>('Overview');
  const [search,setSearch]=useState('');
  const [trail,setTrail]=useState<{filters:Record<string,string>;category:LibraryCategory}[]>([]);
  const [exportIds,setExportIds]=useState<string[]|null>(null);
  const [refreshKey,setRefreshKey]=useState('');
  useEffect(()=>{
    const restore=()=>{const params=new URLSearchParams(window.location.search);setFilters(Object.fromEntries(queryKeys.flatMap(key=>params.get(`ea_${key}`)?[[key,params.get(`ea_${key}`)!]]:[])));const view=params.get('ea_view');setCategory(LIBRARY_CATEGORIES.includes(view as LibraryCategory)?view as LibraryCategory:'Overview');setTrail([]);};
    restore();window.addEventListener('popstate',restore);return()=>window.removeEventListener('popstate',restore);
  },[]);
  function navigate(next:Record<string,string>,view=category) {
    setExportIds(null);setFilters(next);setCategory(view);
    const url=new URL(window.location.href);for(const key of queryKeys)url.searchParams.delete(`ea_${key}`);
    Object.entries(next).forEach(([key,value])=>{if(value)url.searchParams.set(`ea_${key}`,value);});url.searchParams.set('ea_view',view);
    window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
  }
  function update(changes:Record<string,string>,view=category) {navigate(Object.fromEntries(Object.entries({...filters,...changes,analytic_page:'1'}).filter(([,v])=>v!=='')),view);}
  const query=new URLSearchParams({...filters,...(scope?{scope}:{}),analytics_mode:'library',...(refreshKey?{refresh_key:refreshKey}:{})}).toString();
  const request=useSchoolQuery<AcademicIntelligence>(`${scope==='subject'?'/exams/analytics/subject':'/exams/analytics'}?${query}`,{staleTime:30000});
  const data=validLibrary(request.data)?request.data:undefined;
  const failed=request.error||(request.data&&!data?new Error('The analytics service returned an incomplete library. Please retry.'):null);
  const options=data?.options;
  const library=data?.library;
  const scopeLabel=scopeLabels[data?.scope.level??scope??'school'];
  const publishedOnly=['hod','head_of_department','hos','head_of_subject','subject_coordinator'].includes(data?.scope.role?.toLowerCase().replace(/[- ]/g,'_')??'') || scope==='subject';
  const resultsLabel=publishedOnly?'Published results':'Approved results';
  const actions=[...emptyActions,...(onOpenMarks?[{label:'Open marks workflow',onClick:onOpenMarks}]:[]),...(onOpenReportCards?[{label:'Open report cards',onClick:onOpenReportCards}]:[])];
  const catalog=library?.catalog??[];
  const currentExam=options?.exams.find(e=>e.id===data?.filters.exam_series_id);
  const items=library?.items??[];
  const activeId=filters.analytic_ids?.split(',')[0];
  const context=Object.entries(filters).filter(([key])=>key in names);
  const displayName=(key:string,value:string)=>{
    const groups:Record<string,{id:string;name:string}[]|undefined>={class_section_id:options?.classes,stream_id:options?.streams,subject_id:options?.subjects,department_id:options?.departments,teacher_user_id:options?.teachers,student_id:data?.learners.items.map(l=>({id:l.student_id,name:l.student_name}))};
    return groups[key]?.find(x=>x.id===value)?.name??value;
  };
  function openCategory(view:LibraryCategory) {
    setSearch('');const id=catalog.find(c=>c.category===view)?.id;
    update({analytic_ids:view==='Overview'?'':id??'',learner_query:filters.learner_query??''},view);
  }
  function drill(changes:Record<string,string>) {
    setTrail(t=>[...t,{filters,category}]);
    const view:LibraryCategory=changes.student_id?'Students':changes.subject_id?'Subjects':changes.class_section_id||changes.stream_id?'Students':'Overview';
    const analytic=changes.student_id?'student-subjects':changes.subject_id?'subject-class-matrix':changes.class_section_id||changes.stream_id?'student-profiles':'';
    update({...changes,analytic_ids:analytic},view);
  }
  function selector(label:string,key:string,values:{id:string;name:string}[],empty='All') {
    return <label>{label}<select className={styles.input} aria-label={label} value={filters[key]??''} onChange={e=>update({[key]:e.target.value,...(key==='academic_year_id'?{academic_term_id:'',exam_series_id:'',comparison_exam_id:''}:key==='academic_term_id'?{exam_series_id:'',comparison_exam_id:''}:key==='class_section_id'?{stream_id:'',student_id:''}:key==='stream_id'?{student_id:''}:{})})}><option value="">{empty}</option>{values.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>;
  }
  const reportsFilters={...filters,scope:data?.scope.level??'school',...(data?.filters.exam_series_id?{exam_series_id:data.filters.exam_series_id}:{}),...(data?.filters.comparison_exam_id?{comparison_exam_id:data.filters.comparison_exam_id}:{})};
  const reportViewIds=category==='Overview'?OVERVIEW_ANALYTICS:catalog.filter(c=>c.category===category).map(c=>c.id);
  return <section className={styles.workspace} aria-labelledby="exam-analytics-title">
    <header className={styles.hero}><div><p className={styles.eyebrow}>Academic intelligence · {scopeLabel}</p><h2 id="exam-analytics-title">Exam Analytics<span className={styles.heroDot}/></h2><p>Your academic story.<br className={styles.mobileBreak}/> Every result. Every direction. A clearer next step.</p></div><div className={styles.heroActions}><button className={styles.button} onClick={()=>setRefreshKey(String(Date.now()))} disabled={request.isFetching}><RefreshCw size={16} className={request.isFetching?styles.spinning:''}/>Refresh</button><button className={styles.primaryButton} disabled={!data||!!failed||request.isFetching} onClick={()=>setExportIds(reportViewIds)}><Download size={16}/>Download / print view</button></div></header>
    {failed&&<div role="alert" className={styles.error}><strong>Exam Analytics could not be loaded</strong><p>{failed.message}</p><button className={styles.button} onClick={()=>setRefreshKey(String(Date.now()))}>Retry live analytics</button></div>}
    {request.isLoading&&<div role="status" className={styles.loading}><span/>Loading authorized exam analytics…</div>}
    {data&&!failed&&<>
      <div className={styles.contextBar}><div><span className={styles.statusDot}/><strong>{currentExam?.name??'No exam evidence'}</strong><span>{currentExam?`${currentExam.term_name} · ${currentExam.year_name}`:'No results available within your responsibility'}</span></div><span role="status">{request.isFetching?'Updating…':`${data.performance.learners_examined} learners · ${resultsLabel}`}</span></div>
      <div className={styles.filters}><div className={styles.mainFilters}>
        {selector('Academic year','academic_year_id',[...new Map(options!.exams.map(e=>[e.academic_year_id,{id:e.academic_year_id,name:e.year_name}])).values()],'Latest available')}
        {selector('Term','academic_term_id',[...new Map(options!.exams.filter(e=>!filters.academic_year_id||e.academic_year_id===filters.academic_year_id).map(e=>[e.academic_term_id,{id:e.academic_term_id,name:`${e.term_name} · ${e.year_name}`}])).values()],'Latest available')}
        {selector('Exam','exam_series_id',options!.exams.filter(e=>(!filters.academic_year_id||e.academic_year_id===filters.academic_year_id)&&(!filters.academic_term_id||e.academic_term_id===filters.academic_term_id)),'Latest available')}
        {selector('Compare with','comparison_exam_id',options!.exams.filter(e=>e.id!==data.filters.exam_series_id),'Previous available exam')}
      </div><details className={styles.moreFilters}><summary><SlidersHorizontal size={16}/>Refine analysis{context.length?` · ${context.length} active`:''}</summary><div className={styles.filterGrid}>
        {selector('Class','class_section_id',options!.classes)}{selector('Stream','stream_id',options!.streams)}{selector('Subject','subject_id',options!.subjects)}
        {selector('Grade / form','grade_level',options!.grades.map(id=>({id,name:id})))}{selector('Department','department_id',options!.departments)}{selector('Teacher / subject allocation','teacher_user_id',options!.teachers)}
        {selector('History depth','history_limit',[12,24,60,120].map(n=>({id:String(n),name:`Up to ${n} exams`})),'Up to 24 exams')}
      </div><p className={styles.muted}>Historical teacher allocations use exam dates. Use a learner row to open that student’s profile.</p></details>
      {context.length>0&&<div className={styles.chips}>{context.map(([key,value])=><button key={key} onClick={()=>update({[key]:'',...(key==='class_section_id'?{stream_id:'',student_id:''}:key==='stream_id'?{student_id:''}:{})})} aria-label={`Remove ${names[key]} filter`}>{names[key]}: {displayName(key,value)}<X size={13}/></button>)}<button onClick={()=>{setTrail([]);navigate({},'Overview');}}>Reset analysis</button></div>}
      </div>
      <div className={styles.navigation}><nav aria-label="Exam Analytics sections">{LIBRARY_CATEGORIES.map(view=><button key={view} aria-current={category===view?'page':undefined} onClick={()=>openCategory(view)}>{view}</button>)}</nav><label className={styles.mobileNav}>Explore analytics<select className={styles.input} aria-label="Analytics section" value={category} onChange={e=>openCategory(e.target.value as LibraryCategory)}>{LIBRARY_CATEGORIES.map(view=><option key={view}>{view}</option>)}</select></label></div>
      {trail.length>0&&<button className={styles.textButton} onClick={()=>{const previous=trail.at(-1)!;setTrail(t=>t.slice(0,-1));navigate(previous.filters,previous.category);}}><ArrowLeft size={15}/>Back to previous analysis</button>}
      {data.performance.learners_examined===0&&<div className={styles.empty}><BookOpen size={25}/><h3>No {publishedOnly?'published':'approved'} results in this selection</h3><p>{publishedOnly?'Choose a published exam or ask school leadership to check publication and your active academic appointments.':(data.scope.level==='school'?'Complete marks and approve report cards to unlock academic analysis, or choose another exam.':'Choose another exam or ask school leadership to check your active academic assignments and result readiness.')} Missing work is never scored as zero.</p><div className={styles.actionRow}>{actions.map(action=><button key={action.label} className={styles.button} onClick={action.onClick}>{action.label}</button>)}</div></div>}
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{category==='Overview'?'The academic picture':`${catalog.filter(c=>c.category===category).length} ways to explore`}</p><h3>{category==='Overview'?'A clear view of where you stand':category}</h3></div><label className={styles.search}><Search size={17}/><input type="search" aria-label="Search analytics library" placeholder={`Search ${catalog.length} analytics…`} value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
      {category==='Overview'&&!search?<><div className={styles.metricGrid}>{items.filter(i=>i.kind==='metric').map(item=><ExamAnalyticsCard key={item.id} item={item} onExport={id=>setExportIds([id])} onDrill={drill} onPage={page=>update({analytic_page:String(page)})} disabled={request.isFetching}/>)}</div><div className={styles.overviewGrid}>{items.filter(i=>i.kind!=='metric').map(item=><ExamAnalyticsCard key={item.id} item={item} onExport={id=>setExportIds([id])} onDrill={drill} onPage={page=>navigate({...filters,analytic_page:String(page)})} disabled={request.isFetching}/>)}</div><div className={styles.exploreStrip}><div><strong>Follow the question that matters.</strong><p>Compare a class, discover a subject pattern or follow a student’s progress.</p></div>{(['Subjects','Classes & Streams','Students'] as LibraryCategory[]).map(view=><button key={view} className={styles.button} onClick={()=>openCategory(view)}>{view}<ArrowUpRight size={15}/></button>)}</div></>:<div className={styles.libraryLayout}>
        <aside className={styles.libraryList} aria-label="Analytics library"><p>{search?'Matching analytics':`${category} library`}</p>{catalog.filter(c=>search?`${c.title} ${c.question} ${c.category}`.toLowerCase().includes(search.toLowerCase()):c.category===category).map(c=><button key={c.id} aria-current={activeId===c.id?'true':undefined} onClick={()=>{setSearch('');update({analytic_ids:c.id},c.category);}}><span><strong>{c.title}</strong><small>{c.question}</small></span><ChevronRight size={15}/></button>)}{search&&!catalog.some(c=>`${c.title} ${c.question} ${c.category}`.toLowerCase().includes(search.toLowerCase()))&&<p>No matching analytic. Try “progress”, “grade” or “class”.</p>}</aside>
        <div className={styles.detail}>
          {activeId==='focused-comparison'&&<div className={styles.filters}><div className={styles.filterGrid}>
            <label>Compare<select className={styles.input} aria-label="Comparison dimension" value={filters.comparison_dimension??'class'} onChange={e=>update({comparison_dimension:e.target.value,compare_left_id:'',compare_right_id:''})}>{['class','stream','subject','student','exam','term','year'].map(v=><option key={v} value={v}>{v[0].toUpperCase()+v.slice(1)}</option>)}</select></label>
            {selector('Left selection','compare_left_id',library!.comparison_options,'First available')}
            {selector('Right selection','compare_right_id',library!.comparison_options,'Next available')}
          </div><p className={styles.muted}>Choose two within the current academic context. Differences are left minus right; exam difficulty and cohort differences still matter.</p></div>}
          {category==='Students'&&<form className={styles.learnerSearch} onSubmit={e=>{e.preventDefault();update({learner_query:String(new FormData(e.currentTarget).get('learner')??'').trim()});}}><label>Find a learner<input className={styles.input} type="search" name="learner" aria-label="Find a learner" placeholder="Name or admission number" defaultValue={filters.learner_query??''} key={filters.learner_query??''}/></label><button className={styles.button} type="submit">Search</button><p>Search narrows learner lists; use Explore to focus all analytics on one student.</p></form>}
          {items.map(item=><ExamAnalyticsCard key={item.id} item={item} onExport={id=>setExportIds([id])} onDrill={drill} onPage={page=>navigate({...filters,analytic_page:String(page)})} disabled={request.isFetching}/>)}
        </div>
      </div>}
      <footer className={styles.footer}><span>{library!.history.cycles} exam cycles · {library!.history.first??'No history'} → {library!.history.last??'No history'}</span><span>{resultsLabel} · {scopeLabel} · Every analytic downloadable & printable</span></footer>
      {exportIds&&<ExamAnalyticsExport ids={exportIds} catalog={catalog} filters={reportsFilters} subjectOnly={scope==='subject'} onClose={()=>setExportIds(null)}/>}
    </>}
  </section>;
}
