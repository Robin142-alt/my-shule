import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LegacyInvoicesReview } from '@/components/school/accountant/legacy-invoices-review';
import { requestDashboardApi } from '@/lib/dashboard/api-client';

const mockInvalidate=jest.fn().mockResolvedValue(undefined),mockRefetch=jest.fn();
let mockPermission=true;
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockInvalidate})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>mockPermission})}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:()=>({data:{items:[
  {legacy_id:'legacy-1',invoice_number:'OLD-1',student_name:'Amina',amount_minor:'10000',paid_minor:'6000',balance_minor:'4000',fingerprint:'a'.repeat(64),status:'ready',message:'Reviewed original balance'},
  {legacy_id:'legacy-2',invoice_number:'OLD-2',student_name:'Beka',amount_minor:'10000',paid_minor:'0',balance_minor:'10000',fingerprint:'b'.repeat(64),status:'exception',message:'Learner missing'},
],has_more:false},isLoading:false,isFetching:false,refetch:mockRefetch})}));
beforeEach(()=>{jest.clearAllMocks();mockPermission=true;});

test('Principal reviews balances and submits only ready invoices with a reason and current fingerprint',async()=>{
  (requestDashboardApi as jest.Mock).mockResolvedValue({adopted:1});
  render(<LegacyInvoicesReview principal/>);
  fireEvent.click(screen.getByRole('button',{name:'Historical invoices'}));
  expect(screen.getByText('KES 60')).toBeVisible();
  expect(screen.getByRole('checkbox',{name:'Select OLD-2'})).toBeDisabled();
  fireEvent.click(screen.getByRole('button',{name:'Select ready invoices'}));
  expect(screen.getByRole('button',{name:'Confirm adoption (1)'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Review notes'),{target:{value:'Verified the original fee register'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm adoption (1)'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/billing/legacy-invoices/adopt',{
    tenantId:'school-a',method:'POST',body:{invoices:[{legacy_id:'legacy-1',fingerprint:'a'.repeat(64)}],reason:'Verified the original fee register'},
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('1 historical invoices adopted');
  expect(mockInvalidate).toHaveBeenCalledWith({queryKey:['school','school-a']});
});

test('Accountant can inspect but cannot adopt, and permissions lock access',()=>{
  const view=render(<LegacyInvoicesReview/>);
  fireEvent.click(screen.getByRole('button',{name:'Historical invoices'}));
  expect(screen.getByText(/Principal can approve/)).toBeVisible();
  expect(screen.queryByRole('button',{name:/Confirm adoption/})).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Close'}));
  mockPermission=false;view.rerender(<LegacyInvoicesReview principal/>);
  expect(screen.getByRole('button',{name:'Historical invoices'})).toBeDisabled();
});

test('stale preview failure stays visible and refreshing clears selections before retry',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('A legacy invoice changed after preview'));
  render(<LegacyInvoicesReview principal/>);
  fireEvent.click(screen.getByRole('button',{name:'Historical invoices'}));
  fireEvent.click(screen.getByRole('checkbox',{name:'Select OLD-1'}));
  fireEvent.change(screen.getByLabelText('Review notes'),{target:{value:'Verified original statement'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm adoption (1)'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('changed after preview');
  fireEvent.click(screen.getByRole('button',{name:'Refresh preview'}));
  expect(mockRefetch).toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Confirm adoption (0)'})).toBeDisabled();
});
