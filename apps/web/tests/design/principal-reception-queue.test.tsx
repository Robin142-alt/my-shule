import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReceptionQueueWorkspace } from '@/components/school/secretary/reception-queue-workspace';
import { createQueueEntry, callNextInQueue, completeQueueEntry } from '@/components/school/secretary/api-client';

const refetch = jest.fn();
let canWrite = true;
jest.mock('@/lib/data/school-hooks', () => ({ useSchoolQuery: () => ({ data: {
  metrics: { total_in_queue: 1, being_served: 1, completed_today: 0, avg_wait_minutes: 5 },
  queue: ['Waiting', 'Being Served'].map((status, index) => ({ id: `visit-${index}`, visitor_name: `Visitor ${index}`,
    ticket_number: `R-${index}`, role_relationship: 'Parent', purpose: 'School meeting', person_to_see: 'Principal',
    arrival_time: '2026-11-02T08:00:00Z', wait_time_minutes: 5, status })),
}, isLoading: false, error: null, refetch }) }));
jest.mock('@/components/providers/permission-context', () => ({ usePermissions: () => ({ hasPermission: () => canWrite }) }));
jest.mock('@/components/school/secretary/api-client', () => ({ createQueueEntry: jest.fn(), callNextInQueue: jest.fn(), completeQueueEntry: jest.fn() }));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

beforeEach(() => { jest.clearAllMocks(); canWrite = true; });

test('Secretary records visitor relationship and purpose for the Principal and refreshes the live queue', async () => {
  render(<ReceptionQueueWorkspace />); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Add visitor to queue' }));
  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Visitor name'), 'Reception Test');
  await user.type(within(dialog).getByLabelText('Role / Relationship'), 'Parent');
  await user.selectOptions(within(dialog).getByLabelText('Person to see'), 'Principal');
  await user.type(within(dialog).getByLabelText('Purpose of visit'), 'Academic support');
  await user.click(within(dialog).getByRole('button', { name: 'Check in visitor' }));
  expect(createQueueEntry).toHaveBeenCalledWith({ visitor_name: 'Reception Test', role_relationship: 'Parent', person_to_see: 'Principal', purpose: 'Academic support' });
  expect(refetch).toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('Calling and completing visitors use their persisted entry IDs', async () => {
  render(<ReceptionQueueWorkspace />); const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Call' }));
  expect(callNextInQueue).toHaveBeenCalledWith('visit-0');
  await user.click(screen.getByRole('button', { name: 'Complete' }));
  expect(completeQueueEntry).toHaveBeenCalledWith('visit-1');
  expect(refetch).toHaveBeenCalledTimes(2);
});

test('Read-only reception permissions prevent checking in or advancing visitors', () => {
  canWrite = false; render(<ReceptionQueueWorkspace />);
  expect(screen.getByRole('button', { name: 'Add visitor to queue' })).toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Call' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument();
});
