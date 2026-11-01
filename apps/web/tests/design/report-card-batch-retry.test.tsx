import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {LiveReportCardsWorkspace} from '@/components/school/live-report-cards-workspace';
import {useSchoolQuery} from '@/lib/data/school-hooks';
import {requestSchoolApiProxy} from '@/lib/dashboard/school-api-proxy-client';

jest.mock('@/components/school/integrated-school-command-header',()=>({useSchoolCommandIdentity:()=>({schoolName:'Test School',logoUrl:null})}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:jest.fn()}));
jest.mock('@/lib/dashboard/school-api-proxy-client',()=>({requestSchoolApiProxy:jest.fn()}));

const failed={id:'internal-batch',status:'draft_generated',queue_status:'failed',total_students:13,completed_students:10,failed_students:3,
  failures:[{student_id:'student',code:'REPORT_STORAGE_UNAVAILABLE',message:'Storage unavailable.',retryable:true,attempts:3}]};
const refetch=jest.fn().mockResolvedValue({data:[]});
beforeEach(()=>{
  jest.clearAllMocks();
  jest.mocked(useSchoolQuery).mockImplementation(path=>({data:path==='/exams/report-cards/jobs'
    ?[{job_id:'original-job',kind:'generate_scope',state:'failed',progress:{completed_students:10,failed_students:3}}]
    :path?.startsWith('/exams/report-cards/generation-scopes')?[{exam_series_id:'other-exam',exam_series_name:'Different exam',
      class_section_id:'other-class',class_name:'Grade 9',expected_mark_count:20,ready_mark_count:20,not_ready_mark_count:0,learner_count:20,ready:true,blockers:[]}]
    :[],refetch,isLoading:false,isFetching:false,error:null}) as never);
  jest.mocked(requestSchoolApiProxy).mockImplementation(async (path,options)=>{
    if(path==='/exams/report-cards/jobs/original-job')return {state:'failed',result:failed} as never;
    if(path==='/exams/report-cards/jobs/original-job/retry'){
      options?.onProgress?.({job_id:'original-job',completed_students:10,failed_students:0});
      return {...failed,id:'new-internal-batch',queue_status:'completed',completed_students:13,failed_students:0,failures:[],reused_students:10} as never;
    }
    throw new Error(`Unexpected request: ${path}`);
  });
});

it.each([false,true])('retries the saved failed job from Recent tasks regardless of class selection (selected=%s)',async selected=>{
  render(<LiveReportCardsWorkspace audience="exams-manager"/>);
  if(selected)fireEvent.change(screen.getByLabelText('Class and exam cycle'),{target:{value:'other-exam:other-class'}});
  fireEvent.click(screen.getByText('Recent report tasks'));
  fireEvent.click(screen.getByRole('button',{name:'View results'}));
  fireEvent.click(await screen.findByRole('button',{name:'Retry Failed'}));
  await waitFor(()=>expect(requestSchoolApiProxy).toHaveBeenCalledWith('/exams/report-cards/jobs/original-job/retry',{
    method:'POST',onProgress:expect.any(Function),
  }));
  expect(requestSchoolApiProxy).not.toHaveBeenCalledWith('/exams/report-cards/generation-scope',expect.anything());
  await waitFor(()=>expect(screen.getByText(/13 report cards ready. 10 unchanged cards reused/)).toBeVisible());
  expect(screen.queryByRole('button',{name:'Retry Failed'})).not.toBeInTheDocument();
  expect(refetch).toHaveBeenCalled();
});
