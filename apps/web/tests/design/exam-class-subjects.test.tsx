import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Link from 'next/link';
import { ExamSetupWorkspace } from '@/components/school/exams-manager/exam-setup-workspace';
import { configureExam, createExam } from '@/components/school/exams-manager/api-client';

const refetch = jest.fn();
const subjects = Array.from({ length: 14 }, (_, i) => ({ id: `s${i}`, label: `Subject ${i + 1}`, code: i === 0 ? 'SUB-a83d4064-c4d3-4ecc-bca4-46e83c29be46' : null }));
const classes = [
  { id: 'f4', label: 'Form 4', grade_level: 'Form 4', stream: '', subject_ids: subjects.slice(0, 9).map(s => s.id) },
  { id: 'g9', label: 'Grade 9', grade_level: 'Grade 9', stream: '', subject_ids: subjects.slice(4, 11).map(s => s.id) },
  { id: 'g10', label: 'Grade 10', grade_level: 'Grade 10', stream: '', subject_ids: subjects.slice(8, 14).map(s => s.id) },
];
let exam: Record<string, unknown>;
let options: Record<string, unknown>;
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: (url: string) => ({
  data: url.includes('/options') ? options : { exams: [exam], can_manage: true, metrics: {} },
  isLoading: false, error: null, refetch,
}) }));
jest.mock('@/components/school/exams-manager/api-client', () => ({ configureExam: jest.fn(), createExam: jest.fn(), deleteExam: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  options = { subjects, classes, terms: [{ id: 'term', label: 'Term 3' }], gradingSystems: [{ id: 'grading', label: 'School grading' }] };
  exam = { id: 'exam', name: 'End Term Examination', academic_term_id: 'term', grading_system_id: 'grading',
    status: 'draft', type: 'End Term', starts_on: '2026-10-01', ends_on: '2026-10-31', max_marks: 100,
    subject_ids: subjects.map(s => s.id), class_section_ids: classes.map(c => c.id), configuration_version: 3,
    class_subjects: classes.map(c => ({ class_section_id: c.id, subject_ids: [...c.subject_ids] })), can_delete: true, marks_count: 0 };
  jest.mocked(configureExam).mockResolvedValue({ success: true });
  jest.mocked(createExam).mockResolvedValue({ success: true });
});

it('edits Grade 9 independently while preserving the 9/7/6 class selections and version', async () => {
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  expect(screen.getByRole('button', { name: /Form 4.*9 subjects/ })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: /Grade 9.*7 subjects/ }));
  const panel = screen.getByRole('group', { name: 'Subjects for Grade 9' });
  expect(within(panel).queryByLabelText('Subject 1')).not.toBeInTheDocument();
  fireEvent.click(within(panel).getByLabelText('Subject 5'));
  fireEvent.click(screen.getByRole('button', { name: /Grade 10.*6 subjects/ }));
  fireEvent.click(screen.getByRole('button', { name: /Grade 9.*6 subjects/ }));
  expect(screen.getByLabelText('Subject 5')).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(configureExam).toHaveBeenCalledWith('exam', expect.objectContaining({
    configuration_version: 3,
    class_subjects: [
      { class_section_id: 'f4', subject_ids: classes[0].subject_ids },
      { class_section_id: 'g9', subject_ids: classes[1].subject_ids.slice(1) },
      { class_section_id: 'g10', subject_ids: classes[2].subject_ids },
    ],
  })));
});

it('keeps zero-selection validation local to the class and preserves drafts on failed saves', async () => {
  exam.status = 'submitted';
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  fireEvent.click(screen.getByRole('button', { name: /Grade 9.*7 subjects/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  expect(screen.getByRole('alert')).toHaveTextContent(/Grade 9/);
  expect(configureExam).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Select all' }));
  jest.mocked(configureExam).mockRejectedValueOnce(new Error('Another administrator changed this exam. Refresh before saving.'));
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Another administrator'));
  expect(screen.getByRole('button', { name: /Grade 9.*7 subjects/ })).toBeVisible();
});

it('starts new exams with explicit class selection and never checks all school subjects', () => {
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: /New Exam/ }));
  expect(screen.getByLabelText('Participates: Form 4')).not.toBeChecked();
  fireEvent.click(screen.getByLabelText('Participates: Form 4'));
  expect(screen.getByRole('button', { name: /Form 4.*0 subjects/ })).toBeVisible();
  expect(screen.getByLabelText('Subject 1')).not.toBeChecked();
  expect(screen.queryByText(/SUB-a83d4064/)).not.toBeInTheDocument();
});

it('shows missing curriculum as a repairable state without offering every school subject', () => {
  options = { ...options, classes: [{ ...classes[0], subject_ids: [] }] };
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: /New Exam/ }));
  fireEvent.click(screen.getByLabelText('Participates: Form 4'));
  expect(screen.getByText(/No academic subjects are mapped/)).toBeVisible();
  expect(screen.queryByLabelText('Subject 1')).not.toBeInTheDocument();
});

