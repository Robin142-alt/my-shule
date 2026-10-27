import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SyllabusWorkspace } from '@/components/school/syllabus-workspace';
import { isHosSection, normalizeHosSection } from '@/lib/school/hos-workspaces';
import type { SyllabusWorkspaceData } from '@/lib/modules/syllabus-types';

const mockQuery = jest.fn();
const mockMutate = jest.fn();
const mockRefetch = jest.fn();
let mockMutationError: Error | null = null;
jest.mock('@/lib/data/school-hooks', () => ({
  useSchoolQuery: (...args: unknown[]) => mockQuery(...args),
  useSchoolMutation: (path: string, method: string, options: unknown) => ({ mutateAsync: (body: unknown) => mockMutate(path,method,body,options), isPending: false, error: mockMutationError }),
}));

function fixture(): SyllabusWorkspaceData {
  return { school_id: 'school-a', generated_at: '2026-10-27', can_monitor: true,
    rights: [{ subject_id: 'math', academic_year_id: null }], subjects: [{id:'math',name:'Mathematics'}],
    years: [{id:'year',name:'2026',status:'active'}], terms: [{id:'term',academic_year_id:'year',name:'Term 1',starts_on:'2026-01-01',ends_on:'2026-04-30',status:'active'}],
    grades: [{grade_level:'Form 2',academic_year_id:'year'}], syllabi: [{id:'plan',subject_id:'math',subject:'Mathematics',academic_year_id:'year',academic_term_id:'term',grade_level:'Form 2',version:2,can_manage:true,
      topics:[{id:'numbers',title:'Numbers',expected_on:'2026-03-20',archived:false,subtopics:[{id:'integers',title:'Integers',required:true,archived:false},{id:'fractions',title:'Fractions',required:true,archived:false}]}],milestones:[]}],
    items: [{id:'allocation',teacher_user_id:'teacher',teacher_name:'Ms Achieng',subject_id:'math',subject:'Mathematics',class_section_id:'class',class_name:'Form 2',stream_id:'east',stream_name:'East',grade_level:'Form 2',academic_year_id:'year',year_name:'2026',academic_term_id:'term',term_name:'Term 1',can_record:true,syllabus_id:'plan',records:[],
      progress:{total:2,completed:0,percentage:0,expected_percentage:50,completed_topics:0,total_topics:1,status:'Behind',remaining:[{id:'integers',title:'Integers',topic:'Numbers',due_on:'2026-03-20'},{id:'fractions',title:'Fractions',topic:'Numbers',due_on:'2026-03-20'}],overdue:[{id:'integers',title:'Integers',topic:'Numbers',due_on:'2026-03-20'}],milestones:[]}}] };
}
let data: SyllabusWorkspaceData;
beforeEach(() => {
  data=fixture(); mockMutationError=null; mockMutate.mockReset().mockResolvedValue({}); mockRefetch.mockReset();
  mockQuery.mockImplementation(() => ({data,isPending:false,isFetching:false,error:null,refetch:mockRefetch}));
});

it('publishes a syllabus using school references, required subtopics and targeted milestones', async () => {
  render(<SyllabusWorkspace />);
  fireEvent.click(screen.getByRole('button',{name:'Define syllabus'}));
  const dialog=within(screen.getByRole('dialog'));
  fireEvent.change(dialog.getByLabelText('Term'),{target:{value:'term'}});
  fireEvent.change(dialog.getByLabelText('Grade/Form'),{target:{value:'Form 2'}});
  fireEvent.click(dialog.getByRole('button',{name:'Add topic'}));
  fireEvent.change(dialog.getByLabelText('Topic 1 title'),{target:{value:'Algebra'}});
  fireEvent.click(dialog.getByRole('button',{name:'Add subtopic to topic 1'}));
  fireEvent.change(dialog.getByLabelText('Topic 1, subtopic 1'),{target:{value:'Linear equations'}});
  fireEvent.click(dialog.getByRole('button',{name:'Add milestone'}));
  fireEvent.change(dialog.getByLabelText('Milestone 1 title'),{target:{value:'Algebra checkpoint'}});
  fireEvent.click(dialog.getByRole('checkbox',{name:'Algebra: Linear equations'}));
  fireEvent.click(dialog.getByRole('button',{name:'Publish syllabus'}));
  await waitFor(()=>expect(mockMutate).toHaveBeenCalledWith('/academics/syllabus','POST',expect.objectContaining({
    subject_id:'math',academic_year_id:'year',academic_term_id:'term',grade_level:'Form 2',
    topics:[expect.objectContaining({title:'Algebra',expected_on:'2026-04-30',subtopics:[expect.objectContaining({title:'Linear equations',required:true})]})],
    milestones:[expect.objectContaining({title:'Algebra checkpoint',subtopic_ids:[expect.any(String)]})],
  }),expect.objectContaining({queueNetworkFailures:false})));
  expect(await screen.findByText(/Syllabus published/)).toBeVisible();
});

