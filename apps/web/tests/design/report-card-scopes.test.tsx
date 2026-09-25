import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveReportCardsWorkspace } from '@/components/school/live-report-cards-workspace';
import { PublishingWorkspace } from '@/components/school/exams-manager/publishing-workspace';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { requestSchoolApiProxy } from '@/lib/dashboard/school-api-proxy-client';
import type { LiveExamReportCard } from '@/lib/modules/exams-client';

jest.mock('@/components/school/integrated-school-command-header',()=>({useSchoolCommandIdentity:()=>({schoolName:'Kibabi School',logoUrl:null})}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:jest.fn()}));
jest.mock('@/lib/dashboard/school-api-proxy-client',()=>({requestSchoolApiProxy:jest.fn()}));
const request=requestSchoolApiProxy as jest.Mock;
const queries=useSchoolQuery as jest.Mock;
const refetch=jest.fn().mockResolvedValue({data:[]});
const cards:LiveExamReportCard[]=['Ada','Ben','Cara'].map((name,i)=>({id:`card-${i}`,student_id:`student-${i}`,student_name:name,
  exam_series_id:'exam1',exam_series_name:'End term',report_snapshot_id:`snapshot-${i}`,status:i===1?'under_review':'draft_generated',
  class_name:i===2?'Grade 9':'Grade 8',student_class_section_id:i===2?'grade9':'grade8',
  stream_name:i===2?null:'North',student_stream_id:i===2?null:'north',verification_code:`VERIFY-${i}`,
  metadata:{report_card:{template_fields:{learner_name:name},subjects:[]}}}));
const hierarchy=[{class_section_id:'grade8',class_name:'Grade 8',card_count:2,streams:[{stream_id:'north',stream_name:'North',card_count:2}]},
  {class_section_id:'grade9',class_name:'Grade 9',card_count:1,streams:[]}];
function resolve(params:URLSearchParams){return cards.filter(c=>(!params.has('class_section_id')||c.student_class_section_id===params.get('class_section_id'))
  &&(!params.has('stream_id')||c.student_stream_id===params.get('stream_id'))
  &&(!params.has('student_ids')||params.get('student_ids')!.split(',').includes(c.student_id))
  &&(!params.has('report_card_ids')||params.get('report_card_ids')!.split(',').includes(c.id)));}
function summary(params:URLSearchParams){
  const selected=resolve(params),eligible=selected.filter(c=>params.get('target_action')==='export'||c.status==='draft_generated');
  return {total_cards:selected.length,eligible_cards:eligible.length,ineligible_cards:selected.length-eligible.length,
    preview_token:'server-token',status_counts:{under_review:selected.length-eligible.length},
    skipped_cards:selected.filter(c=>!eligible.includes(c)).map(c=>({id:c.id,student_name:c.student_name,reason:'Already under review'}))};
}
beforeEach(()=>{
  jest.clearAllMocks();
  queries.mockImplementation((path:string|null)=>{
    const params=new URLSearchParams(path?.split('?')[1]);let data:unknown=[];
    if(path?.includes('/scoped?')) data=resolve(params).map(c=>({...c,filtered_total:123})).slice(Number(params.get('offset')??0));
    if(path?.includes('/scope-summary?')) data=summary(params);
    if(path?.includes('/scope-hierarchy?')) data=hierarchy;
    return {data,isLoading:false,error:null,refetch};
  });
  request.mockImplementation(async(path:string,options?:{body?:Record<string,unknown>})=>{
    if(path.includes('/scope-summary?'))return summary(new URLSearchParams(path.split('?')[1]));
    return {action:options?.body?.action,total_in_scope:3,transitioned:1,skipped:1,failed:1,
      skipped_cards:[{id:'card-1',student_name:'Ben',reason:'Already under review'}],
      failed_cards:[{id:'card-2',student_name:'Cara',reason:'Notification persistence failed; retry'}],
      cards:[{id:'card-0',student_name:'Ada',previous_status:'draft_generated',new_status:'under_review'}]};
  });
});

