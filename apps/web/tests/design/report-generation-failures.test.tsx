import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportGenerationFailures } from '@/components/school/report-generation-failures';

it('summarizes shared failures and keeps individual details expandable', async () => {
  const retry = jest.fn();
  render(<ReportGenerationFailures count={13} failures={Array.from({ length: 13 }, (_, i) => ({
    student_id: String(i), student_name: `Learner ${i}`, code: 'REPORT_STORAGE_CONFIGURATION',
    message: 'Report storage credentials or permissions need repair.',
  }))} onRetry={retry} busy={false} />);
  expect(screen.getByText('13 report cards could not be generated.')).toBeVisible();
  expect(screen.getByText('Learner 0:')).not.toBeVisible();
  await userEvent.click(screen.getByText('Individual failure details (13)'));
  expect(screen.getByText('Learner 0:')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Retry Failed' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it('disables repeated retry while a batch is running', () => {
  render(<ReportGenerationFailures count={1} failures={[{ student_id: '1', message: 'Invalid report data.' }]} onRetry={jest.fn()} busy />);
  expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
});
