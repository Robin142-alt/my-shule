import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { TeacherMarksProgress, type TeacherMarkSheet } from '@/components/school/exams-manager/teacher-marks-progress';
import { useSchoolQuery } from '@/lib/data/school-hooks';
import { submitAssistedMarkbook } from '@/components/school/exams-manager/api-client';

jest.mock('@/lib/data/school-hooks', () => ({useSchoolQuery: jest.fn()}));
jest.mock('@/components/school/exams-manager/api-client', () => ({submitAssistedMarkbook: jest.fn(), lockMarksEntry: jest.fn()}));
jest.mock('sonner', () => ({toast: {success: jest.fn(), error: jest.fn()}}));

const base: TeacherMarkSheet = {id:'sheet-1',window_id:'window-1',exam_id:'exam-1',exam_name:'End term',
  class_section_id:'class-1',class_name:'Grade 10',subject_id:'math',subject:'Mathematics',assessment_id:'paper-1',paper:'Paper 1',
  stream_id:'blue',stream:'Blue',teacher_id:'teacher-1',teacher:'Ms Amina',total_students:30,entered:30,recorded:30,
  submitted:0,missing:0,status:'In Progress',submission_state:'in_progress',revision:'revision-1',
  overdue:true,deadline:'2026-01-01',window_closed:true,last_activity:null};
const refetch=jest.fn();
function respond(entries:TeacherMarkSheet[]) {
  jest.mocked(useSchoolQuery).mockReturnValue({data:{entries},refetch,isLoading:false,isFetching:false,error:null} as never);
}

beforeEach(()=>{jest.clearAllMocks();respond([base]);});

it('offers direct editing for every assigned, submitted and unassigned markbook without expanding details',()=>{
  const rows=[base,{...base,id:'submitted',submission_state:'submitted' as const,status:'Submitted',is_submitted:true,outstanding:false},
    {...base,id:'unassigned',teacher_id:null,teacher:'Unassigned',submission_state:'resubmission_required' as const,status:'Resubmission Required'}];
  respond(rows);
  const open=jest.fn();render(<TeacherMarksProgress onOpenMarkbook={open}/>);
  fireEvent.click(screen.getByRole('button',{name:'All sheets'}));
  expect(screen.getAllByRole('button',{name:'Enter / Edit Marks'})).toHaveLength(3);
  expect(screen.getAllByRole('button',{name:'Submit Marks'})).toHaveLength(2);
  fireEvent.click(within(screen.getAllByRole('listitem')[1]).getByRole('button',{name:'Enter / Edit Marks'}));
  expect(open).toHaveBeenCalledWith(rows[1]);
});

it('confirms the exact markbook, sends its revision once, and refreshes counters after submission',async()=>{
  let resolve!: (value:never)=>void;
  jest.mocked(submitAssistedMarkbook).mockImplementation(()=>new Promise(done=>{resolve=done;}));
  render(<TeacherMarksProgress onOpenMarkbook={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Submit Marks'}));
  expect(screen.getByText(/Submit marks for End term/)).toHaveTextContent('Grade 10 · Blue');
  expect(screen.getByText(/Submit marks for End term/)).toHaveTextContent('Mathematics');
  expect(submitAssistedMarkbook).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Confirm submission'}));
  expect(submitAssistedMarkbook).toHaveBeenCalledWith({mark_entry_window_id:'window-1',assessment_id:'paper-1',
    teacher_user_id:'teacher-1',stream_ids:['blue'],expected_revision:'revision-1'});
  expect(screen.getByRole('button',{name:'Submitting…'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Submitting…'}));
  expect(submitAssistedMarkbook).toHaveBeenCalledTimes(1);
  await act(async()=>resolve({success:true} as never));
  await waitFor(()=>expect(refetch).toHaveBeenCalledTimes(1));
});

it('keeps precise validation failures visible with editing available and never reports success',async()=>{
  respond([{...base,teacher_id:null,teacher:'Unassigned',stream_id:null,recorded:29,missing:1}]);
  jest.mocked(submitAssistedMarkbook).mockRejectedValue(new Error('1 learner has no score or missing-mark reason.'));
  const open=jest.fn();render(<TeacherMarksProgress onOpenMarkbook={open}/>);
  fireEvent.click(screen.getByRole('button',{name:'Submit Marks'}));
  fireEvent.click(screen.getByRole('button',{name:'Confirm submission'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('1 learner has no score or missing-mark reason.');
  expect(submitAssistedMarkbook).toHaveBeenCalledWith(expect.objectContaining({teacher_user_id:null,stream_ids:['']}));
  fireEvent.click(screen.getAllByRole('button',{name:'Enter / Edit Marks'})[0]);
  expect(open).toHaveBeenCalled();
  expect(refetch).not.toHaveBeenCalled();
});

it('derives outstanding counters from submission state independently of closed access or stale legacy flags',()=>{
  respond([{...base,submission_state:'submitted',status:'Submitted',outstanding:true},
    {...base,id:'correction',submission_state:'resubmission_required',status:'Resubmission Required',outstanding:false},
    {...base,id:'unassigned',teacher_id:null,submission_state:'outstanding',status:'Outstanding'}]);
  render(<TeacherMarksProgress onOpenMarkbook={jest.fn()}/>);
  expect(screen.getByLabelText('Mark entry summary')).toHaveTextContent('1 teachers outstanding');
  expect(screen.getByLabelText('Mark entry summary')).toHaveTextContent('2 sheets to finish');
  expect(screen.getByLabelText('Mark entry summary')).toHaveTextContent('1 unassigned sheets');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
});
