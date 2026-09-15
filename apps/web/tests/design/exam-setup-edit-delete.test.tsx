import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ExamSetupWorkspace } from '@/components/school/exams-manager/exam-setup-workspace';
import { configureExam, createExam, deleteExam } from '@/components/school/exams-manager/api-client';
import { toast } from 'sonner';

const refetch = jest.fn();
const refetchOptions = jest.fn();
let exam: Record<string, unknown>;
let canManage = true;
let optionsError: Error | null = null;
let setupError: Error | null = null;
let exams: Record<string, unknown>[];
const options = {
  terms: [{ id: 'term-new', label: 'Term 3' }, { id: 'term-saved', label: 'Term 2' }],
  gradingSystems: [{ id: 'grading', label: 'School grading' }],
  subjects: [{ id: 'maths', label: 'Maths' }, { id: 'english', label: 'English' }],
  classes: [{ id: 'form4', label: 'Form 4' }, { id: 'grade10', label: 'Grade 10' }],
};
jest.mock('@/lib/data/school-hooks', () => ({
  useSchoolQuery: (url: string) => url.endsWith('/options')
    ? { data: options, isLoading: false, error: optionsError, refetch: refetchOptions }
    : { data: { exams, metrics: {}, can_manage: canManage }, isLoading: false, error: setupError, refetch },
}));
jest.mock('@/components/school/exams-manager/api-client', () => ({
  configureExam: jest.fn(), createExam: jest.fn(), deleteExam: jest.fn(),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

describe('Exam setup editing and deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    canManage = true; optionsError = null; setupError = null;
    exam = { id: 'exam-1', name: 'End term', term: 'Term 2', academic_term_id: 'term-saved',
      year: 2026, type: 'End Term', max_marks: 100, grading_system: 'School grading', grading_system_id: 'grading',
      status: 'draft', starts_on: '2026-09-01', ends_on: '2026-09-30', subjects_count: 1, classes_count: 1,
      subject_ids: ['maths'], class_section_ids: ['form4'], marks_count: 0, can_delete: true };
    exams = [exam];
    jest.mocked(configureExam).mockResolvedValue({ success: true });
    jest.mocked(createExam).mockResolvedValue({ success: true });
    jest.mocked(deleteExam).mockResolvedValue({ success: true });
  });
  it('opens the saved term, type, subjects and classes instead of selecting everything', () => {
    render(<ExamSetupWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    expect(screen.getByLabelText('Academic term')).toHaveValue('term-saved');
    expect(screen.getByLabelText('Exam type')).toHaveValue('End Term');
    expect(screen.getByLabelText('Maths')).toBeChecked();
    expect(screen.getByLabelText('English')).not.toBeChecked();
    expect(screen.getByLabelText('Form 4')).toBeChecked();
    expect(screen.getByLabelText('Grade 10')).not.toBeChecked();
  });
  it('saves exact changes, refreshes data, and reopens persisted selections', async () => {
    render(<ExamSetupWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    fireEvent.click(screen.getByLabelText('Maths'));
    fireEvent.click(screen.getByLabelText('English'));
    fireEvent.change(screen.getByLabelText('Academic term'), { target: { value: 'term-new' } });
    fireEvent.change(screen.getByLabelText('Exam type'), { target: { value: 'Mock' } });
    jest.mocked(configureExam).mockImplementation(async (_id, body) => {
      Object.assign(exam, body, { type: body.exam_type });
      return { success: true };
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    await waitFor(() => expect(configureExam).toHaveBeenCalledWith('exam-1', expect.objectContaining({
      academic_term_id: 'term-new', exam_type: 'Mock', subject_ids: ['english'], class_section_ids: ['form4'],
    })));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(refetch).toHaveBeenCalled();
    expect(refetchOptions).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    expect(screen.getByLabelText('English')).toBeChecked();
    expect(screen.getByLabelText('Maths')).not.toBeChecked();
  });
  it('keeps validation and backend errors visible with a retryable form', async () => {
    render(<ExamSetupWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Configure' }));
    fireEvent.click(screen.getByLabelText('Maths'));
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Choose at least one subject');
    expect(configureExam).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('English'));
    jest.mocked(configureExam).mockRejectedValueOnce(new Error('Entered results must be preserved.'));
    fireEvent.click(screen.getByRole('button', { name: 'Save configuration' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Entered results must be preserved.'));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save configuration' })).toBeEnabled();
  });
  it('confirms deletion, supports cancel, and refreshes only after real success', async () => {
    render(<ExamSetupWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete End term' }));
    expect(deleteExam).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(deleteExam).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete End term' }));
    expect(screen.getByRole('button', { name: 'Delete exam' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Exam name confirmation'), { target: { value: 'end term' } });
    expect(screen.getByRole('button', { name: 'Delete exam' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Exam name confirmation'), { target: { value: 'End term' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete exam' }));
    await waitFor(() => expect(deleteExam).toHaveBeenCalledWith('exam-1', 'End term'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(refetch).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('End term deleted.');
  });
  it('prevents repeated deletion while waiting and keeps backend failures retryable', async () => {
    let reject!: (error: Error) => void;
    jest.mocked(deleteExam).mockImplementation(() => new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    render(<ExamSetupWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete End term' }));
    fireEvent.change(screen.getByLabelText('Exam name confirmation'), { target: { value: 'End term' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete exam' }));
    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Deleting...' }));
    expect(deleteExam).toHaveBeenCalledTimes(1);
    reject(new Error('Deletion failed. Try again.'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Deletion failed'));
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('allows saved and published results with exact confirmation, resetting confirmation on reopen', () => {
    Object.assign(exam, { status: 'published', marks_count: 49, reports_count: 11 });
    render(<ExamSetupWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete End term' }));
    expect(screen.getByText(/49 saved marks, 11 reports/)).toBeVisible();
    expect(screen.getByText(/including published cards/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Exam name confirmation'), { target: { value: 'End term' } });
    expect(screen.getByRole('button', { name: 'Delete exam' })).toBeEnabled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete End term' }));
    expect(screen.getByLabelText('Exam name confirmation')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Delete exam' })).toBeDisabled();
    expect(deleteExam).not.toHaveBeenCalled();
  });
  it('locks mutations without exam management permission', () => {
    exam.can_delete = false; exam.delete_block_reason = 'Exam management permission is required.'; canManage = false;
    render(<ExamSetupWorkspace />);
    expect(screen.getByRole('button', { name: 'Delete End term' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Configure' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /New Exam/ })).toBeDisabled();
    expect(screen.getByText('Exam management permission is required.')).toBeVisible();
  });
  it('shows a retry state instead of claiming the school has no exams on load failure', () => {
    setupError = new Error('Unavailable'); exams = [];
    render(<ExamSetupWorkspace />);
    expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded');
    expect(screen.queryByText('No exams configured yet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry exams' }));
    expect(refetch).toHaveBeenCalled();
  });
});
