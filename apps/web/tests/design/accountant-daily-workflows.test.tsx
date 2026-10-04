import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { InvoicesWorkspace } from '@/components/school/accountant/invoices-workspace';
import { PaymentRegister } from '@/components/school/accountant/payment-register';
import { requestDashboardApi } from '@/lib/dashboard/api-client';
import { openPrintDocument } from '@/lib/dashboard/export';

const mockInvalidate=jest.fn().mockResolvedValue(undefined);
const mockRefetch=jest.fn();
let mockQueryError: Error | null=null;
const learner={id:'11111111-1111-4111-8111-111111111111',name:'Amina Test',admissionNumber:'ADM-01'};
jest.mock('@tanstack/react-query',()=>({useQueryClient:()=>({invalidateQueries:mockInvalidate})}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'isolated-school'}));
jest.mock('@/components/providers/permission-context',()=>({usePermissions:()=>({hasPermission:()=>true})}));
jest.mock('@/components/school/integrated-school-command-header',()=>({useSchoolCommandIdentity:()=>({schoolName:'Isolated Test School',userLabel:'Test Bursar'})}));
jest.mock('@/components/common/learner-picker',()=>({LearnerPicker:({onChange}:any)=><button type="button" onClick={()=>onChange({id:'11111111-1111-4111-8111-111111111111',name:'Amina Test',admissionNumber:'ADM-01'})}>Choose Amina Test</button>}));
jest.mock('@/lib/dashboard/api-client',()=>({requestDashboardApi:jest.fn()}));
jest.mock('@/lib/dashboard/export',()=>({openPrintDocument:jest.fn(),downloadCsvFile:jest.fn(),downloadTextFile:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(path:string)=>({
  data:!path?undefined:path?.includes('billable-students')?[{student_id:'11111111-1111-4111-8111-111111111111',student_name:'Amina Test',admission_number:'ADM-01',grade_level:'Grade 7'}]
    :path==='/billing/fee-structures'?[{id:'structure-one',name:'Term fees',status:'active',total_amount_minor:'10000'}]
    :path?.includes('manual-fee-payments?')?[{id:'receipt-one',receipt_number:'RCT-001',student_name:'Amina Test',student_id:'11111111-1111-4111-8111-111111111111',admission_number:'ADM-01',status:'received',payment_method:'cheque',amount_minor:'10000',received_at:'2026-10-01T10:00:00Z'}]:[],
  error:mockQueryError,isLoading:false,isFetching:false,refetch:mockRefetch,
})}));
const request=requestDashboardApi as jest.Mock;
beforeEach(()=>{jest.clearAllMocks();request.mockReset();mockQueryError=null;});

it('single invoice keeps failed form open, retries the same key and sends the active school',async()=>{
  request.mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValueOnce({invoice_number:'INV-001'});
  render(<InvoicesWorkspace role="accountant" tenantSlug="isolated-school" routeMode="public" />);
  fireEvent.click(screen.getByRole('button',{name:'Create invoice'}));
  const dialog=screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button',{name:'Choose Amina Test'}));
  fireEvent.change(within(dialog).getByLabelText('Amount (KES)'),{target:{value:'1,200.50'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Create invoice'}));
  await screen.findByText('Connection interrupted');
  expect(screen.getByRole('dialog')).toBeVisible();
  fireEvent.click(within(dialog).getByRole('button',{name:'Create invoice'}));
  await screen.findByText(/INV-001 created/);
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][1]).toEqual(request.mock.calls[1][1]);
  expect(request.mock.calls[0][1]).toMatchObject({tenantId:'isolated-school',body:{total_amount_minor:'120050',metadata:{student_id:learner.id}}});
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('bulk billing loads eligible learners, sends only accepted fields and preserves a failed selection',async()=>{
  request.mockRejectedValueOnce(new Error('Invoice service unavailable'));
  render(<InvoicesWorkspace role="accountant" tenantSlug="isolated-school" routeMode="public" />);
  fireEvent.click(screen.getByRole('button',{name:'Bill a class'}));
  fireEvent.change(screen.getByLabelText('Fee structure'),{target:{value:'structure-one'}});
  fireEvent.click(screen.getByRole('button',{name:'Select all'}));
  fireEvent.click(screen.getByRole('button',{name:'Create 1 invoices'}));
  await screen.findByText('Invoice service unavailable');
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.getByRole('checkbox')).toBeChecked();
  expect(request.mock.calls[0][1].body.target_students).toEqual([{student_id:learner.id,student_name:learner.name}]);
});

it('pending cheque preview truthfully distinguishes acknowledgement from cleared funds and audits the active school',async()=>{
  request.mockResolvedValueOnce({});
  render(<PaymentRegister tenantSlug="isolated-school" />);
  fireEvent.click(screen.getAllByRole('button',{name:'Preview / print'})[0]);
  expect(openPrintDocument).toHaveBeenCalledWith(expect.objectContaining({title:'Receipt RCT-001',subtitle:'Payment acknowledgement · received',footer:expect.stringContaining('does not confirm cleared funds')}));
  expect(screen.getAllByRole('button',{name:'Confirm cleared'})[0]).toBeVisible();
  expect(screen.queryByRole('button',{name:'Request reversal'})).not.toBeInTheDocument();
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/admin-command/accountant/actions',expect.objectContaining({
    tenantId:'isolated-school',method:'POST',body:expect.objectContaining({action:'receipt_previewed',entity_id:'receipt-one'}),
  })));
  await waitFor(()=>expect(screen.getAllByRole('button',{name:'Preview / print'})[0]).toBeEnabled());
});

it('surfaces receipt audit failure and permits retry without recording a new payment',async()=>{
  request.mockRejectedValueOnce(new Error('Audit service unavailable')).mockResolvedValueOnce({});
  render(<PaymentRegister tenantSlug="isolated-school" />);
  fireEvent.click(screen.getAllByRole('button',{name:'Preview / print'})[0]);
  expect(await screen.findByRole('alert')).toHaveTextContent('Audit service unavailable');
  fireEvent.click(screen.getAllByRole('button',{name:'Preview / print'})[0]);
  await waitFor(()=>expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls.every(([endpoint])=>endpoint==='/admin-command/accountant/actions')).toBe(true);
  await waitFor(()=>expect(screen.getAllByRole('button',{name:'Preview / print'})[0]).toBeEnabled());
});

it('failed registers surface errors with a working refresh instead of a fake empty success',async()=>{
  mockQueryError=new Error('School finance temporarily unavailable');
  render(<InvoicesWorkspace role="accountant" tenantSlug="isolated-school" routeMode="public" />);
  expect(screen.getByRole('alert')).toHaveTextContent('School finance temporarily unavailable');
  fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
  await waitFor(()=>expect(mockRefetch).toHaveBeenCalledTimes(1));
});