it.each([false,true])('uses the same scoped submission flow in report cards and handoff (handoff=%s)',async(handoff)=>{
  const user=userEvent.setup();render(handoff?<PublishingWorkspace/>:<LiveReportCardsWorkspace audience="exams-manager"/>);
  expect(screen.queryByRole('button',{name:/Publish|Unpublish/i})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:/^Grade 8/}));
  await user.click(screen.getByRole('button',{name:/^North 2 cards/}));
  await user.click(screen.getByRole('button',{name:/Submit all 1 eligible to Dean/}));
  const dialog=await screen.findByRole('dialog');
  expect(within(dialog).getByText('Ben: Already under review')).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button',{name:/Submit All Eligible \(1\)/}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/exams/report-cards/bulk-transition',{method:'POST',body:{
    scope_type:'stream',class_section_id:'grade8',stream_id:'north',preview_token:'server-token',action:'submit'}}));
  expect(await screen.findByText('Cara: Notification persistence failed; retry')).toBeInTheDocument();
  expect(refetch).toHaveBeenCalledTimes(4);
});
it('All remains scope-wide when rows are selected, and confirmation uses server eligibility',async()=>{
  const user=userEvent.setup();render(<LiveReportCardsWorkspace audience="exams-manager"/>);
  await user.click(screen.getByRole('checkbox',{name:'Select Ada'}));
  await user.click(screen.getByRole('button',{name:/Submit all 2 eligible/}));
  const dialog=await screen.findByRole('dialog');
  expect(within(dialog).getByText('3')).toBeInTheDocument();expect(within(dialog).getByText('2')).toBeInTheDocument();
  await user.click(within(dialog).getByRole('button',{name:/Submit All Eligible \(2\)/}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/exams/report-cards/bulk-transition',{method:'POST',body:{scope_type:'school',preview_token:'server-token',action:'submit'}}));
});
it('Selected includes only the custom subset and keeps its class boundary',async()=>{
  const user=userEvent.setup();render(<LiveReportCardsWorkspace audience="exams-manager"/>);
  await user.click(screen.getByRole('button',{name:/^Grade 8/}));
  await user.click(screen.getByRole('checkbox',{name:'Select all visible report cards'}));
  await user.click(screen.getByRole('button',{name:'Submit Selected'}));
  const dialog=await screen.findByRole('dialog');expect(within(dialog).getByText('Ben: Already under review')).toBeVisible();
  await user.click(within(dialog).getByRole('button',{name:'Submit Selected (1)'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/exams/report-cards/bulk-transition',{method:'POST',body:{scope_type:'students',class_section_id:'grade8',report_card_ids:['card-0','card-1'],preview_token:'server-token',action:'submit'}}));
});
it('clears custom selection when changing scope and skips stream controls for a streamless class',async()=>{
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('checkbox',{name:'Select Ada'}));
  await user.click(screen.getByRole('button',{name:/^Grade 9/}));
  expect(screen.queryByRole('button',{name:'Submit Selected'})).not.toBeInTheDocument();
  expect(screen.queryByText('Drill down by stream')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'Cara'}));
  expect(queries).toHaveBeenCalledWith(expect.stringMatching(/scope_type=students.*student_ids=student-2/));
  expect(screen.getByRole('navigation',{name:'Report card scope'})).toHaveTextContent('Kibabi SchoolGrade 9Cara');
});
it('page navigation never limits scope-wide confirmation',async()=>{
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('button',{name:'Next page'}));
  expect(queries).toHaveBeenCalledWith(expect.stringContaining('offset=50'));
  await user.click(screen.getByRole('button',{name:/Submit all 2 eligible/}));
  await screen.findByRole('dialog');
  expect(request).toHaveBeenCalledWith('/exams/report-cards/scope-summary?scope_type=school&target_action=submit');
});
it('does not execute an action when server preflight fails',async()=>{
  request.mockRejectedValue(new Error('Scope counts unavailable. Retry.'));
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('button',{name:/Submit all 2 eligible/}));
  expect(await screen.findByText('Scope counts unavailable. Retry.')).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(request).toHaveBeenCalledTimes(1);
});

it('gives an empty handoff desk a working next step without loading generation readiness',()=>{
  queries.mockReturnValue({data:[],isLoading:false,error:null,refetch});
  render(<PublishingWorkspace/>);
  expect(screen.getByRole('link',{name:'Open Report Cards'})).toHaveAttribute('href','/school/exams-manager/report-cards');
  expect(queries.mock.calls.some(([path])=>path?.includes('/generation-scopes'))).toBe(false);
});

