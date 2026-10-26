import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { InvoicesWorkspace } from '@/components/school/accountant/invoices-workspace';
import { requestDashboardApi } from '@/lib/dashboard/api-client';

const mockInvalidate=jest.fn().mockResolvedValue(undefined);
let mockCanWrite=true;
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockInvalidate})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/components/school/integrated-school-command-header',()=>({useSchoolCommandIdentity:()=>({schoolName:'School',userLabel:'Accountant'})}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>mockCanWrite})}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(path:string)=>({
  data:!path?undefined:path.includes('student-balances')?[{student_id:'learner',student_name:'Amina',invoiced_amount_minor:'10000',paid_amount_minor:'0',credit_amount_minor:'5000',balance_amount_minor:'5000'}]:[],
  isLoading:false,isFetching:false,refetch:jest.fn(),
})}));
beforeEach(()=>{jest.clearAllMocks();mockCanWrite=true;});

test('applying available credit requires a reason, refreshes school queries and reports the actual amount',async()=>{
  (requestDashboardApi as jest.Mock).mockResolvedValue({applied_amount_minor:'5000'});
  render(<InvoicesWorkspace role="accountant" routeMode="public"/>);
  fireEvent.click(screen.getByRole('button',{name:'Learner balances'}));
  fireEvent.click(screen.getAllByRole('button',{name:'Apply credit'})[0]);
  expect(requestDashboardApi).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Confirm credit application'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Apply the previous term overpayment'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm credit application'}));
  await waitFor(()=>expect(requestDashboardApi).toHaveBeenCalledWith('/billing/students/learner/apply-credit',expect.objectContaining({
    tenantId:'school-a',method:'POST',body:{reason:'Apply the previous term overpayment'},
  })));
  await waitFor(()=>expect(mockInvalidate).toHaveBeenCalledWith({queryKey:['school','school-a']}));
  expect(await screen.findByText(/applied to eligible invoices/i)).toBeVisible();
});

test('a failed application stays open for retry and readers cannot apply credit',async()=>{
  (requestDashboardApi as jest.Mock).mockRejectedValue(new Error('Credit could not be applied'));
  const view=render(<InvoicesWorkspace role="accountant" routeMode="public"/>);
  fireEvent.click(screen.getByRole('button',{name:'Learner balances'}));
  fireEvent.click(screen.getAllByRole('button',{name:'Apply credit'})[0]);
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Use existing credit'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirm credit application'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Credit could not be applied');
  fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
  mockCanWrite=false;view.rerender(<InvoicesWorkspace role="accountant" routeMode="public"/>);
  for (const action of screen.getAllByRole('button',{name:'Apply credit'})) expect(action).toBeDisabled();
});