it('preserves class defaults while saving a stream exception and filters curriculum by term', async () => {
  options = { ...options, classes: [{ ...classes[0], streams: [{ id: 'east', label: 'East' }, { id: 'west', label: 'West' }] }],
    subject_offerings: [
      { class_section_id: 'f4', subject_id: 's0', academic_term_id: 'term' },
      { class_section_id: 'f4', subject_id: 's1', academic_term_id: 'term', stream_id: 'east' },
      { class_section_id: 'f4', subject_id: 's2', academic_term_id: 'other-term' },
    ] };
  exam = { ...exam, class_section_ids: ['f4'], class_subjects: [{ class_section_id: 'f4', subject_ids: ['s0'] }] };
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  expect(screen.queryByLabelText('Subject 2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Streams and exceptions'));
  fireEvent.change(screen.getByLabelText('Configure subjects for'), { target: { value: 'east' } });
  fireEvent.click(screen.getByLabelText('Subject 2'));
  expect(screen.queryByLabelText('Subject 3')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Configure subjects for'), { target: { value: 'west' } });
  expect(screen.getByLabelText('Subject 1')).toBeChecked();
  expect(screen.queryByLabelText('Subject 2')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(configureExam).toHaveBeenCalledWith('exam', expect.objectContaining({ class_subjects: [
    { class_section_id: 'f4', subject_ids: ['s0'], stream_subjects: [{ stream_id: 'east', subject_ids: ['s0', 's1'] }] },
  ] })));
});

it('requires review of legacy global subjects without silently assigning them to every class', () => {
  delete exam.class_subjects;
  exam.requires_subject_review = true;
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  expect(screen.getByRole('status')).toHaveTextContent('class-by-class subject review');
  expect(screen.getByLabelText('Subject 1')).not.toBeChecked();
  expect(screen.getByRole('button', { name: /Form 4.*0 subjects/ })).toBeVisible();
});

it('can save an empty class selection as a draft without claiming marks entry is ready', async () => {
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
  expect(screen.getByText('Choose subjects')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
  await waitFor(() => expect(configureExam).toHaveBeenCalledWith('exam', expect.objectContaining({ status: 'draft', class_subjects: expect.arrayContaining([{ class_section_id: 'f4', subject_ids: [] }]) })));
});

it('asks before discarding edited selections and leaves the draft intact when declined', () => {
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  fireEvent.click(screen.getByLabelText('Subject 1'));
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(confirm).toHaveBeenCalledWith('Discard unsaved examination changes?');
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByLabelText('Subject 1')).not.toBeChecked();
  confirm.mockRestore();
});

it('protects a dirty configuration from cancellable browser navigation', () => {
  const navigation = new EventTarget();
  Object.defineProperty(window,'navigation',{value:navigation,configurable:true});
  const confirm=jest.spyOn(window,'confirm').mockReturnValue(false);
  const view=render(<ExamSetupWorkspace/>);
  try {
    fireEvent.click(screen.getByRole('button',{name:'Configure'}));
    fireEvent.click(screen.getByLabelText('Subject 1'));
    const back=new Event('navigate',{cancelable:true});
    navigation.dispatchEvent(back);
    expect(back.defaultPrevented).toBe(true);
    expect(screen.getByLabelText('Subject 1')).not.toBeChecked();
    confirm.mockReturnValue(true);
    const leave=new Event('navigate',{cancelable:true}); navigation.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(false);
  } finally { view.unmount(); confirm.mockRestore(); Reflect.deleteProperty(window,'navigation'); }
});

it('confirms a legacy-browser workspace link once and still blocks an unapproved programmatic navigation', () => {
  const confirm=jest.spyOn(window,'confirm').mockReturnValue(true);
  let allowed=false;
  const view=render(<><ExamSetupWorkspace/><Link href="/school/exams-manager/overview" onClick={event=>{
    event.preventDefault();allowed=window.dispatchEvent(new CustomEvent('myshule:before-workspace-navigation',
      {cancelable:true,detail:{href:'/school/exams-manager/overview'}}));
  }}>Leave workspace</Link></>);
  try {
    fireEvent.click(screen.getByRole('button',{name:'Configure'}));fireEvent.click(screen.getByLabelText('Subject 1'));
    fireEvent.click(screen.getByText('Leave workspace'));
    expect(allowed).toBe(true);expect(confirm).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(false);
    expect(window.dispatchEvent(new CustomEvent('myshule:before-workspace-navigation',
      {cancelable:true,detail:{href:'/school/exams-manager/overview'}}))).toBe(false);
    expect(screen.getByLabelText('Subject 1')).not.toBeChecked();
  } finally {view.unmount();confirm.mockRestore();}
});

it.each(['reviewed', 'locked', 'published', 'archived'])('keeps %s configuration readable without permitting changes', (status) => {
  exam.status = status;
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  expect(screen.getByRole('status')).toHaveTextContent('read-only');
  expect(screen.getByLabelText('Subject 1')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Save configuration' })).toBeDisabled();
  fireEvent.submit(document.getElementById('exam-setup-configure-form')!);
  expect(configureExam).not.toHaveBeenCalled();
});

it('retains a class draft when temporarily removed and prevents duplicate configuration saves', async () => {
  render(<ExamSetupWorkspace />);
  fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
  fireEvent.click(screen.getByLabelText('Participates: Grade 9'));
  fireEvent.click(screen.getByLabelText('Participates: Grade 9'));
  expect(screen.getByRole('button', { name: /Grade 9.*7 subjects/ })).toBeVisible();
  let finish!: (value: { success: boolean }) => void;
  jest.mocked(configureExam).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const form = document.getElementById('exam-setup-configure-form')!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(configureExam).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  finish({ success: true });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});
