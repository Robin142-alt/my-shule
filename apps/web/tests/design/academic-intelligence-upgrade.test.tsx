import { fireEvent, screen } from '@testing-library/react';
import { AcademicIntelligenceWorkspace } from '@/components/school/academic-intelligence-workspace';
import { buildAcademicIntelligence } from '../../../api/src/modules/exams/analytics/analytics-engine';
import { evidence } from '../../../api/src/modules/exams/analytics/testing/evidence.fixture';
import { renderWithProviders } from './test-utils';

const mockQuery=jest.fn();
const mockMutation=jest.fn();
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(...args:unknown[])=>mockQuery(...args),useSchoolMutation:()=>({mutateAsync:mockMutation,isPending:false})}));
jest.mock('@/components/modules/exams/AnalyticsDashboard',()=>({AnalyticsDashboard:()=> <div>Performance charts</div>}));
jest.mock('recharts',()=>({ResponsiveContainer:({children}:{children:React.ReactNode})=><div>{children}</div>,BarChart:()=> <div>Distribution chart</div>,Bar:()=>null,XAxis:()=>null,YAxis:()=>null,Tooltip:()=>null,CartesianGrid:()=>null}));
function load(level:'school'|'subject'|'grade'|'assignment'='school') {
  const data=buildAcademicIntelligence([evidence({average:25}),evidence({average:null,subject_id:'bio',subject_name:'Biology',missing:2,numeric_count:0})],{level,role:level==='subject'?'teacher':'principal',actor_user_id:'user'}, {page:1,page_size:25},[level]);
  const response={...data,capabilities:{can_start_intervention:true}};
  mockQuery.mockReturnValue({data:response,isLoading:false,isFetching:false,error:null,refetch:jest.fn()});
  return response;
}
beforeEach(()=>{mockQuery.mockReset();mockMutation.mockReset();});
it('keeps at-risk filtering on the server after clearing filters',()=>{
  load();renderWithProviders(<AcademicIntelligenceWorkspace audience="principal"/>);
  fireEvent.click(screen.getByRole('button',{name:'At Risk'}));
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('risk_level=At+Risk');
});
it('rejects malformed nested learner data with a retry action instead of crashing',()=>{
  const data=load();
  mockQuery.mockReturnValue({data:{...data,learners:{...data.learners,items:[null]}},isLoading:false,isFetching:false,error:null,refetch:jest.fn()});
  renderWithProviders(<AcademicIntelligenceWorkspace audience="principal"/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Academic intelligence could not be loaded');
  expect(screen.getByRole('button',{name:'Retry live data'})).toBeVisible();
});
it.each([['subject','hos','Subject Academic Intelligence'],['grade','grade-master','Grade/Form Academic Intelligence']] as const)('renders the %s experience and eight overview cards', (scope,audience,title)=>{
  load(scope);renderWithProviders(<AcademicIntelligenceWorkspace audience={audience}/>);
  expect(screen.getByRole('heading',{name:title})).toBeVisible();expect(screen.getByLabelText('Responsibility')).toHaveValue(scope);
  expect(screen.getByRole('button',{name:audience==='hos'?'Open interventions 0':'Target No target configured'})).toBeVisible();
  expect(screen.queryByLabelText('Department')).not.toBeInTheDocument();
});
it('renders risk reasons, opens a learner and posts an authorized intervention to the existing workflow',async()=>{
  load();mockMutation.mockResolvedValue({success:true});renderWithProviders(<AcademicIntelligenceWorkspace audience="principal"/>);
  fireEvent.click(screen.getByRole('button',{name:'Learners'}));
  expect(screen.getByText('Failing 1 subject')).toBeVisible();expect(screen.getByText('2 missing assessments')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'View Learner'}));fireEvent.click(screen.getByRole('button',{name:'Start Intervention'}));
  fireEvent.change(screen.getByLabelText('Responsible staff'),{target:{value:'teacher-1'}});
  fireEvent.change(screen.getByLabelText('Review date'),{target:{value:'2026-12-01'}});
  fireEvent.change(screen.getByLabelText('Plan and notes'),{target:{value:'Weekly guided revision and review.'}});
  fireEvent.click(screen.getByRole('button',{name:'Save intervention'}));
  expect(await screen.findAllByText('Intervention saved and assigned.')).not.toHaveLength(0);
  expect(mockMutation).toHaveBeenCalledWith(expect.objectContaining({source:'analytics',analytics_scope:'school',student_id:'learner-1',subject_id:'math',class_section_id:'form-1'}));
});
it('uses query filters for drill-down and keeps no-history and no-target states truthful',()=>{
  load();renderWithProviders(<AcademicIntelligenceWorkspace audience="principal"/>);
  fireEvent.change(screen.getByLabelText('More views'),{target:{value:'Targets'}});expect(screen.getByText('No target configured')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Trends'}));expect(screen.getByText(/A previous exam is required/)).toBeVisible();
  fireEvent.change(screen.getByLabelText('Subject'),{target:{value:'math'}});
  expect(mockQuery).toHaveBeenLastCalledWith(expect.stringContaining('subject_id=math'),expect.anything());
});
it('keeps marks and report actions operational even with no approved results',()=>{
  const marks=jest.fn(),reports=jest.fn();const data=load();data.data_quality.final_mark_count=0;
  renderWithProviders(<AcademicIntelligenceWorkspace audience="teacher" onOpenMarks={marks} onOpenReportCards={reports}/>);
  fireEvent.click(screen.getByRole('button',{name:'Open marks workflow'}));fireEvent.click(screen.getByRole('button',{name:'Open report cards'}));expect(marks).toHaveBeenCalledTimes(1);expect(reports).toHaveBeenCalledTimes(1);
});
it('shows loading and suppresses cached values when a refresh fails',()=>{
  mockQuery.mockReturnValue({isLoading:true,refetch:jest.fn()});const {unmount}=renderWithProviders(<AcademicIntelligenceWorkspace audience="principal"/>);
  expect(screen.getByLabelText('Loading academic intelligence')).toBeVisible();unmount();
  const data=load();mockQuery.mockReturnValue({data,error:new Error('Service unavailable'),isLoading:false,refetch:jest.fn()});renderWithProviders(<AcademicIntelligenceWorkspace audience="principal"/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Service unavailable');expect(screen.queryByText('25.0%')).not.toBeInTheDocument();
});

it('uses the restricted subject analytics endpoint for Head of Subject',()=>{
  load('subject');renderWithProviders(<AcademicIntelligenceWorkspace audience="hos"/>);
  expect(mockQuery).toHaveBeenCalledWith('/exams/analytics/subject',expect.anything());
  expect(screen.getByLabelText('Responsibility').querySelectorAll('option')).toHaveLength(1);
  expect(screen.getByLabelText('Responsibility')).toHaveValue('subject');
});

it('opens the at-risk route with server filtering and keeps subject selection between workspaces',()=>{
  load('subject');const onViewChange=jest.fn();
  const {rerender}=renderWithProviders(<AcademicIntelligenceWorkspace audience="hos" activeView="At Risk" hideNavigation onViewChange={onViewChange}/>);
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('risk_level=At+Risk');
  expect(screen.queryByRole('navigation',{name:'Academic analytics sections'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Subject'),{target:{value:'math'}});
  rerender(<AcademicIntelligenceWorkspace audience="hos" activeView="Comparisons" hideNavigation onViewChange={onViewChange}/>);
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('subject_id=math');
  expect(mockQuery.mock.calls.at(-1)?.[0]).not.toContain('risk_level');
  fireEvent.click(screen.getAllByRole('button',{name:'View learners'})[0]);
  expect(onViewChange).toHaveBeenCalledWith('Learners');
});

it('provides subject report previews without granting report publishing actions',()=>{
  load('subject');renderWithProviders(<AcademicIntelligenceWorkspace audience="hos" activeView="Reports" hideNavigation/>);
  expect(screen.getByRole('heading',{name:'Subject Reports'})).toBeVisible();
  expect(screen.getAllByRole('button',{name:/^Preview /})).toHaveLength(5);
  fireEvent.click(screen.getByRole('button',{name:'Preview performance trends'}));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByLabelText('Report content')).toHaveValue('trends');
  expect(screen.queryByRole('button',{name:/publish/i})).not.toBeInTheDocument();
});

it('resets learner pagination when the HOS menu changes the academic population',()=>{
  const data=load('subject');data.learners.total=100;
  const {rerender}=renderWithProviders(<AcademicIntelligenceWorkspace audience="hos" activeView="Learners" initialSubjectId="math" hideNavigation/>);
  fireEvent.click(screen.getByRole('button',{name:'Next page'}));
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('page=2');
  rerender(<AcademicIntelligenceWorkspace audience="hos" activeView="At Risk" hideNavigation/>);
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('page=1');
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('subject_id=math');
});

it('keeps printing available in other roles report views',()=>{
  load();renderWithProviders(<AcademicIntelligenceWorkspace audience="principal" activeView="Reports" onOpenReportCards={jest.fn()}/>);
  expect(screen.getByRole('button',{name:'Print / PDF'})).toBeVisible();
});
