import { requestSchoolApiProxy } from '@/lib/dashboard/school-api-proxy-client';

jest.mock('@/lib/auth/csrf-client',()=>({getCsrfToken:async()=> 'csrf'}));
const originalFetch=global.fetch;
beforeEach(()=>{jest.useFakeTimers();global.fetch=jest.fn();});
afterEach(()=>{global.fetch=originalFetch;jest.useRealTimers();});

it('waits for bulk regeneration and returns persisted partial failures instead of treating a queued job as success',async()=>{
  const progress=jest.fn();
  const result={total_students:11,completed_students:10,failed_students:1,failures:[{message:'Marks changed'}]};
  const reply=(data:unknown)=>({ok:true,json:async()=>({data,meta:{}})});
  (global.fetch as jest.Mock).mockResolvedValueOnce(reply({job_id:'job-1',state:'queued'}))
    .mockResolvedValueOnce(reply({job_id:'job-1',state:'running',progress:{completed_students:5}}))
    .mockResolvedValueOnce(reply({job_id:'job-1',state:'failed',result}));
  const pending=requestSchoolApiProxy('/exams/report-cards/regeneration-scope',{
    method:'POST',body:{exam_series_id:'exam',reason:'Update signatures'},onProgress:progress});
  await jest.runAllTimersAsync();
  expect(await pending).toEqual(result);
  expect(progress).toHaveBeenCalledWith({completed_students:5,job_id:'job-1'});
  expect(global.fetch).toHaveBeenNthCalledWith(1,'/api/exams/report-cards/regeneration-scope',expect.objectContaining({
    method:'POST',headers:expect.objectContaining({'x-myshule-csrf':'csrf'})}));
  expect(global.fetch).toHaveBeenCalledTimes(3);
});
