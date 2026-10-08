import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SettingsWorkspace } from '@/components/school/class-teacher/workspaces/settings';
import { useClassTeacherSettings, useSaveClassTeacherSettings } from '@/lib/data/class-teacher-hooks';
import { toast } from 'sonner';

jest.mock('@/lib/data/class-teacher-hooks', () => ({
  useClassTeacherSettings: jest.fn(), useSaveClassTeacherSettings: jest.fn(),
  useResolvedClassTeacherStreamId: () => ({ streamId: 'class-a' }),
  useClassTeacherReportCardSignature: () => ({ data: null }),
  useUploadClassTeacherReportCardSignature: () => ({ isPending: false }),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
const save = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  save.mockResolvedValue({ success: true });
  jest.mocked(useClassTeacherSettings).mockReturnValue({ data: { nameTitle: null, displayName: 'Ms. Amani Wanjiku', nameTitles: ['', 'Mr.', 'Mrs.', 'Ms.', 'Miss', 'Dr.'], notificationsEnabled: true, defaultView: 'Overview' } } as never);
  jest.mocked(useSaveClassTeacherSettings).mockReturnValue({ mutateAsync: save, isPending: false } as never);
});

test('title choice previews the full name without duplicate prefixes and saves it through settings', async () => {
  render(<SettingsWorkspace />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Name title' }), { target: { value: 'Mrs.' } });
  expect(screen.getByText('Mrs. Amani Wanjiku')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ nameTitle: 'Mrs.' })));
  expect(toast.success).toHaveBeenCalled();
});

test('No title clears a prefix and failed persistence is not reported as success', async () => {
  save.mockRejectedValueOnce(new Error('Save failed'));
  render(<SettingsWorkspace />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Name title' }), { target: { value: '' } });
  expect(screen.getByText('Amani Wanjiku')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Save failed'));
  expect(toast.success).not.toHaveBeenCalled();
});
