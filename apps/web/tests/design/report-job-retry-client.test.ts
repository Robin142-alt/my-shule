import {requestSchoolApiProxy} from '@/lib/dashboard/school-api-proxy-client';
jest.mock('@/lib/auth/csrf-client',()=>({getCsrfToken:jest.fn().mockResolvedValue('csrf')}));

beforeEach(()=>{jest.useFakeTimers();global.fetch=jest.fn();});
afterEach(()=>jest.useRealTimers());
const reply=(body:unknown)=>({ok:true,json:async()=>body}) as Response;

it('polls the exact retried job until completion and retains its identity',async()=>{
  jest.mocked(fetch).mockResolvedValueOnce(reply({job_id:'saved-job',state:'queued',progress:{}}))
    .mockResolvedValueOnce(reply({data:{job_id:'saved-job',state:'completed',result:{id:'batch',failed_students:0,completed_students:13}},meta:{}}));
  const progress=jest.fn();
  const result=requestSchoolApiProxy('/exams/report-cards/jobs/saved-job/retry',{method:'POST',onProgress:progress});
  await jest.runAllTimersAsync();
  await expect(result).resolves.toEqual({id:'batch',failed_students:0,completed_students:13});
  expect(progress).toHaveBeenCalledWith(expect.objectContaining({job_id:'saved-job'}));
  expect(fetch).toHaveBeenLastCalledWith('/api/exams/report-cards/jobs/saved-job',expect.objectContaining({method:'GET'}));
});

it('reports the job identity even when a partial batch failure is already terminal',async()=>{
  const result={id:'internal-batch',failed_students:3,completed_students:10};
  jest.mocked(fetch).mockResolvedValue(reply({job_id:'durable-job',state:'failed',result}));
  const progress=jest.fn();
  await expect(requestSchoolApiProxy('/exams/report-cards/generation-scope',{method:'POST',onProgress:progress})).resolves.toEqual(result);
  expect(progress).toHaveBeenCalledWith(expect.objectContaining({job_id:'durable-job'}));
});
