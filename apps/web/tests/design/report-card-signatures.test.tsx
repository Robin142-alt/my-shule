import { fireEvent, screen, within } from '@testing-library/react';
import { ReportCardDocument } from '@/components/report-cards/report-card-document';
import { mapPersistedReportCardDocument } from '@/lib/report-cards/live-report-card';
import type { LiveExamReportCard } from '@/lib/modules/exams-client';
import { renderWithProviders } from './test-utils';

function report(status = 'draft_generated', hasSignatures = true) {
  const card: LiveExamReportCard = {
    id: 'card-1', student_id: 'student-1', report_snapshot_id: 'snapshot-1', status,
    verification_code: 'VERIFY',
    metadata: { report_card: {
      generated_at: '2026-09-23T09:00:00Z', subjects: [], totals: {}, student: {},
      template_fields: {
        learner_name: 'Test Learner', class_teacher_name: 'Assigned Teacher', principal_name: 'School Principal',
        class_teacher_signature_ref: hasSignatures ? 'tenant/school-a/class-teacher.png' : null,
        principal_signature_ref: hasSignatures ? 'tenant/school-a/principal.png' : null,
      },
    } },
  };
  return mapPersistedReportCardDocument(card, { schoolName: 'Test School', audience: 'exams-manager' });
}

it.each(['draft_generated', 'under_review', 'approved', 'published'])('shows both saved signatures on a %s report without waiting for publication', status => {
  renderWithProviders(<ReportCardDocument report={report(status)} />);
  const teacher = screen.getByRole('img', { name: 'Class Teacher Signature' });
  const principal = screen.getByRole('img', { name: 'Principal Signature' });
  expect(teacher).toHaveAttribute('src', '/api/exams/report-cards/card-1/signatures/class_teacher?v=VERIFY');
  expect(principal).toHaveAttribute('src', '/api/exams/report-cards/card-1/signatures/principal?v=VERIFY');
  const signatures = screen.getByTestId('report-card-document').querySelector('[data-report-section="signatures"]')!;
  expect(signatures).not.toHaveTextContent('Assigned Teacher');
  expect(signatures).not.toHaveTextContent('School Principal');
  expect(signatures).toHaveTextContent('Class Teacher Signature');
  expect(signatures).toHaveTextContent('Principal Signature');
  fireEvent.load(teacher);
  fireEvent.load(principal);
  expect(within(signatures as HTMLElement).queryByRole('status')).not.toBeInTheDocument();
  expect(report(status).permissions.canPublish).toBe(false);
});

it('offers a real retry when a saved signature cannot load', () => {
  renderWithProviders(<ReportCardDocument report={report()} />);
  fireEvent.error(screen.getByRole('img', { name: 'Principal Signature' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Signature could not load.');
  fireEvent.click(screen.getByRole('button', { name: 'Retry principal signature' }));
  const principal = screen.getByRole('img', { name: 'Principal Signature' });
  expect(principal).toHaveAttribute('src', '/api/exams/report-cards/card-1/signatures/principal?v=VERIFY&retry=1');
  fireEvent.load(principal);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('leaves both signing areas empty for manual signing without changing report status', () => {
  const document = report('draft_generated', false);
  renderWithProviders(<ReportCardDocument report={document} />);
  expect(screen.queryByRole('img', { name: 'Class Teacher Signature' })).not.toBeInTheDocument();
  expect(screen.queryByRole('img', { name: 'Principal Signature' })).not.toBeInTheDocument();
  const signatures = screen.getByTestId('report-card-document').querySelector('[data-report-section="signatures"]')!;
  expect(signatures.textContent).toBe('Class Teacher SignaturePrincipal Signature');
  const spaces = signatures.querySelectorAll('[data-signature-space]');
  expect(spaces).toHaveLength(2);
  spaces.forEach(space => expect(space).toBeEmptyDOMElement());
  expect(document.signatures.every(signature => signature.date === undefined)).toBe(true);
  expect(document.curriculum.reportStatus).toBe('Draft');
});

it.each(['Class Teacher Signature', 'Principal Signature'])('leaves only the missing %s blank', label => {
  const document = report();
  const signature = document.signatures.find(item => label.startsWith(item.role))!;
  signature.imageUrl = undefined;
  renderWithProviders(<ReportCardDocument report={document} />);
  const signatures = screen.getByTestId('report-card-document').querySelector('[data-report-section="signatures"]')!;
  expect(within(signatures as HTMLElement).getAllByRole('img')).toHaveLength(1);
  expect(screen.queryByRole('img', { name: label })).not.toBeInTheDocument();
  expect(signatures).not.toHaveTextContent(/No saved|Upload|regenerate/i);
});