it('records ticks and unticks for the selected allocation and preserves optional notes', async () => {
  data.rights=[]; data.syllabi[0].can_manage=false;
  const view=render(<SyllabusWorkspace mode="teaching" />);
  expect(screen.queryByRole('button',{name:'Define syllabus'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:/Record coverage for/}));
  fireEvent.click(screen.getByRole('checkbox',{name:/^Integers/}));
  await waitFor(()=>expect(mockMutate).toHaveBeenCalledWith('/academics/syllabus/plan/subtopics/integers/coverage','POST',{
    assignment_id:'allocation',completed:true,note:'',version:0,syllabus_version:2,
  },expect.objectContaining({queueNetworkFailures:false})));
  data.items[0].records=[{subtopic_id:'integers',completed:true,completed_at:'2026-03-01T08:00:00Z',teacher_user_id:'teacher',note:'',version:1}];
  view.rerender(<SyllabusWorkspace mode="teaching" />);
  expect(screen.getByRole('checkbox',{name:/^Integers/})).toBeChecked();
  fireEvent.click(screen.getAllByText('Teaching note (optional)')[0]);
  fireEvent.change(screen.getByLabelText('Note for Integers'),{target:{value:'Worked through examples'}});
  fireEvent.click(screen.getAllByRole('button',{name:'Save note'})[0]);
  await waitFor(()=>expect(mockMutate).toHaveBeenLastCalledWith(expect.any(String),'POST',expect.objectContaining({completed:true,note:'Worked through examples',version:1}),expect.any(Object)));
  data.items[0].records[0].note='Worked through examples'; data.items[0].records[0].version=2;
  view.rerender(<SyllabusWorkspace mode="teaching" />);
  fireEvent.click(screen.getByRole('checkbox',{name:/^Integers/}));
  await waitFor(()=>expect(mockMutate).toHaveBeenLastCalledWith(expect.any(String),'POST',expect.objectContaining({completed:false,note:'Worked through examples'}),expect.any(Object)));
});

it('retains content IDs and completion history when a subject head archives a subtopic', async () => {
  render(<SyllabusWorkspace />);
  fireEvent.click(screen.getByRole('button',{name:'Revise syllabus'}));
  const dialog=within(screen.getByRole('dialog'));
  fireEvent.click(dialog.getAllByText(/Subtopic settings/)[0]);
  fireEvent.click(dialog.getAllByRole('checkbox',{name:'Archive subtopic (retain history)'})[0]);
  fireEvent.click(dialog.getByRole('button',{name:'Publish revision'}));
  await waitFor(()=>expect(mockMutate).toHaveBeenCalledWith('/academics/syllabus/plan','PATCH',expect.objectContaining({version:2,
    topics:[expect.objectContaining({id:'numbers',subtopics:[expect.objectContaining({id:'integers',archived:true}),expect.objectContaining({id:'fractions'})]})],
  }),expect.any(Object)));
});

