import { render, screen } from '@testing-library/react';
import { PrincipalWorkspaceSurface } from '@/components/school/principal-dashboard/workspace-ui';
import { Modal } from '@/components/ui/modal';

test('Principal presentation follows its own portalled dialogs without altering other roles', () => {
  render(<><PrincipalWorkspaceSurface><Modal open onClose={() => {}} title="Principal form">School decision</Modal></PrincipalWorkspaceSurface>
    <Modal open onClose={() => {}} title="Other role form">Other workspace</Modal></>);
  expect(screen.getByRole('dialog', { name: 'Principal form' })).toHaveClass('dialog');
  expect(screen.getByRole('dialog', { name: 'Other role form' })).not.toHaveClass('dialog');
});
