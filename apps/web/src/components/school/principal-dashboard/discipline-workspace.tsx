"use client";

import { useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, ClipboardList, ShieldAlert, UsersRound } from 'lucide-react';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { usePermissions } from '@/components/providers/permission-context';
import { LearnerPicker } from '@/components/common/learner-picker';
import type { LearnerLookupItem } from '@/lib/students/student-lookup';
import type { DisciplineAnalytics, DisciplineIncident, DisciplineIncidentDetail } from '@/lib/discipline/discipline-live';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useVerifiedPrincipalDashboardApi } from './verified-tenant-api';
import { PrincipalHeader, PrincipalMetrics, PrincipalPanel, PrincipalTrend, principalStyles as s } from './workspace-ui';

type Option = { id:string; label:string; default_severity?:string };
type Options = { classes:Option[]; years:Option[]; terms:Option[]; offense_categories:Option[] };
type Enrollment = { class_id?:string; academic_year_id?:string; academic_term_id?:string };
const severities = ['low','medium','high','critical'];
const statuses = ['reported','under_review','pending_action','awaiting_parent_response','counselling_assigned','escalated','suspended','resolved','closed'];
const readable = (value:string) => value.replaceAll('_',' ');
const dateLabel = (value:string) => new Intl.DateTimeFormat('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Nairobi'}).format(new Date(value));
const localNow = () => new Date(Date.now()+3*60*60*1000).toISOString().slice(0,16);
const tone = (value:string) => ['high','critical','escalated'].includes(value) ? 'rose' : ['resolved','closed'].includes(value) ? 'mint' : 'amber';