it('shows read-only comparisons and filters by teacher, class, stream, subject and term', () => {
  data.rights=[]; data.items[0].can_record=false; data.syllabi[0].can_manage=false;
  render(<SyllabusWorkspace />);
  fireEvent.click(screen.getByRole('button',{name:'Filters'}));
  for(const label of ['Teacher','Class','Stream','Subject','Academic year','Term']) expect(screen.getByLabelText(label)).toBeVisible();
  fireEvent.change(screen.getByLabelText('Find coverage'),{target:{value:'unmatched'}});
  expect(screen.getByText(/No coverage matches these filters/)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Clear filters'}));
  fireEvent.click(screen.getByRole('button',{name:/View coverage for/}));
  expect(screen.getByText(/Read-only coverage/)).toBeVisible();
  expect(screen.getByRole('checkbox',{name:/^Integers/})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Save note'})).not.toBeInTheDocument();
});

it('keeps failures visible, preserves a failed note and never claims unsaved coverage succeeded', async () => {
  mockMutate.mockRejectedValue(new Error('Service unavailable'));
  const view=render(<SyllabusWorkspace />);
  fireEvent.click(screen.getByRole('button',{name:/Record coverage for/}));
  fireEvent.click(screen.getAllByText('Teaching note (optional)')[0]);
  fireEvent.change(screen.getByLabelText('Note for Integers'),{target:{value:'Keep my note'}});
  fireEvent.click(screen.getByRole('checkbox',{name:/^Integers/}));
  await waitFor(()=>expect(mockMutate).toHaveBeenCalled());
  mockMutationError=new Error('Service unavailable'); view.rerender(<SyllabusWorkspace />);
  expect(screen.getByLabelText('Note for Integers')).toHaveValue('Keep my note');
  expect(screen.getByRole('checkbox',{name:/^Integers/})).not.toBeChecked();
  expect(screen.getAllByRole('alert').some(node=>node.textContent?.includes('has not been saved'))).toBe(true);
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
});

it('offers loading, useful setup, and retry states and registers the HOS syllabus route', () => {
  mockQuery.mockReturnValue({data:undefined,isPending:true,isFetching:true,error:null,refetch:mockRefetch});
  const view=render(<SyllabusWorkspace />); expect(screen.getByText('Loading syllabus coverage…')).toBeVisible();
  mockQuery.mockReturnValue({data:undefined,isPending:false,isFetching:false,error:new Error('Unavailable'),refetch:mockRefetch});
  view.rerender(<SyllabusWorkspace />); expect(screen.getByRole('alert')).toHaveTextContent('Unavailable');
  fireEvent.click(screen.getByRole('button',{name:'Refresh coverage'})); expect(mockRefetch).toHaveBeenCalled();
  data.items=[]; data.syllabi=[]; mockQuery.mockReturnValue({data,isPending:false,isFetching:false,error:null,refetch:mockRefetch});
  view.rerender(<SyllabusWorkspace />); expect(screen.getByText('No teacher allocations in your scope')).toBeVisible();
  expect(screen.getByRole('button',{name:'Define syllabus'})).toBeVisible();
  expect(isHosSection('syllabus-coverage')).toBe(true); expect(normalizeHosSection('syllabus-coverage')).toBe('syllabus-coverage');
});

it('downloads the server-produced CSV artifact', async () => {
  mockMutate.mockResolvedValue({filename:'syllabus-coverage.csv',csv:'Teacher,Coverage\r\nAchieng,50\r\n'});
  const create=jest.fn().mockReturnValue('blob:syllabus'); const revoke=jest.fn();
  Object.defineProperty(URL,'createObjectURL',{configurable:true,value:create}); Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:revoke});
  const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  render(<SyllabusWorkspace />); fireEvent.click(screen.getByRole('button',{name:'Download coverage CSV'}));
  await waitFor(()=>expect(click).toHaveBeenCalled()); expect(create).toHaveBeenCalledWith(expect.any(Blob));
  expect(screen.getByText(/Coverage report downloaded/)).toBeVisible(); click.mockRestore();
});

it('clears an open syllabus editor when the school context changes', () => {
  const view=render(<SyllabusWorkspace />);
  fireEvent.click(screen.getByRole('button',{name:'Revise syllabus'}));
  expect(screen.getByRole('dialog')).toBeVisible();
  data={...fixture(),school_id:'school-b',rights:[],syllabi:[],items:[]};
  view.rerender(<SyllabusWorkspace />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue('Numbers')).not.toBeInTheDocument();
});

it('keeps teacher cards focused on their own classes and expands filters only on request', () => {
  data.generated_by='teacher';
  data.items.push({...data.items[0],id:'other-allocation',teacher_user_id:'another',teacher_name:'Mr Otieno',can_record:false});
  render(<SyllabusWorkspace mode="teaching" />);
  expect(screen.getByRole('heading',{name:'My classes'})).toBeVisible();
  expect(screen.queryByText('Mr Otieno')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Filters'})).toHaveAttribute('aria-expanded','false');
  expect(screen.getByLabelText('Subject')).not.toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Filters'}));
  expect(screen.getByLabelText('Subject')).toBeVisible();
  expect(screen.queryByLabelText('Teacher')).not.toBeInTheDocument();
});

it('filters the checklist without losing an unsaved teaching note', () => {
  data.items[0].records=[{subtopic_id:'integers',completed:true,completed_at:'2026-03-01T08:00:00Z',teacher_user_id:'teacher',note:'',version:1}];
  render(<SyllabusWorkspace />);
  fireEvent.click(screen.getByRole('button',{name:/Record coverage for/}));
  fireEvent.click(screen.getAllByText('Teaching note (optional)')[0]);
  fireEvent.change(screen.getByLabelText('Note for Integers'),{target:{value:'Still editing'}});
  fireEvent.click(screen.getByRole('button',{name:'To teach'}));
  expect(screen.queryByRole('checkbox',{name:/^Integers/})).not.toBeInTheDocument();
  expect(screen.getByRole('checkbox',{name:/^Fractions/})).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Taught',exact:true}));
  expect(screen.getByRole('checkbox',{name:/^Integers/})).toBeVisible();
  expect(screen.getByLabelText('Note for Integers')).toHaveValue('Still editing');
  fireEvent.change(screen.getByLabelText('Find a subtopic'),{target:{value:'no match'}});
  fireEvent.click(screen.getByRole('button',{name:'Show all subtopics'}));
  expect(screen.getByRole('checkbox',{name:/^Fractions/})).toBeVisible();
});
