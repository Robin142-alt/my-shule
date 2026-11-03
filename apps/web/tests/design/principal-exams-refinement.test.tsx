import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PrincipalExamsReportsWorkspace } from '@/components/school/principal-dashboard/exams-reports-workspace';
const request=jest.fn();const refetch=jest.fn();let canPublish=true;
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:jest.fn()})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:(permission:string)=>permission!=='exams:publish'||canPublish})}));
jest.mock('@/components/school/principal-dashboard/verified-tenant-api',()=>({useVerifiedPrincipalDashboardApi:()=>request}));
jest.mock('@/components/school/exam-workflow-tracker',()=>({ExamWorkflowTracker:()=> <div>Existing exam workflow</div>}));
jest.mock('@/lib/data/school-hooks',()=>({isSchoolQueryForPath:()=>true,useSchoolQuery:(path:string)=>({refetch,data:
  path.startsWith('/exams/analytics')?{filters:{exam_series_id:'exam'},options:{exams:[{id:'exam',name:'End term'}]},kpis:{school_average:81.5,missing_marks_alerts:3},trends:[{exam_series_id:'exam',exam_series_name:'End term',average_score:81.5}]}:
  path==='/exams/workflow'?{metrics:{report_cards_awaiting_principal:20,report_cards_released:40},series:[{counts:{report_cards:60}}]}:
  path==='/admin-command/principal/exams'?{activeExams:2,averageScore:19,reportsPending:1,missingMarksAlerts:99,performanceTrend:[{label:'Obsolete aggregate',value:19}],releaseQueue:[],recentResults:Array.from({length:30},(_,index)=>({id:`series-${index}`,title:`Series ${index+1}`,startsOn:'2026-10-01',endsOn:'2026-10-02',totalReportCards:20,approvedReportCards:20,publishedReportCards:0,blockedReportCards:0,canPublish:true}))}:
  []})}));
beforeEach(()=>{canPublish=true;request.mockReset().mockResolvedValue({});});
test('exam cards and chart use authoritative analytics and paginate publication records',()=>{
  render(<PrincipalExamsReportsWorkspace/>);
  expect(screen.getAllByText('81.5%').length).toBeGreaterThan(0);expect(screen.queryByText('19%')).not.toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Exam Performance Trend'})).toBeVisible();
  expect(screen.getByText('Series 1')).toBeVisible();expect(screen.queryByText('Series 6')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Next publication page'}));expect(screen.getByText('Series 6')).toBeVisible();
  expect(screen.getByRole('heading',{name:'Exam Performance Trend'})).toBeVisible();
});
test('publication retains the governed existing endpoint and permission',async()=>{
  const view=render(<PrincipalExamsReportsWorkspace/>);
  fireEvent.click(screen.getAllByRole('button',{name:'Publish generated cards'})[0]);
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/admin-command/principal/exams-report-cards/series-0/publish',{method:'POST'}));
  view.unmount();canPublish=false;render(<PrincipalExamsReportsWorkspace/>);
  expect(screen.queryByRole('button',{name:'Publish generated cards'})).not.toBeInTheDocument();
});
