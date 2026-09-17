import { fireEvent, screen, waitFor } from '@testing-library/react';
import { AcademicIntelligenceWorkspace } from '@/components/school/academic-intelligence-workspace';
import { academicReportHtml } from '@/lib/modules/academic-intelligence-print';
import { buildAcademicIntelligence } from '../../../api/src/modules/exams/analytics/analytics-engine';
import { buildAnalyticsPrintReport } from '../../../api/src/modules/exams/analytics/analytics-report-model';
import { evidence } from '../../../api/src/modules/exams/analytics/testing/evidence.fixture';
import { renderWithProviders } from './test-utils';

const mockQuery=jest.fn(),mockMutation=jest.fn();
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(...args:unknown[])=>mockQuery(...args),useSchoolMutation:()=>({mutateAsync:mockMutation,isPending:false})}));
jest.mock('@/components/modules/exams/AnalyticsDashboard',()=>({AnalyticsDashboard:()=>null}));
jest.mock('recharts',()=>({ResponsiveContainer:({children}:{children:React.ReactNode})=><div>{children}</div>,BarChart:()=>null,Bar:()=>null,XAxis:()=>null,YAxis:()=>null,Tooltip:()=>null,CartesianGrid:()=>null}));
const data=buildAcademicIntelligence([evidence()],{level:'assignment',role:'teacher',actor_user_id:'teacher-1'},{page:1,page_size:25},['assignment']);
const report=buildAnalyticsPrintReport(data,'learners',{school_name:'Sample School',school_address:null,school_motto:null,generated_by:'Teacher'},'AI-TEST','2026-09-11T10:00:00Z');
beforeEach(()=>{mockQuery.mockReset();mockMutation.mockReset();URL.createObjectURL=jest.fn(()=> 'blob:report');URL.revokeObjectURL=jest.fn();mockQuery.mockReturnValue({data,isLoading:false,isFetching:false,error:null,refetch:jest.fn()});});
it('searches explicitly, exposes the selected filter and clears it without changing responsibility',()=>{
  renderWithProviders(<AcademicIntelligenceWorkspace audience="teacher"/>);
  fireEvent.click(screen.getByRole('button',{name:'Learners'}));
  fireEvent.change(screen.getByLabelText('Learner search'),{target:{value:'Amina'}});
  expect(mockQuery.mock.calls.at(-1)?.[0]).not.toContain('learner_query');
  fireEvent.click(screen.getByRole('button',{name:'Search'}));
  expect(mockQuery.mock.calls.at(-1)?.[0]).toContain('learner_query=Amina');
  fireEvent.click(screen.getByRole('button',{name:'Remove Search filter'}));
  expect(mockQuery.mock.calls.at(-1)?.[0]).not.toContain('learner_query');
});
it('prepares the current learner page through the backend, previews, prints and downloads the same report',async()=>{
  mockMutation.mockResolvedValue({report,filename:'ai-test.pdf',pdf_base64:btoa('%PDF-1.7 test')});
  const {unmount}=renderWithProviders(<AcademicIntelligenceWorkspace audience="teacher"/>);
  fireEvent.click(screen.getByRole('button',{name:'Learners'}));fireEvent.click(screen.getByRole('button',{name:'Print / PDF'}));
  expect(screen.getByLabelText('Report content')).toHaveValue('learners');
  expect(screen.queryByRole('link',{name:'Download PDF'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Prepare preview'}));
  await screen.findByRole('link',{name:'Download PDF'});
  expect(mockMutation).toHaveBeenCalledWith({section:'learners',filters:{scope:'assignment',exam_series_id:'exam-1'}});
  const frame=screen.getByTitle('Analytics report preview') as HTMLIFrameElement;
  expect(frame.srcdoc).toContain('Current page only');expect(frame.srcdoc).toContain('Sample School');
  const print=jest.fn();frame.contentWindow!.print=print;frame.contentWindow!.focus=jest.fn();
  fireEvent.load(frame);fireEvent.click(screen.getByRole('button',{name:'Print report'}));expect(print).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('link',{name:'Download PDF'})).toHaveAttribute('download','ai-test.pdf');
  fireEvent.keyDown(frame.contentDocument!,{key:'Escape'});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  unmount();expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:report');
});
it('shows generation failures with retry and never offers an absent PDF',async()=>{
  mockMutation.mockRejectedValue(new Error('Report audit unavailable'));
  renderWithProviders(<AcademicIntelligenceWorkspace audience="teacher"/>);
  fireEvent.click(screen.getByRole('button',{name:'Print / PDF'}));fireEvent.click(screen.getByRole('button',{name:'Prepare preview'}));
  await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('Report audit unavailable'));
  expect(screen.queryByRole('link',{name:'Download PDF'})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'Prepare preview'})).toBeEnabled();
});
it('escapes school and learner text in the printable document and defines A4 page breaks',()=>{
  const html=academicReportHtml({...report,school_name:'<script>alert(1)</script>',sections:[{title:'Results',headers:['Learner'],rows:[['<img src=x onerror=alert(1)>']]}]});
  expect(html).not.toContain('<script>');expect(html).not.toContain('<img');expect(html).toContain('&lt;script&gt;');
  expect(html).toContain('@page{size:A4');expect(html).toContain('table-header-group');expect(html).toContain('break-inside:avoid');
});
it('rejects incomplete report content without crashing the workspace',async()=>{
  mockMutation.mockResolvedValue({report:{document_number:'AI-BROKEN'},filename:'broken.pdf',pdf_base64:'broken'});
  renderWithProviders(<AcademicIntelligenceWorkspace audience="teacher"/>);
  fireEvent.click(screen.getByRole('button',{name:'Print / PDF'}));fireEvent.click(screen.getByRole('button',{name:'Prepare preview'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('complete document');
  expect(screen.queryByRole('link',{name:'Download PDF'})).not.toBeInTheDocument();
});
