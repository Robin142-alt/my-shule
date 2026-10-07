import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { ExamAnalyticsWorkspace } from '@/components/school/exams-manager/exam-analytics-workspace';
import { buildAcademicIntelligence } from '../../../api/src/modules/exams/analytics/analytics-engine';
import { evidence } from '../../../api/src/modules/exams/analytics/testing/evidence.fixture';
import { parseAnalyticsFilters } from '../../../api/src/modules/exams/analytics/analytics-scope';
import { buildAnalyticsPrintReport } from '../../../api/src/modules/exams/analytics/analytics-report-model';
import { isSchoolSection } from '@/lib/routing/experience-routes';
import { isSchoolSectionEnabled } from '@/lib/module-access/module-access-map';
import { renderWithProviders } from './test-utils';

const mockQuery=jest.fn(),mockMutation=jest.fn();
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(...args:unknown[])=>mockQuery(...args),useSchoolMutation:()=>({mutateAsync:mockMutation,isPending:false})}));
jest.mock('recharts',()=>({ResponsiveContainer:()=>null,AreaChart:()=>null,Area:()=>null,CartesianGrid:()=>null,Tooltip:()=>null,XAxis:()=>null,YAxis:()=>null}));
const rows=[evidence({average:60}),evidence({student_id:'second',student_name:'Brian',average:80,class_section_id:'class-2',class_name:'Class Two'}),evidence({exam_series_id:'old',exam_date:'2026-01-01',average:40})];
const scope={level:'school' as const,role:'exams_manager',actor_user_id:'manager'};
const build=(filters:Record<string,string>={},all=false)=>buildAcademicIntelligence(rows,scope,parseAnalyticsFilters({analytics_mode:'library',...filters}),['school'],undefined,all);
beforeEach(()=>{
  window.history.replaceState(null,'','/');mockQuery.mockReset();mockMutation.mockReset();URL.createObjectURL=jest.fn(()=> 'blob:analytics');URL.revokeObjectURL=jest.fn();
  mockQuery.mockImplementation((url:string)=>({data:build(Object.fromEntries(new URLSearchParams(url.split('?')[1]))),isLoading:false,isFetching:false,error:null,refetch:jest.fn()}));
  mockMutation.mockImplementation(async(body:{filters:Record<string,string>})=>({report:buildAnalyticsPrintReport(build(body.filters,true),'library',{school_name:'QA School',school_address:null,school_motto:null,generated_by:'Manager'},'AI-QA','2026-10-07T10:00:00Z'),filename:'report.pdf',pdf_base64:btoa('%PDF-1.7 QA'),csv_base64:btoa('School,QA School'),csv_filename:'report.csv'}));
});
const render=()=>renderWithProviders(<ExamAnalyticsWorkspace onOpenMarks={jest.fn()} onOpenReportCards={jest.fn()}/>);

it('registers a distinct route and locks it when Exams is disabled',()=>{
  expect(isSchoolSection('exam-analytics')).toBe(true);expect(isSchoolSectionEnabled('exam-analytics',['exams'])).toBe(true);expect(isSchoolSectionEnabled('exam-analytics',['academics'])).toBe(false);
});
it('shows a calm overview with individual download and print actions on every analytic',()=>{
  render();expect(screen.getByRole('heading',{name:'Exam Analytics'})).toBeVisible();
  for(const card of screen.getAllByRole('article')){expect(within(card).getByRole('button',{name:/^Download /})).toBeEnabled();expect(within(card).getByRole('button',{name:/^Print /})).toBeEnabled();}
  expect(screen.getAllByRole('article')).toHaveLength(6);
});
it('searches the entire library and opens connected student drill-downs with a return path',()=>{
  render();fireEvent.change(screen.getByRole('searchbox',{name:'Search analytics library'}),{target:{value:'Student performance profiles'}});
  fireEvent.click(screen.getByRole('button',{name:/Student performance profiles/}));
  fireEvent.click(screen.getByRole('button',{name:'Explore Amina · A001'}));
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('student_id=learner-1');
  expect(screen.getByRole('heading',{name:'Student subject profiles'})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Back to previous analysis'}));
  expect(mockQuery.mock.calls.at(-1)?.[0]).not.toContain('student_id=');
  expect(screen.getByRole('heading',{name:'Student performance profiles'})).toBeVisible();
});
it('supports explicit class and student comparisons in the same view and report context',()=>{
  render();fireEvent.click(screen.getByRole('button',{name:'Comparisons'}));
  expect(screen.getByRole('heading',{name:'Compare any two'})).toBeVisible();
  fireEvent.change(screen.getByLabelText('Comparison dimension'),{target:{value:'student'}});
  fireEvent.change(screen.getByLabelText('Left selection'),{target:{value:'second'}});
  fireEvent.change(screen.getByLabelText('Right selection'),{target:{value:'learner-1'}});
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('compare_left_id=second');
  expect(window.location.search).toContain('ea_compare_right_id=learner-1');
});
it('prepares an individual full report, downloads PDF and CSV, and prints its preview',async()=>{
  render();fireEvent.click(screen.getByRole('button',{name:'Download Average score'}));
  fireEvent.click(screen.getByRole('button',{name:'Prepare preview'}));
  expect(await screen.findByRole('link',{name:'Download PDF'})).toHaveAttribute('download','report.pdf');
  expect(screen.getByRole('link',{name:'Download CSV'})).toHaveAttribute('download','report.csv');
  expect(mockMutation.mock.calls[0][0].filters.analytic_ids).toBe('mean');
  const frame=screen.getByTitle('Exam Analytics report preview') as HTMLIFrameElement;
  expect(frame.srcdoc).toContain('QA School');const print=jest.fn();frame.contentWindow!.print=print;frame.contentWindow!.focus=jest.fn();fireEvent.load(frame);fireEvent.click(screen.getByRole('button',{name:'Print report'}));expect(print).toHaveBeenCalled();
});
it('keeps failed exports visible and recoverable without offering fake downloads',async()=>{
  mockMutation.mockRejectedValue(new Error('Audit storage unavailable'));render();fireEvent.click(screen.getByRole('button',{name:'Print Average score'}));fireEvent.click(screen.getByRole('button',{name:'Prepare preview'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Audit storage unavailable'));
  expect(screen.queryByRole('link',{name:'Download PDF'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Retry report'})).toBeEnabled();
});
it('offers real next actions on an empty school and handles malformed responses',()=>{
  mockQuery.mockReturnValue({data:buildAcademicIntelligence([],scope,parseAnalyticsFilters({analytics_mode:'library'}),['school']),isLoading:false,isFetching:false,error:null,refetch:jest.fn()});
  const view=render();expect(screen.getByRole('button',{name:'Open marks workflow'})).toBeVisible();expect(screen.getByRole('button',{name:'Open report cards'})).toBeVisible();view.unmount();
  mockQuery.mockReturnValue({data:{library:{}},isLoading:false,isFetching:false,error:null,refetch:jest.fn()});render();expect(screen.getByRole('alert')).toHaveTextContent('incomplete library');expect(screen.queryByRole('article')).not.toBeInTheDocument();
});