export function PrincipalDisciplineWorkspace({tenantSlug}:{tenantSlug:string}) {
  const {hasPermission}=usePermissions(); const canWrite=hasPermission('discipline:write');
  const [filters,setFilters]=useState({q:'',status:'',severity:'',class_id:'',offense_category_id:'',from:'',to:''});
  const [search,setSearch]=useState(''); const [page,setPage]=useState(0); const [create,setCreate]=useState(false); const [selected,setSelected]=useState<DisciplineIncident|null>(null); const [notice,setNotice]=useState('');
  useEffect(()=>{const timer=setTimeout(()=>setSearch(filters.q.trim()),250);return()=>clearTimeout(timer);},[filters.q]);
  const params=new URLSearchParams({limit:'25',offset:String(page*25)});
  Object.entries({...filters,q:search}).forEach(([key,value])=>{if(value)params.set(key,key==='from'?`${value}T00:00:00+03:00`:key==='to'?`${value}T23:59:59.999+03:00`:value);});
  const register=useSchoolQuery<DisciplineIncident[]>(`/discipline/incidents?${params}`);
  const options=useSchoolQuery<Options>('/discipline/incident-options');
  const analytics=useSchoolQuery<DisciplineAnalytics>(hasPermission('discipline:reports')?'/discipline/analytics/overview':null);
  const legacy=useSchoolQuery<{recentIncidents:Array<{id:string;title:string;severity:string;status:string;date:string}>}>('/admin-command/principal/discipline');
  const update=(key:keyof typeof filters,value:string)=>{setFilters(current=>({...current,[key]:value}));setPage(0);};
  const refresh=async()=>{await Promise.all([register.refetch(),...(hasPermission('discipline:reports')?[analytics.refetch()]:[])]);};
  return <div className={s.stack}>
    <PrincipalHeader icon={ShieldAlert} tone="rose" title="Discipline & student welfare" description="Review recorded incidents, support learners and follow up decisions with the discipline team." actions={<><Button variant="outline" onClick={()=>void refresh()}>Refresh</Button>{canWrite&&<Button onClick={()=>setCreate(true)}>Report Incident</Button>}</>}/>
    {notice&&<p role="status" className={s.notice}>{notice}</p>}
    {analytics.error&&<p role="alert" className={s.error}>Discipline totals could not load. <Button variant="outline" onClick={()=>void analytics.refetch()}>Retry totals</Button></p>}
    {analytics.data&&<PrincipalMetrics items={[
      {label:'Open cases',value:analytics.data.open_cases,detail:'Awaiting case completion',icon:ClipboardList,tone:'blue'},
      {label:'Severe incidents',value:analytics.data.severe_incidents,detail:'High or critical severity',icon:ShieldAlert,tone:'rose'},
      {label:'Pending approvals',value:analytics.data.pending_approvals,detail:'Follow existing approval rules',icon:AlertTriangle,tone:'amber'},
      {label:'Repeat incident alerts',value:analytics.data.repeat_offender_alerts,detail:'Review learner history',icon:UsersRound,tone:'violet'},
    ]}/>}
    <PrincipalPanel title="Incident register" description="Search by admission number, learner name, case number or incident details." tone="rose">
      <div className={s.toolbar}>
        <label className={s.field}>Search incidents<input type="search" value={filters.q} onChange={e=>update('q',e.target.value)} placeholder="Name, admission number or case"/></label>
        <label className={s.field}>Severity<select value={filters.severity} onChange={e=>update('severity',e.target.value)}><option value="">All severities</option>{severities.map(value=><option key={value}>{value}</option>)}</select></label>
        <label className={s.field}>Status<select value={filters.status} onChange={e=>update('status',e.target.value)}><option value="">All statuses</option>{statuses.map(value=><option key={value} value={value}>{readable(value)}</option>)}</select></label>
        <label className={s.field}>Class<select value={filters.class_id} onChange={e=>update('class_id',e.target.value)}><option value="">All classes</option>{options.data?.classes.map(value=><option key={value.id} value={value.id}>{value.label}</option>)}</select></label>
        <label className={s.field}>Category<select value={filters.offense_category_id} onChange={e=>update('offense_category_id',e.target.value)}><option value="">All categories</option>{options.data?.offense_categories.map(value=><option key={value.id} value={value.id}>{value.label}</option>)}</select></label>
        <label className={s.field}>From<input type="date" value={filters.from} onChange={e=>update('from',e.target.value)}/></label><label className={s.field}>To<input type="date" value={filters.to} onChange={e=>update('to',e.target.value)}/></label>
      </div>
      {options.error&&<p role="alert" className={s.error}>Class and category filters could not load. <Button variant="outline" onClick={()=>void options.refetch()}>Retry choices</Button></p>}
      {register.error?<p role="alert" className={s.error}>{register.error.message} <Button variant="outline" onClick={()=>void register.refetch()}>Retry register</Button></p>:register.isLoading?<p role="status" className={s.empty}>Loading school incidents…</p>:register.data?.length?<>
        <IncidentTable records={register.data} onOpen={setSelected}/>
        <div className={s.actions}><Button variant="outline" disabled={!page} onClick={()=>setPage(page-1)}>Previous</Button><span>Page {page+1}</span><Button variant="outline" disabled={register.data.length<25} onClick={()=>setPage(page+1)}>Next</Button></div>
      </>:<p className={s.empty}>No incidents match these filters. Recorded incidents will appear here.</p>}
    </PrincipalPanel>
    {analytics.data&&<PrincipalPanel title="Recorded incident categories" description="Actual recorded cases by category, for identifying recurring issues." tone="amber"><PrincipalTrend label="Cases by category" points={analytics.data.top_offenses.map(item=>({label:item.offense,value:item.count}))}/></PrincipalPanel>}
    {legacy.error&&<p role="alert" className={s.error}>Earlier administrative incidents could not load. <Button variant="outline" onClick={()=>void legacy.refetch()}>Retry earlier incidents</Button></p>}
    {!!legacy.data?.recentIncidents?.length&&<PrincipalPanel title="Earlier administrative incidents" description="Recent records retained from the previous administrative register." tone="violet"><div className={s.tableShell}><table><thead><tr><th>Incident</th><th>Date</th><th>Severity</th><th>Status</th></tr></thead><tbody>{legacy.data.recentIncidents.map(row=><tr key={row.id}><td>{row.title}</td><td>{row.date}</td><td>{row.severity}</td><td>{readable(row.status)}</td></tr>)}</tbody></table></div></PrincipalPanel>}
    {create&&canWrite&&<IncidentEditor tenantSlug={tenantSlug} options={options.data} onClose={()=>setCreate(false)} onSaved={async()=>{setCreate(false);setNotice('Incident recorded and available to the discipline team.');await refresh();}}/>}
    {selected&&<IncidentDetails record={selected} onClose={()=>setSelected(null)} onChanged={refresh}/>}
  </div>;
}

