import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { ReconciliationCorrections } from '@/components/school/accountant/reconciliation-corrections';
import { requestDashboardApi } from '@/lib/dashboard/api-client';

const mockInvalidate=jest.fn().mockResolvedValue(undefined);
let mockCanApprove=true;
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockInvalidate})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(path:string|null)=>({
  data:path?.includes('approval-requests')?[{id:'approval',action:'reversal',status:'pending_first_approval',amount_minor:'12500',reason:'Duplicate payment',can_approve:mockCanApprove,can_cancel:true,execution:null}]:
    {items:[{id:'discrepancy',reconciliation_batch_id:'batch',provider_transaction_id:'MPESA-1',detail:'Check original payment',reconciliation_state:'manual_review_required',collection_amount_minor:'12500'}]},
  isLoading:false,isFetching:false,refetch:jest.fn(),
})}));
beforeEach(()=>{jest.clearAllMocks();mockCanApprove=true;});

test('a correction requires a reason and confirmation and keeps monetary minor units as text',async()=>{
  (requestDashboardApi as jest.Mock).mockResolvedValue({status:'pending_first_approval'});
  render(<ReconciliationCorrections/>);
  fireEvent.click(screen.getByRole('button',{name:'M-Pesa reconciliation reviews'}));
  fireEvent.click(screen.getByRole('button',{name:'Request reversal review'}));
  expect(screen.getByRole('button',{name:'Request correction'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Confirmed duplicate from original receipt'}});
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Request correction'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/payments/mpesa/reconciliation/approval-requests',expect.objectContaining({
    tenantId:'school-a',body:expect.objectContaining({amount_minor:'12500',subject_id:'discrepancy',reconciliation_discrepancy_id:'discrepancy'}),
  })));
  expect(await screen.findByRole('status')).toHaveTextContent('Two independent reviews');
});

test('first review remains pending and does not claim a financial reversal has executed',async()=>{
  (requestDashboardApi as jest.Mock).mockResolvedValue({status:'pending_second_approval'});
  render(<ReconciliationCorrections/>);
  fireEvent.click(screen.getByRole('button',{name:'M-Pesa reconciliation reviews'}));
  fireEvent.click(screen.getByRole('button',{name:'Approval requests'}));
  fireEvent.click(screen.getByRole('button',{name:'Review request'}));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));
  expect(await screen.findByRole('status')).toHaveTextContent('First review saved');
  expect(mockInvalidate).toHaveBeenCalledWith({queryKey:['school','school-a']});
});

test('failed execution remains visible and server permission flags prevent self approval',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('The financial reversal did not produce a matching ledger entry'));
  const view=render(<ReconciliationCorrections/>);
  fireEvent.click(screen.getByRole('button',{name:'M-Pesa reconciliation reviews'}));
  fireEvent.click(screen.getByRole('button',{name:'Approval requests'}));
  fireEvent.click(screen.getByRole('button',{name:'Review request'}));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button',{name:'Confirm approval'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('matching ledger entry');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Back to reviews'}));
  mockCanApprove=false;view.rerender(<ReconciliationCorrections/>);
  expect(screen.queryByRole('button',{name:'Review request'})).not.toBeInTheDocument();
});
