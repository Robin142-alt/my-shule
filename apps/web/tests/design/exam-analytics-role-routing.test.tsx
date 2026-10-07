import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { SchoolPages, buildSchoolSectionHref } from '@/components/school/school-pages';
import { renderWithProviders } from './test-utils';
import { getSchoolWorkspace } from '@/lib/experiences/school-data';

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
    expect(screen.queryByRole('button', { name: 'Academic Intelligence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Academic Intelligence' })).not.toBeInTheDocument();
    expect(getSchoolWorkspace(role).navItems.map(item => item.id)).not.toContain('academic-intelligence');
    fireEvent.click(screen.getByRole('button', { name: /Open .*sidebar|Open principal navigation/ }));
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /^Exam Analytics/ })).toHaveAttribute('aria-current', 'page');
    expect(within(screen.getByRole('dialog')).queryByRole('button', { name: /Academic Intelligence|Grade Processing|Department Performance|Subject Overview/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/School section not available/i)).not.toBeInTheDocument();
  });
  it.each(roles)('opens saved Academic Intelligence links in Exam Analytics for %s', async role => {
    window.history.replaceState(null, '', '/?ea_exam_series_id=exam-2026#results');
    renderWithProviders(<SchoolPages role={role} section="academic-intelligence" tenantSlug="homabay-high" routeMode={routeMode} liveDataEnabled={false} />);
    expect(await screen.findByRole('heading', { name: 'Exam Analytics', level: 2 })).toBeVisible();
    expect(window.location.pathname).toBe(buildSchoolSectionHref(role, 'exam-analytics', routeMode));
    expect(window.location.search).toBe('?ea_exam_series_id=exam-2026');
    expect(window.location.hash).toBe('#results');
  });
});

it.each([
  ['exams-manager', 'analysis'], ['exams-manager', 'grading'],
  ['dean-academics', 'department-performance'], ['teacher', 'reports-analytics'],
] as const)('consolidates the %s %s alias into Exam Analytics', async (role, section) => {
  renderWithProviders(<SchoolPages role={role} section={section} tenantSlug="homabay-high" routeMode="public" liveDataEnabled={false} />);
  expect(await screen.findByRole('heading', { name: 'Exam Analytics', level: 2 })).toBeVisible();
  expect(window.location.pathname).toBe(`/school/${role}/exam-analytics`);
});

it.each(roles)('navigates to Exam Analytics from the %s sidebar', async role => {
  renderWithProviders(<SchoolPages role={role} section="dashboard" tenantSlug="homabay-high" routeMode="public" liveDataEnabled={false} />);
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Exam Analytics' }) ?? screen.queryByRole('button', { name: 'Exam Analytics' })).toBeInTheDocument());
  fireEvent.click(screen.queryByRole('link', { name: 'Exam Analytics' }) ?? screen.getByRole('button', { name: 'Exam Analytics' }));
  expect(await screen.findByRole('heading', { name: 'Exam Analytics', level: 2 })).toBeVisible();
  expect(window.location.pathname).toBe(buildSchoolSectionHref(role, 'exam-analytics', 'public'));
});
