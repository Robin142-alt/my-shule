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
  expect(refetch).toHaveBeenCalledTimes(3);
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
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/exams/report-cards/exports/job-1/download',expect.objectContaining({headers:{Accept:'application/pdf'}}));
    expect(click).toHaveBeenCalledTimes(1);
    expect(screen.getByText('3 report cards downloaded in a combined PDF.')).toBeVisible();
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
  expect(screen.queryByText('3 report cards downloaded in a combined PDF.')).not.toBeInTheDocument();
});
