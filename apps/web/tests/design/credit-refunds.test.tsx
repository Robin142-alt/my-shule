import { fireEvent,render,screen,waitFor } from '@testing-library/react';
import { CreditRefunds } from '@/components/school/accountant/credit-refunds';
import { CreditRefundHistory } from '@/components/school/credit-refund-history';
import { requestDashboardApi } from '@/lib/dashboard/api-client';
const mockRefresh=jest.fn().mockResolvedValue(undefined);
let mockStatus='pending',mockCanReview=true;
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockRefresh})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(url:string)=>({data:{items:url?.includes('/sources/')?
  [{source_kind:'manual',source_id:'source-1',receipt_number:'RC-1',available_minor:'15000',reserved_minor:'5000'}]:
  [{id:'refund-1',amount_minor:'1200',receipt_number:'RC-1',student_name:'Jane Learner',reason:'Unused fees',status:mockStatus,
    can_review:mockCanReview,can_cancel:true,can_complete:mockStatus==='approved'}]},isLoading:false,isFetching:false,refetch:jest.fn()})}));
beforeEach(()=>{jest.clearAllMocks();mockStatus='pending';mockCanReview=true;});
test('reserves an exact partial amount with a stable retry identity and independent approval feedback',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValueOnce(new Error('Connection lost')).mockResolvedValueOnce({status:'pending'});
  render(<CreditRefunds student={{student_id:'learner',student_name:'Jane Learner'}} onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Credit receipt'),{target:{value:'manual:source-1'}});
  fireEvent.change(screen.getByLabelText('Refund amount (KES)'),{target:{value:'12.01'}});
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Return unused school fees'}});
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Request refund'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection lost');
  fireEvent.click(screen.getByRole('button',{name:'Request refund'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledTimes(2));
  const calls=(requestDashboardApi as jest.Mock).mock.calls;
  expect(calls[0][1].body).toEqual(calls[1][1].body);
  expect(calls[0][1].body).toMatchObject({source_kind:'manual',source_id:'source-1',amount_minor:'1201'});
  expect(await screen.findByRole('status')).toHaveTextContent('reserved');
});
test('approved refunds require payout evidence and a confirmation before posting',async()=>{
  mockStatus='approved';mockCanReview=false;(requestDashboardApi as jest.Mock).mockResolvedValue({status:'completed'});
  render(<CreditRefunds/>);fireEvent.click(screen.getByRole('button',{name:'Credit refunds'}));
  fireEvent.click(screen.getByRole('button',{name:'Record payout'}));
  expect(screen.getByRole('button',{name:'Confirm payout'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Outgoing payment reference'),{target:{value:'REF-123'}});
  fireEvent.change(screen.getByLabelText('Paid at'),{target:{value:'2026-01-10T10:00'}});
  fireEvent.change(screen.getByLabelText('Evidence location and details'),{target:{value:'School bank statement page 3'}});
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Confirm payout'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/billing/credit-refunds/refund-1/payout',expect.objectContaining({body:expect.objectContaining({external_reference:'REF-123'})})));
  expect(await screen.findByRole('status')).toHaveTextContent('statement');
});
test('unauthorized requester cannot review and cancellation requires notes',()=>{
  mockCanReview=false;render(<CreditRefunds/>);fireEvent.click(screen.getByRole('button',{name:'Credit refunds'}));
  expect(screen.queryByRole('button',{name:'Review refund'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Cancel request'}));
  expect(screen.getByRole('button',{name:'Confirm cancellation'})).toBeDisabled();
  expect(screen.getByLabelText('Reason')).toBeRequired();
});
test('portal refund history keeps exact minor units and displays the original payout reference as text',()=>{
  render(<CreditRefundHistory refunds={[{id:'refund-1',amount_minor:'9007199254740993',reference:'BANK<REFERENCE>',paid_at:'2026-01-10T10:00:00Z'}]}/>);
  expect(screen.getByRole('listitem')).toHaveTextContent('Refunded KES 90,071,992,547,409.93');
  expect(screen.getByRole('listitem')).toHaveTextContent('BANK<REFERENCE>');
});