it('previews all regeneration targets in the exam and requires a reason before queuing',async()=>{
  const base=queries.getMockImplementation()!;
  queries.mockImplementation((path:string|null,...args:unknown[])=>path==='/exams/series'
    ? {data:[{id:'exam1',name:'End term'}],isLoading:false,error:null,refetch} : base(path,...args));
  request.mockImplementation(async(path:string,options?:{onProgress?:(value:unknown)=>void})=>{
    if(path.includes('/scope-summary?')) return {...summary(new URLSearchParams(path.split('?')[1])),total_cards:123,eligible_cards:122,ineligible_cards:1};
    options?.onProgress?.({job_id:'job-1',completed_students:50,failed_students:0});
    return {id:'job-1',total_students:122,completed_students:121,failed_students:1,reused_students:20,queue_status:'failed',
      failures:[{student_id:'student-2',student_name:'Cara',message:'Marks changed. Refresh and retry.'}]};
  });
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('button',{name:'Next page'}));
  await user.click(screen.getByRole('button',{name:'Regenerate all'}));
  const dialog=await screen.findByRole('dialog',{name:'Regenerate all'});
  expect(within(dialog).getByText('123')).toBeVisible();
  expect(within(dialog).getByRole('button',{name:'Regenerate all (122)'})).toBeDisabled();
  await user.type(within(dialog).getByLabelText(/Regeneration reason/),'Update signatures');
  await user.click(within(dialog).getByRole('button',{name:'Regenerate all (122)'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/exams/report-cards/regeneration-scope',expect.objectContaining({method:'POST',
    body:{scope_type:'school',exam_series_id:'exam1',preview_token:'server-token',reason:'Update signatures'}})));
  expect(await screen.findByText(/121 report cards ready.*20 unchanged cards reused.*1 failed/)).toBeVisible();
  expect(screen.getByText('Marks changed. Refresh and retry.')).toBeVisible();
});

it('keeps regeneration scoped to the chosen class and disables it for All exams',async()=>{
  const base=queries.getMockImplementation()!;
  queries.mockImplementation((path:string|null,...args:unknown[])=>path==='/exams/series'
    ? {data:[{id:'exam1',name:'End term'}],isLoading:false,error:null,refetch} : base(path,...args));
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('button',{name:/Grade 8.*2 cards/}));
  await user.click(screen.getByRole('button',{name:'Regenerate all'}));
  expect(request).toHaveBeenCalledWith(expect.stringMatching(/scope_type=class.*exam_series_id=exam1.*class_section_id=grade8.*target_action=regenerate/));
  await user.click(screen.getByRole('button',{name:'Cancel'}));
  await user.click(within(screen.getByRole('navigation',{name:'Report card scope'})).getByRole('button',{name:'Kibabi School'}));
  await user.selectOptions(screen.getByLabelText('Filter by exam'),'');
  expect(screen.getByRole('button',{name:'Regenerate all'})).toBeDisabled();
});

it('reopens persisted partial results after returning to the handoff page',async()=>{
  const base=queries.getMockImplementation()!;
  queries.mockImplementation((path:string|null,...args:unknown[])=>path==='/exams/report-cards/jobs'
    ? {data:[{job_id:'saved-job',kind:'generate_scope',state:'failed',progress:{completed_students:10,failed_students:1}}],isLoading:false,error:null,refetch}
    : base(path,...args));
  request.mockResolvedValue({result:{total_students:11,completed_students:10,failed_students:1,queue_status:'failed',
    failures:[{student_id:'student-2',student_name:'Cara',message:'Complete the missing marks.'}]}});
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByText('Recent report tasks'));
  await user.click(screen.getByRole('button',{name:'View results'}));
  expect(await screen.findByText('Complete the missing marks.')).toBeVisible();
  expect(request).toHaveBeenCalledWith('/exams/report-cards/jobs/saved-job');
  expect(screen.getByText(/Batch reference: saved-job/)).toBeVisible();
});

