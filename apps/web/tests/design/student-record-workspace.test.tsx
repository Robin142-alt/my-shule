import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentRecordWorkspace } from '@/components/school/student-record-workspace';
import { renderWithProviders } from './test-utils';

const mockQuery = jest.fn();
const mockSave = jest.fn();
jest.mock('@/lib/data/school-hooks', () => ({
  useSchoolQuery: (...args: unknown[]) => mockQuery(...args),
  useSchoolMutation: () => ({ mutateAsync: mockSave, isPending: false }),
}));
import { record, options } from './student-record.fixture';

function render() { return renderWithProviders(<StudentRecordWorkspace studentId="student-1" backHref="/school/admissions/enrolment" guardiansHref="/school/admissions/parents" />); }
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockImplementation((path: string | null) => ({data: path?.endsWith('/options') ? options : path ? record : undefined, refetch:jest.fn()}));
  mockSave.mockResolvedValue(record);
});

test('opens the requested real learner without requiring guardian or sample data', () => {
  render();
  expect(screen.getByRole('heading',{name:'Actual Learner'})).toBeInTheDocument();
  expect(screen.getByText('Phone can be added later')).toBeInTheDocument();
  expect(mockQuery).toHaveBeenCalledWith('/students/student-1/record',expect.anything());
  expect(mockQuery).toHaveBeenCalledWith(null,expect.anything());
});

test('sends only changed fields, leaves optional guardian details empty, and reports persisted success', async () => {
  const user=userEvent.setup(); render();
  await user.click(screen.getByRole('button',{name:'Edit student'}));
  await user.type(screen.getByLabelText('Guardian phone (optional)'),'0712345678');
  await user.type(screen.getByLabelText('Reason for changes'),'Added parent phone');
  await user.click(screen.getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(mockSave).toHaveBeenCalledWith({expected_updated_at:record.student.updated_at,reason:'Added parent phone',guardian_phone:'0712345678'}));
  expect(screen.getByRole('status')).toHaveTextContent('Student record saved');
});

test('class change derives its subjects and compulsory subjects cannot be unchecked', async () => {
  const user=userEvent.setup(); render();
  await user.click(screen.getByRole('button',{name:'Edit student'}));
  expect(screen.getByRole('checkbox',{name:'Mathematics (compulsory)'})).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Class'),'class-2');
  expect(screen.queryByRole('checkbox',{name:'Science'})).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Reason for changes'),'Change class');
  await user.click(screen.getByRole('button',{name:'Save changes'}));
  await waitFor(()=>expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({class_section_id:'class-2',subject_ids:['mat']})));
});

test('keeps entered changes when the server rejects a save', async () => {
  mockSave.mockRejectedValue(new Error('This student was updated by someone else. Reload the record before saving again.'));
  const user=userEvent.setup(); render();
  await user.click(screen.getByRole('button',{name:'Edit student'}));
  await user.type(screen.getByLabelText('Guardian name (optional)'),'New Guardian');
  await user.type(screen.getByLabelText('Reason for changes'),'Parent details');
  await user.click(screen.getByRole('button',{name:'Save changes'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('updated by someone else');
  expect(screen.getByLabelText('Guardian name (optional)')).toHaveValue('New Guardian');
  expect(screen.queryByText(/Student record saved/)).not.toBeInTheDocument();
});

test('renders recoverable error and obeys server edit permissions', () => {
  mockQuery.mockImplementation((path: string | null) => ({ data: path ? {...record,can_edit:false} : undefined, refetch:jest.fn() }));
  const view=render();
  expect(screen.queryByRole('button',{name:'Edit student'})).not.toBeInTheDocument();
  view.unmount();
  mockQuery.mockReturnValue({isError:true,error:new Error('Student was not found in this school.'),refetch:jest.fn()});
  render();
  expect(screen.getByRole('alert')).toHaveTextContent('Student was not found');
  expect(screen.getByRole('button',{name:'Retry'})).toBeInTheDocument();
});
