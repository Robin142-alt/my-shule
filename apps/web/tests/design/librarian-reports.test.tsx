import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ReportsWorkspace } from '@/components/school/librarian/reports-workspace';
import { toast } from 'sonner';
import { downloadBase64File, openPrintDocument } from '@/lib/dashboard/export';

const mockQuery = jest.fn();
const mockGenerate = jest.fn();
const mockAccess = jest.fn();
const mockRefetch = jest.fn();
let mockCanWrite = true;
jest.mock('@/lib/data/school-hooks', () => ({
  useSchoolQuery: (...args: unknown[]) => mockQuery(...args),
  useSchoolMutation: (path: unknown) => ({ mutateAsync: typeof path === 'string' ? mockGenerate : mockAccess }),
}));
jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ isLoading: false, hasPermission: () => mockCanWrite }) }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/dashboard/export', () => ({ downloadBase64File: jest.fn(), openPrintDocument: jest.fn() }));
const record = { id: 'saved', report_name: 'Saved Library Report', report_type: 'most_borrowed', period: 'this_term',
  generated_by: 'Librarian', generated_at: '2026-10-24T07:00:00Z', file_format: 'pdf', status: 'Ready' };

describe('library report workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanWrite = true;
    mockQuery.mockReturnValue({ data: { metrics: { total_reports: 1, this_month: 1, pending: 0 }, reports: [record] },
      isLoading: false, isFetching: false, error: null, refetch: mockRefetch });
    mockGenerate.mockResolvedValue({ success: true, snapshotId: 'snapshot', artifact: { content_base64: 'JVBERg==' } });
    mockAccess.mockResolvedValue({ report: { snapshotId: 'snapshot', title: record.report_name, generatedDate: record.generated_at,
      artifact: { filename: 'library.pdf', content_type: 'application/pdf', content_base64: 'JVBERg==' },
      manifest: { sections: { school: { name: 'School A' }, most_borrowed: { records: [{ book_title: 'School A book', times_borrowed: 2 }] } } } } });
  });
  it('shows previously saved reports with preview and download actions', () => {
    render(<ReportsWorkspace />);
    expect(screen.getByText('Saved Library Report')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview / Print' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download' })).toBeEnabled();
    expect(screen.queryByText(/No reports generated/)).not.toBeInTheDocument();
  });
  it('generates the selected type, period and format and refreshes saved records', async () => {
    render(<ReportsWorkspace />);
    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'most_borrowed' } });
    fireEvent.change(screen.getByLabelText('Report period'), { target: { value: 'this_month' } });
    fireEvent.change(screen.getByLabelText('Report format'), { target: { value: 'csv' } });
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));
    await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
    expect(mockGenerate).toHaveBeenCalledWith({ report_type: 'most_borrowed', period: 'this_month', format: 'csv' });
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('generated and saved'));
  });
  it('does not claim success for an accepted request without a saved artifact', async () => {
    mockGenerate.mockResolvedValue({ accepted: true });
    render(<ReportsWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
  });
  it('keeps server validation failures visible and permits retry', async () => {
    mockGenerate.mockRejectedValue(new Error('No school term covers today.'));
    render(<ReportsWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate Report' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to generate report.', { description: 'No school term covers today.' }));
    expect(screen.getByRole('button', { name: 'Generate Report' })).toBeEnabled();
  });
  it('does not show a failed query as an empty report history', () => {
    mockQuery.mockReturnValue({ data: undefined, isLoading: false, error: new Error('Connection failed'), refetch: mockRefetch });
    render(<ReportsWorkspace />);
    expect(screen.getByRole('alert')).toHaveTextContent('Connection failed');
    expect(screen.queryByText(/No reports generated/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(mockRefetch).toHaveBeenCalled();
  });
  it('downloads the authenticated stored artifact and previews the saved school records', async () => {
    render(<ReportsWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(downloadBase64File).toHaveBeenCalledWith({ filename: 'library.pdf', mimeType: 'application/pdf', contentBase64: 'JVBERg==' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Preview / Print' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Preview / Print' }));
    await waitFor(() => expect(openPrintDocument).toHaveBeenCalledWith(expect.objectContaining({ footer: 'Document number: snapshot',
      rows: expect.arrayContaining([expect.objectContaining({ value: 'School A book' })]) })));
    expect(mockAccess).toHaveBeenCalledWith({ id: 'saved' });
  });
  it('shows missing artifacts as an access error', async () => {
    mockAccess.mockResolvedValue({ report: { artifact: {} } });
    render(<ReportsWorkspace />);
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(downloadBase64File).not.toHaveBeenCalled();
  });
  it('locks generation without library write permission', () => {
    mockCanWrite = false;
    render(<ReportsWorkspace />);
    expect(screen.getByRole('button', { name: 'Generate Report' })).toBeDisabled();
  });
  it('identifies inventory as a current snapshot rather than a historical period', () => {
    render(<ReportsWorkspace />);
    fireEvent.change(screen.getByLabelText('Report type'), { target: { value: 'inventory' } });
    expect(screen.getByLabelText('Report period')).toBeDisabled();
    expect(screen.getByLabelText('Report period')).toHaveValue('current');
  });
});