function IncidentTable({records,onOpen}:{records:DisciplineIncident[];onOpen:(record:DisciplineIncident)=>void}) {
  return <div className={s.tableShell}><table><thead><tr><th>Incident / date</th><th>Learner</th><th>Category</th><th>Severity / status</th><th>Responsible staff</th></tr></thead><tbody>{records.map(row=><tr key={row.id}>
    <td><button className={s.link} onClick={()=>onOpen(row)}>{row.title}</button><small>{row.incident_number} · {dateLabel(row.occurred_at)}</small></td><td>{row.student_name||'Learner record'}<small>{row.admission_number}</small><small>{row.class_label||'Class not available'}</small></td><td>{row.category_name||'Category not available'}</td><td><span className={s.badge} data-tone={tone(row.severity)}>{row.severity}</span><small>{readable(row.status)}</small></td><td>{row.assigned_staff_name||'Not assigned'}</td>
  </tr>)}</tbody></table></div>;
}

function IncidentEditor({tenantSlug,options,onClose,onSaved}:{tenantSlug:string;options?:Options;onClose:()=>void;onSaved:()=>Promise<void>}) {
  const request=useVerifiedPrincipalDashboardApi(); const [learner,setLearner]=useState<LearnerLookupItem|null>(null);const [severity,setSeverity]=useState('medium');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const profile=useSchoolQuery<{academic_enrollment?:Enrollment}>(learner?`/admissions/students/${encodeURIComponent(learner.id)}/profile`:null);
  const history=useSchoolQuery<DisciplineIncident[]>(learner?`/discipline/incidents?student_id=${encodeURIComponent(learner.id)}&limit=5`:null);
  const enrollment=profile.data?.academic_enrollment;
  async function save(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy)return;setError('');
    const form=new FormData(event.currentTarget);
    if(!learner||!form.get('class_id')||!form.get('academic_term_id')||!form.get('academic_year_id')){setError('Select the learner, class, academic year and term for this incident.');return;}
    setBusy(true);
    try{await request('/discipline/incidents',{method:'POST',body:{student_id:learner.id,class_id:form.get('class_id'),academic_year_id:form.get('academic_year_id'),academic_term_id:form.get('academic_term_id'),offense_category_id:String(form.get('category')),title:String(form.get('title')).trim(),severity,occurred_at:new Date(`${form.get('occurred_at')}:00+03:00`).toISOString(),location:String(form.get('location')).trim(),description:String(form.get('description')).trim()}});await onSaved();}catch(cause){setError(cause instanceof Error?cause.message:'The incident could not be saved.');}finally{setBusy(false);}
  }
  return <Modal open onClose={()=>{if(!busy)onClose();}} title="Report Incident" footer={<><Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" form="principal-incident-form" disabled={busy||profile.isFetching||!options?.offense_categories.length}>{busy?'Saving…':'Save incident'}</Button></>}>
    <form id="principal-incident-form" onSubmit={save} className={s.form}>
      {error&&<p role="alert" className={s.error}>{error}</p>}
      <LearnerPicker label="Find learner" tenantSlug={tenantSlug} value={learner} onChange={setLearner} hint="Search by admission number or name."/>
      {learner&&<p className={s.notice}>{learner.name} · {learner.admissionNumber} · {learner.classLabel||'Class not assigned'}</p>}
      {profile.error&&<p role="alert" className={s.error}>{profile.error.message}<Button type="button" variant="outline" onClick={()=>void profile.refetch()}>Retry learner context</Button></p>}
      <div key={`${learner?.id}-${enrollment?.class_id}-${enrollment?.academic_term_id}`} className={s.formGrid}>
        {(['class_id','academic_year_id','academic_term_id'] as const).map(key=><label key={key} className={s.field}>{key==='class_id'?'Incident class':key==='academic_year_id'?'Academic year':'Academic term'}<select name={key} required defaultValue={enrollment?.[key]??''}><option value="">Select {key==='class_id'?'class':key==='academic_year_id'?'year':'term'}</option>{(key==='class_id'?options?.classes:key==='academic_year_id'?options?.years:options?.terms)?.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label>)}
      </div>
      <label className={s.field}>Title<input name="title" required maxLength={200}/></label>
      <div className={s.formGrid}><label className={s.field}>Category<select name="category" required defaultValue="" onChange={e=>setSeverity(options?.offense_categories.find(row=>row.id===e.target.value)?.default_severity||'medium')}><option value="" disabled>Select a category</option>{options?.offense_categories.map(row=><option key={row.id} value={row.id}>{row.label}</option>)}</select></label><label className={s.field}>Severity<select value={severity} onChange={e=>setSeverity(e.target.value)}>{severities.map(value=><option key={value}>{value}</option>)}</select></label></div>
      {!options?.offense_categories.length&&<p className={s.empty}>Incident categories must be available before submitting. Close this form and retry the category choices.</p>}
      <div className={s.formGrid}><label className={s.field}>Occurred at (East Africa Time)<input type="datetime-local" name="occurred_at" required defaultValue={localNow()}/></label><label className={s.field}>Location<input name="location" maxLength={200}/></label></div>
      <label className={s.field}>Description<textarea name="description" rows={4} required maxLength={10000}/></label>
      {learner&&<div><h3>Recent learner incidents</h3>{history.error?<p role="alert" className={s.error}>Learner history could not load. <Button type="button" variant="outline" onClick={()=>void history.refetch()}>Retry history</Button></p>:history.isLoading?<p role="status">Loading learner history…</p>:history.data?.length?<ul>{history.data.map(row=><li key={row.id}>{row.title} · {readable(row.status)} · {dateLabel(row.occurred_at)}</li>)}</ul>:<p>No previous incidents recorded.</p>}</div>}
    </form>
  </Modal>;
}

function IncidentDetails({record,onClose,onChanged}:{record:DisciplineIncident;onClose:()=>void;onChanged:()=>Promise<void>}) {
  const {hasPermission}=usePermissions();const canManage=hasPermission('discipline:manage');const canWrite=hasPermission('discipline:write'); const request=useVerifiedPrincipalDashboardApi();
  const detail=useSchoolQuery<DisciplineIncidentDetail>(`/discipline/incidents/${encodeURIComponent(record.id)}`);
  const [historyPage,setHistoryPage]=useState(0);const [historyRecord,setHistoryRecord]=useState<DisciplineIncident|null>(null);
  const history=useSchoolQuery<DisciplineIncident[]>(`/discipline/incidents?student_id=${encodeURIComponent(record.student_id)}&limit=10&offset=${historyPage*10}`);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  async function followUp(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const form=event.currentTarget;const values=new FormData(form);setBusy(true);setError('');
    try{await request(`/discipline/incidents/${encodeURIComponent(record.id)}/comments`,{method:'POST',body:{body:String(values.get('body')).trim(),visibility:detail.data?.internal_visible?'internal':'public'}});form.reset();setNotice('Follow-up saved.');await detail.refetch();await onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Follow-up could not be saved.');}finally{setBusy(false);}}
  async function changeStatus(event:FormEvent<HTMLFormElement>){event.preventDefault();if(busy)return;const values=new FormData(event.currentTarget);setBusy(true);setError('');
    try{await request(`/discipline/incidents/${encodeURIComponent(record.id)}/status`,{method:'POST',body:{status:values.get('status'),reason:String(values.get('reason')).trim()}});setNotice('Case status updated.');await detail.refetch();await onChanged();}catch(cause){setError(cause instanceof Error?cause.message:'Status could not be updated.');}finally{setBusy(false);}}
  const incident=detail.data?.incident;
  return <Modal open title={record.incident_number} onClose={()=>{if(!busy)onClose();}} footer={<Button variant="outline" onClick={onClose} disabled={busy}>Close case</Button>}>
    <div className={s.stack}>
      {detail.error?<p role="alert" className={s.error}>{detail.error.message}<Button variant="outline" onClick={()=>void detail.refetch()}>Retry case</Button></p>:!incident?<p role="status">Loading case…</p>:<>
        <div><h3>{incident.title}</h3><p>{record.student_name} · {record.admission_number} · {record.class_label}</p><p>{dateLabel(incident.occurred_at)} · {readable(incident.status)} · {incident.severity}</p><p style={{whiteSpace:'pre-wrap'}}>{incident.description}</p>{incident.location&&<p>Location: {incident.location}</p>}{incident.action_taken&&<p>Action taken: {incident.action_taken}</p>}{incident.recommendations&&<p>Recommendations: {incident.recommendations}</p>}</div>
        {error&&<p role="alert" className={s.error}>{error}</p>}{notice&&<p role="status" className={s.notice}>{notice}</p>}
        <div><h3>Assigned actions</h3>{detail.data?.actions.length?<ul>{detail.data.actions.map(action=><li key={action.id}><strong>{action.title}</strong> · {readable(action.status)}{action.due_at&&` · Due ${dateLabel(action.due_at)}`}</li>)}</ul>:<p>No actions assigned by the discipline team.</p>}</div>
        <div><h3>Follow-up history</h3>{detail.data?.comments.length?<div className={s.boundedList}>{detail.data.comments.map(comment=><div key={comment.id} className={s.calendarItem}><div><p style={{whiteSpace:'pre-wrap'}}>{comment.body}</p><small>{dateLabel(comment.created_at)} · {comment.visibility==='internal'?'Internal note':'Case note'}</small></div></div>)}</div>:<p>No follow-up notes yet.</p>}</div>
        {canWrite&&<form className={s.form} onSubmit={followUp}><label className={s.field}>Follow-up note<textarea name="body" required maxLength={10000} rows={3}/><small>{detail.data?.internal_visible?'Visible to authorized discipline managers.':'Visible to staff authorized to read this case.'}</small></label><Button type="submit" disabled={busy}>Save follow-up</Button></form>}
        {canManage&&<form className={s.form} onSubmit={changeStatus}><div className={s.formGrid}><label className={s.field}>Review outcome<select name="status"><option value="under_review">Under review</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label><label className={s.field}>Reason<input name="reason" required maxLength={1000}/></label></div><Button variant="outline" type="submit" disabled={busy}>Update case status</Button></form>}
        <div><h3>Learner incident history</h3>{history.error?<p role="alert" className={s.error}>History could not load.<Button variant="outline" onClick={()=>void history.refetch()}>Retry history</Button></p>:history.isLoading?<p>Loading history…</p>:<>{history.data?.map(row=><div key={row.id} className={s.calendarItem}><button className={s.link} onClick={()=>setHistoryRecord(row)}>{row.title}</button><small>{dateLabel(row.occurred_at)} · {readable(row.status)}</small></div>)}<div className={s.actions}><Button variant="outline" disabled={!historyPage} onClick={()=>setHistoryPage(historyPage-1)}>Earlier page</Button><Button variant="outline" disabled={(history.data?.length??0)<10} onClick={()=>setHistoryPage(historyPage+1)}>More history</Button></div></>}</div>
        {historyRecord&&<div className={s.notice}><strong>{historyRecord.title}</strong><p style={{whiteSpace:'pre-wrap'}}>{historyRecord.description}</p><p>{historyRecord.assigned_staff_name||'Staff not assigned'}</p></div>}
      </>}
    </div>
  </Modal>;
}