it('waits for exams then defaults every handoff query to the latest exam date',async()=>{
  let exams: Array<{id:string;name:string;starts_on?:string;created_at?:string}> | undefined;
  queries.mockImplementation((path:string|null,options?:{select?:(response:unknown)=>unknown})=>({
    data:path==='/exams/series' ? exams && options?.select?.({success:true,data:exams}) : [],
    isLoading:path==='/exams/series' && !exams,error:null,refetch,
  }));
  const view=render(<PublishingWorkspace/>);
  expect(queries.mock.calls.some(([path])=>/report-cards\/(scoped|scope-summary|scope-hierarchy)\?/.test(path ?? ''))).toBe(false);
  exams=[
    {id:'old',name:'Term 1',starts_on:'2026-03-01',created_at:'2026-09-24'},
    {id:'latest',name:'Term 3',starts_on:'2026-09-24',created_at:'2026-09-01'},
    {id:'undated',name:'Unscheduled exam'},
  ];
  view.rerender(<PublishingWorkspace/>);
  expect(screen.getByRole('combobox',{name:'Filter by exam'})).toHaveValue('latest');
  for(const prefix of ['scoped','scope-summary','scope-hierarchy']) {
    expect(queries).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/report-cards/${prefix}\\?.*exam_series_id=latest`)));
  }
  exams=[{id:'newer',name:'Newer exam',starts_on:'2026-10-01'},...exams];
  view.rerender(<PublishingWorkspace/>);
  expect(screen.getByRole('combobox',{name:'Filter by exam'})).toHaveValue('latest');
});

it('preserves an older exam or All exams selected manually across query refreshes',async()=>{
  let exams=[{id:'latest',name:'Term 3',starts_on:'2026-09-24'},{id:'old',name:'Term 1',starts_on:'2026-03-01'}];
  queries.mockImplementation((path:string|null,options?:{select?:(response:unknown)=>unknown})=>({
    data:path==='/exams/series' ? options?.select?.(exams) : [],isLoading:false,error:null,refetch,
  }));
  const user=userEvent.setup();
  const view=render(<PublishingWorkspace/>);
  const filter=screen.getByRole('combobox',{name:'Filter by exam'});
  await user.selectOptions(filter,'old');
  exams=[...exams];view.rerender(<PublishingWorkspace/>);
  expect(filter).toHaveValue('old');
  expect(queries).toHaveBeenCalledWith(expect.stringMatching(/scope-hierarchy\?.*exam_series_id=old/));
  await user.selectOptions(filter,'');
  exams=[...exams];view.rerender(<PublishingWorkspace/>);
  expect(filter).toHaveValue('');
  expect(queries).toHaveBeenCalledWith('/exams/report-cards/scope-hierarchy?scope_type=school');
});

it('does not fall back to all exams when the initial exam list fails',()=>{
  queries.mockImplementation((path:string|null)=>({data:path==='/exams/series'?undefined:[],isLoading:false,
    error:path==='/exams/series'?new Error('Exam list unavailable'):null,refetch}));
  render(<PublishingWorkspace/>);
  expect(screen.getByText('Exam list unavailable')).toBeVisible();
  expect(queries.mock.calls.some(([path])=>/report-cards\/(scoped|scope-summary|scope-hierarchy)\?/.test(path ?? ''))).toBe(false);
});
it('previews the exact export count for selected and whole scopes',async()=>{
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('checkbox',{name:'Select Ada'}));
  await user.click(screen.getByRole('button',{name:'Print Selected'}));
  let dialog=await screen.findByRole('dialog');expect(within(dialog).getByRole('button',{name:'Print Selected (1)'})).toBeEnabled();
  await user.click(within(dialog).getByRole('button',{name:'Cancel'}));
  await user.click(screen.getByRole('button',{name:'Download all 3'}));
  dialog=await screen.findByRole('dialog');expect(within(dialog).getByRole('button',{name:'Download All (3)'})).toBeEnabled();
  expect(request).toHaveBeenLastCalledWith('/exams/report-cards/scope-summary?scope_type=school&target_action=export');
});

it('waits for a server export job and downloads one combined PDF',async()=>{
  jest.useFakeTimers();
  const originalFetch=globalThis.fetch;
  const originalCreate=URL.createObjectURL;
  const originalRevoke=URL.revokeObjectURL;
  const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>undefined);
  globalThis.fetch=jest.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(['%PDF-combined'])});
  URL.createObjectURL=jest.fn().mockReturnValue('blob:combined');
  URL.revokeObjectURL=jest.fn();
  request.mockImplementation(async(path:string)=>{
    if(path.includes('/scope-summary?'))return summary(new URLSearchParams(path.split('?')[1]));
    if(path==='/exams/report-cards/exports')return {state:'queued',job_id:'job-1'};
    return {state:'completed',download_url:'/exams/report-cards/exports/job-1/download'};
  });
  try {
    const user=userEvent.setup({advanceTimers:jest.advanceTimersByTime});
    render(<PublishingWorkspace/>);
    await user.click(screen.getByRole('button',{name:'Download all 3'}));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'Download All (3)'}));
    expect(request).toHaveBeenCalledWith('/exams/report-cards/exports',{method:'POST',body:{scope_type:'school',preview_token:'server-token'}});
    expect(globalThis.fetch).not.toHaveBeenCalled();
    await act(async()=>{await jest.advanceTimersByTimeAsync(1500);});
    expect(request).toHaveBeenCalledWith('/exams/report-cards/jobs/job-1');
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.getByText('3 report cards prepared; the download has opened.')).toBeVisible();
  } finally {
    jest.clearAllTimers();jest.useRealTimers();click.mockRestore();
    globalThis.fetch=originalFetch;URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;
  }
});

it('shows a queue failure without pretending a PDF was downloaded',async()=>{
  request.mockImplementation(async(path:string)=>path.includes('/scope-summary?')
    ? summary(new URLSearchParams(path.split('?')[1])) : {state:'failed',message:'Export storage is unavailable. Retry.'});
  const user=userEvent.setup();render(<PublishingWorkspace/>);
  await user.click(screen.getByRole('button',{name:'Download all 3'}));
  await user.click(within(await screen.findByRole('dialog')).getByRole('button',{name:'Download All (3)'}));
  expect(await screen.findByText('Export storage is unavailable. Retry.')).toBeVisible();
  expect(screen.queryByText('3 report cards prepared; the download has opened.')).not.toBeInTheDocument();
});
