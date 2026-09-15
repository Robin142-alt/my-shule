import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OpenMarkEntryPanel } from '@/components/school/exams-manager/open-mark-entry-panel';
import { openMarksEntry } from '@/components/school/exams-manager/api-client';
import type { TeacherMarkSheet } from '@/components/school/exams-manager/teacher-marks-progress';

jest.mock('@/components/school/exams-manager/api-client', () => ({ openMarksEntry: jest.fn() }));
const entries = [
  { id:'sheet1',window_id:'window1',exam_id:'exam1',exam_name:'END TERM 3',teacher_id:'teacher1',teacher:'Amina',class_section_id:'class1',class_name:'Form 4' },
  { id:'sheet2',window_id:'window2',exam_id:'exam1',exam_name:'END TERM 3',teacher_id:'teacher2',teacher:'Brian',class_section_id:'class2',class_name:'Form 3' },
  { id:'sheet3',window_id:'window3',exam_id:'exam2',exam_name:'END TERM EXAMS',teacher_id:'teacher3',teacher:'Carol',class_section_id:'class1',class_name:'Form 4' },
] as TeacherMarkSheet[];
const refresh=jest.fn();
beforeEach(()=>{jest.clearAllMocks();jest.mocked(openMarksEntry).mockResolvedValue({success:true,message:'Mark entry opened for 1 subject/class windows.',window_count:1});});
function choose() {
  fireEvent.change(screen.getByLabelText('Exam to open'),{target:{value:'exam1'}});
  fireEvent.change(screen.getByLabelText('Mark entry deadline'),{target:{value:'2099-01-02T16:00'}});
}

it.each(['teacher','class','everyone'] as const)('opens the selected %s scope with exact exam identity and East Africa Time deadline',async scope=>{
  render(<OpenMarkEntryPanel entries={entries} unavailable={false} onOpened={refresh}/>);choose();
  fireEvent.change(screen.getByLabelText('Open for'),{target:{value:scope}});
  if(scope==='teacher') fireEvent.change(screen.getByLabelText('Teacher to open'),{target:{value:'teacher1'}});
  if(scope==='class') fireEvent.change(screen.getByLabelText('Class to open'),{target:{value:'class1'}});
  fireEvent.click(screen.getByRole('button',{name:'Open mark entry'}));
  await waitFor(()=>expect(openMarksEntry).toHaveBeenCalledWith({exam_series_id:'exam1',scope,closes_at:'2099-01-02T13:00:00.000Z',
    ...(scope==='teacher'?{teacher_user_id:'teacher1'}:scope==='class'?{class_section_id:'class1'}:{})}));
  expect(await screen.findByRole('status')).toHaveTextContent('Mark entry opened');expect(refresh).toHaveBeenCalledTimes(1);
});

it('limits teacher options to the selected exam and clears stale targets when exam changes',()=>{
  render(<OpenMarkEntryPanel entries={entries} unavailable={false} onOpened={refresh}/>);choose();
  expect(screen.queryByRole('option',{name:'Carol'})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Teacher to open'),{target:{value:'teacher1'}});
  fireEvent.change(screen.getByLabelText('Exam to open'),{target:{value:'exam2'}});
  expect(screen.getByLabelText('Teacher to open')).toHaveValue('');
  expect(screen.getByRole('option',{name:'Carol'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Open mark entry'})).toBeDisabled();
});

it('shows server failure and allows retry while disabling duplicate requests',async()=>{
  let reject!: (error:Error)=>void;
  jest.mocked(openMarksEntry).mockImplementation(()=>new Promise((_,rejectPromise)=>{reject=rejectPromise;}));
  render(<OpenMarkEntryPanel entries={entries} unavailable={false} onOpened={refresh}/>);choose();
  fireEvent.change(screen.getByLabelText('Teacher to open'),{target:{value:'teacher1'}});
  fireEvent.click(screen.getByRole('button',{name:'Open mark entry'}));
  expect(screen.getByRole('button',{name:'Opening…'})).toBeDisabled();
  reject(new Error('This exam is locked.'));
  expect(await screen.findByRole('alert')).toHaveTextContent('This exam is locked.');
  expect(refresh).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Open mark entry'})).toBeEnabled();
});

it('blocks mutation when school progress cannot be loaded',()=>{
  render(<OpenMarkEntryPanel entries={[]} unavailable onOpened={refresh}/>);
  expect(screen.getByRole('button',{name:'Open mark entry'})).toBeDisabled();
  expect(screen.getByLabelText('Exam to open')).toBeDisabled();expect(openMarksEntry).not.toHaveBeenCalled();
});
