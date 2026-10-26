import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { RefundEvidence } from '@/components/school/accountant/refund-evidence';
import { requestDashboardApi } from '@/lib/dashboard/api-client';
const mockRefresh=jest.fn().mockResolvedValue(undefined);
let mockCanReview=true;
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockRefresh})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:()=>({data:{items:[{id:'refund-1',amount_minor:'15000',external_reference:'BANK-REFUND-1',
  evidence_reference:'Bank statement page 3',reason:'Full receipt refund',status:'pending_review',can_review:mockCanReview,paid_at:'2026-01-10T10:00:00Z'}]},isLoading:false,isFetching:false,refetch:jest.fn()})}));
beforeEach(()=>{jest.clearAllMocks();mockCanReview=true;});
test('requires proof and confirmation for a reversed receipt and reports a pending review',async()=>{
  (requestDashboardApi as jest.Mock).mockResolvedValue({status:'pending_review'});
  render(<RefundEvidence receipt={{id:'receipt-1',receipt_number:'RC-1',amount_minor:'15000',metadata:{source:'stk_payment'}}} onClose={jest.fn()}/>);
  expect(screen.getByRole('button',{name:'Submit evidence'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Outgoing payment reference'),{target:{value:'BANK-REFUND-1'}});
  fireEvent.change(screen.getByLabelText('Refund paid at'),{target:{value:'2026-01-10T10:00'}});
  fireEvent.change(screen.getByLabelText('Evidence location and details'),{target:{value:'Bank statement page 3'}});
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Full receipt refund'}});
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Submit evidence'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/billing/refund-evidence',expect.objectContaining({body:expect.objectContaining({
    receipt_id:'receipt-1',source_kind:'stk',amount_minor:'15000',external_reference:'BANK-REFUND-1'})})));
  expect(await screen.findByRole('status')).toHaveTextContent('Awaiting independent Principal review');
  expect(mockRefresh).toHaveBeenCalled();
});
test('a Principal reviews evidence with notes and a confirmation; failure remains retryable',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('Evidence no longer agrees with the reversal'));
  render(<RefundEvidence/>);fireEvent.click(screen.getByRole('button',{name:'Refund evidence'}));
  fireEvent.click(screen.getByRole('button',{name:'Review evidence'}));
  fireEvent.change(screen.getByLabelText('Review notes'),{target:{value:'Checked the original outgoing statement'}});
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Confirm decision'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('no longer agrees');
  expect(screen.getByRole('button',{name:'Confirm decision'})).toBeEnabled();
});
test('the requester cannot see an approval action',()=>{
  mockCanReview=false;render(<RefundEvidence/>);fireEvent.click(screen.getByRole('button',{name:'Refund evidence'}));
  expect(screen.queryByRole('button',{name:'Review evidence'})).not.toBeInTheDocument();
});
