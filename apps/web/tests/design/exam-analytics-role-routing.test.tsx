import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SchoolPages, buildSchoolSectionHref } from '@/components/school/school-pages';
import { renderWithProviders } from './test-utils';

const roles = ['principal', 'deputy-principal', 'dean-academics', 'exams-manager', 'hod', 'hos', 'grade-master', 'class-teacher', 'teacher'] as const;
jest.setTimeout(30000);

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ metrics: {}, items: [], exams: [], marks: [], reports: [] }) }) as unknown as typeof fetch;
});

describe.each(['public', 'hosted'] as const)('%s Exam Analytics role routes', routeMode => {
  it.each(roles)('opens the shared workspace on the %s dashboard', async role => {
    renderWithProviders(<SchoolPages role={role} section="exam-analytics" tenantSlug="homabay-high" routeMode={routeMode} liveDataEnabled={false} />);
    expect(await screen.findByRole('heading', { name: 'Exam Analytics', level: 2 })).toBeVisible();
    const entry = screen.queryByRole('link', { name: 'Exam Analytics' }) ?? screen.getByRole('button', { name: 'Exam Analytics' });
    expect(entry).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('button', { name: /Open .*sidebar|Open principal navigation/ }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^Exam Analytics/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
  });
});

it.each(roles)('navigates to Exam Analytics from the %s sidebar', async role => {
  renderWithProviders(<SchoolPages role={role} section="dashboard" tenantSlug="homabay-high" routeMode="public" liveDataEnabled={false} />);
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Exam Analytics' }) ?? screen.queryByRole('button', { name: 'Exam Analytics' })).toBeInTheDocument());
  fireEvent.click(screen.queryByRole('link', { name: 'Exam Analytics' }) ?? screen.getByRole('button', { name: 'Exam Analytics' }));
  expect(await screen.findByRole('heading', { name: 'Exam Analytics', level: 2 })).toBeVisible();
  expect(window.location.pathname).toBe(buildSchoolSectionHref(role, 'exam-analytics', 'public'));
});
