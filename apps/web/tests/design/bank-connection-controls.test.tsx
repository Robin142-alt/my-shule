import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BankRetrievalControl } from '@/components/school/accountant/bank-retrieval-control';
import { BankConnectionControl } from '@/components/school/accountant/bank-connection-control';
import * as api from '@/lib/finance/payment-channels-client';
import { useSchoolQuery } from '@/lib/data/school-hooks';
jest.mock('@/lib/finance/payment-channels-client',()=>({retrieveBankTransactions:jest.fn(),configureSchoolBank:jest.fn(),testSchoolBank:jest.fn()}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:jest.fn()}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:()=> 'school-a'}));
jest.mock('@/lib/school/school-operational-store',()=>({publishSchoolDataUpdate:jest.fn()}));
const refetch=jest.fn();
const row={id:'revision-a',tenant_id:'school-a',account_name:'School account',account_number:'123456789',status:'approved',environment:null} as api.CollectionChannelRevision;
const provider={code:'equity',name:'Equity Bank',credential_fields:[{key:'api_key',label:'API key',required:true,secret:true},
  {key:'private_key',label:'Registered private key',required:true,secret:true,multiline:true}]} as api.CollectionProvider;
beforeEach(()=>{jest.clearAllMocks();jest.mocked(useSchoolQuery).mockReturnValue({data:[{revision_id:'revision-a',status:'active',last_error:'Bank service unavailable',scan_date:'2026-09-15'}],isLoading:false,error:null,refetch} as any);});
test('retrieval requires a reason, keeps errors visible, and refreshes after a truthful queued result',async()=>{
  jest.mocked(api.retrieveBankTransactions).mockRejectedValueOnce(new Error('Account is currently being retrieved')).mockResolvedValueOnce({accepted:true,message:'Bank retrieval queued.'});
  render(<BankRetrievalControl revisionId="revision-a" canWrite/>);
  expect(screen.getByRole('alert')).toHaveTextContent('Bank service unavailable');
  fireEvent.click(screen.getByRole('button',{name:'Retrieve / retry'}));
  expect(screen.getByRole('button',{name:'Queue retrieval'})).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Reason'),{target:{value:'Recover delayed bank deposits'}});
  fireEvent.change(screen.getByLabelText(/Earlier statement date/),{target:{value:'2026-09-15'}});
  fireEvent.click(screen.getByRole('button',{name:'Queue retrieval'}));
  expect(await screen.findByText('Account is currently being retrieved')).toBeVisible();
  expect(api.retrieveBankTransactions).toHaveBeenCalledWith('school-a','revision-a','Recover delayed bank deposits','2026-09-15');
  fireEvent.click(screen.getByRole('button',{name:'Queue retrieval'}));
  expect(await screen.findByText('Bank retrieval queued.')).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(refetch).toHaveBeenCalled();
});
test('read-only finance users see connection health without a mutation control',()=>{
  render(<BankRetrievalControl revisionId="revision-a" canWrite={false}/>);
  expect(screen.getByText('Connection needs attention')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Retrieve / retry'})).not.toBeInTheDocument();
});
test('Accountant enters provider-specific bank credentials once and remains pending activation after testing',async()=>{
  const updated=jest.fn();jest.mocked(api.configureSchoolBank).mockResolvedValue({...row,status:'connecting'});
  const view=render(<BankConnectionControl row={row} provider={provider} onUpdated={updated}/>);
  fireEvent.click(screen.getByRole('button',{name:'Configure bank connection'}));
  expect(screen.getByLabelText('API key')).toHaveAttribute('type','password');
  expect(screen.getByLabelText('Registered private key').tagName).toBe('TEXTAREA');
  fireEvent.change(screen.getByLabelText('API key'),{target:{value:'authorized-key'}});
  fireEvent.change(screen.getByLabelText('Registered private key'),{target:{value:'private-key-material'}});
  fireEvent.click(screen.getByRole('button',{name:'Save connection'}));
  await waitFor(()=>expect(api.configureSchoolBank).toHaveBeenCalledWith('school-a','revision-a',{connection_mode:'bank_api',environment:'sandbox',credentials:{api_key:'authorized-key',private_key:'private-key-material'}}));
  expect(await screen.findByText(/Credentials saved securely/)).toBeVisible();
  expect(screen.queryByDisplayValue('private-key-material')).not.toBeInTheDocument();
  jest.mocked(api.testSchoolBank).mockResolvedValue({...row,status:'ready'});
  view.rerender(<BankConnectionControl row={{...row,status:'connecting'}} provider={provider} onUpdated={updated}/>);
  fireEvent.click(screen.getByRole('button',{name:'Test bank connection'}));
  expect(await screen.findByText(/Super Admin can now complete activation/)).toBeVisible();
  expect(updated).toHaveBeenCalledTimes(2);
});

test('a sandbox-only bank cannot be configured as production from the school form',()=>{
  render(<BankConnectionControl row={row} provider={{...provider,code:'coop',name:'Co-op',bank_api_environments:['sandbox']}} onUpdated={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Configure bank connection'}));
  expect(screen.getByLabelText('Environment')).toHaveValue('sandbox');
  expect(screen.queryByRole('option',{name:'Production'})).not.toBeInTheDocument();
});
