import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { PaymentRegister } from '@/components/school/accountant/payment-register';
import { requestDashboardApi } from '@/lib/dashboard/api-client';

const mockRefresh=jest.fn().mockResolvedValue(undefined);
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockRefresh})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock('@/components/school/integrated-school-command-header',()=>({useSchoolCommandIdentity:()=>({schoolName:'School'})}));
jest.mock('@/components/common/learner-picker',()=>({LearnerPicker:()=>null}));
jest.mock('@/components/school/accountant/manual-reversal-queue',()=>({ManualReversalQueue:()=>null}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:()=>({data:[{id:'intent-1',receipt_number:'STK-intent-1',payment_method:'mpesa_c2b',
  status:'cleared',student_name:'Learner',amount_minor:'15000',received_at:'2026-10-20T08:00:00Z',metadata:{source:'stk_payment'}}],
  isLoading:false,isFetching:false,refetch:jest.fn()})}));
beforeEach(()=>jest.clearAllMocks());

test('starts a governed STK review from the receipt without claiming that a payment has been reversed',async()=>{
  (requestDashboardApi as jest.Mock).mockResolvedValue({status:'pending_first_approval',message:'Correction requested. Two independent reviews are required.'});
  render(<PaymentRegister/>);
  fireEvent.click(screen.getAllByRole('button',{name:'Request reversal'})[0]);
  expect(screen.getByText(/Two independent reviewers/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Original receipt needs an approved correction'}});
  fireEvent.click(screen.getByRole('button',{name:'Request approval'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/payments/mpesa/payment-intents/intent-1/reversal-requests',
    expect.objectContaining({tenantId:'school-a',body:{reason:'Original receipt needs an approved correction'}})));
  expect(await screen.findByText(/Correction requested/)).toBeInTheDocument();
  expect(mockRefresh).toHaveBeenCalledWith({queryKey:['school','school-a']});
});

test('keeps a rejected STK review visible for correction and retry',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('This receipt already has a pending review'));
  render(<PaymentRegister/>);
  fireEvent.click(screen.getAllByRole('button',{name:'Request reversal'})[0]);
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Please review this receipt'}});
  fireEvent.click(screen.getByRole('button',{name:'Request approval'}));
  expect((await screen.findAllByRole('alert')).some(alert=>alert.textContent?.includes('pending review'))).toBe(true);
  expect(screen.getByRole('button',{name:'Request approval'})).toBeEnabled();
});
