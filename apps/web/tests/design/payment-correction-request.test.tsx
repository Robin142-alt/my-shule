import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {PaymentCorrectionRequest} from '@/components/school/accountant/payment-correction-request';
import {requestDashboardApi} from '@/lib/dashboard/api-client';
const mockRefresh=jest.fn().mockResolvedValue(undefined);
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockRefresh})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/components/common/learner-picker',()=>({LearnerPicker:({onChange}:any)=><button onClick={()=>onChange({id:'learner-b',name:'Learner B',admissionNumber:'B'})}>Choose learner B</button>}));
beforeEach(()=>{jest.clearAllMocks();(requestDashboardApi as jest.Mock).mockResolvedValue({status:'pending_first_approval'});});
test.each(['move_payment','post_after_mismatch'] as const)('%s requires an explicit learner, evidence and confirmation',async kind=>{
  render(<PaymentCorrectionRequest id="collection-a" amount="12000" kind={kind} label="Correct receipt"/>);
  fireEvent.click(screen.getByRole('button',{name:'Correct receipt'}));
  expect(screen.getByRole('button',{name:'Request review'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Choose learner B'}));
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Original bank reference named the wrong learner'}});
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Request review'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/payments/mpesa/reconciliation/approval-requests',expect.objectContaining({tenantId:'school-a',body:expect.objectContaining({action:kind,subject_type:'collection_payment',subject_id:'collection-a',target_student_id:'learner-b',amount_minor:'12000'})})));
  expect(await screen.findByRole('status')).toHaveTextContent('Two independent reviews');
});
test('write-off requests preserve exact cents and cannot exceed the current invoice balance',async()=>{
  render(<PaymentCorrectionRequest id="invoice-a" amount="10001" kind="write_off" label="Write off"/>);
  fireEvent.click(screen.getByRole('button',{name:'Write off'}));
  fireEvent.change(screen.getByLabelText('Write-off amount (KES)'),{target:{value:'100.02'}});
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Approved hardship adjustment'}});fireEvent.click(screen.getByRole('checkbox'));
  expect(screen.getByRole('button',{name:'Request review'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Write-off amount (KES)'),{target:{value:'100.01'}});
  fireEvent.click(screen.getByRole('button',{name:'Request review'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith(expect.any(String),expect.objectContaining({body:expect.objectContaining({action:'write_off',subject_type:'invoice',amount_minor:'10001'})})));
});
test('a rejected request retains the dialog and gives truthful retry feedback',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('The receipt has a reserved refund'));
  render(<PaymentCorrectionRequest id="receipt" subjectType="payment_intent" amount="10000" kind="move_payment" label="Move STK"/>);
  fireEvent.click(screen.getByRole('button',{name:'Move STK'}));fireEvent.click(screen.getByRole('button',{name:'Choose learner B'}));
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Reviewed original receipt'}});fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Request review'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('reserved refund');expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
