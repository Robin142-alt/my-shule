import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LegalAcceptance } from '@/components/legal/legal-acceptance';
import { LegalGate } from '@/components/legal/legal-gate';
import { GuardianAuthorisations } from '@/components/legal/legal-guardian';
import { legalRequest } from '@/lib/legal/client';
import { isLegalProtectedPath } from '@/lib/legal/routing';
import { LEGAL_DOCUMENTS } from '../../../../shared/legal/documents';
import type { LegalStatus } from '@/lib/legal/types';
jest.mock('@/lib/legal/client', () => ({legalRequest:jest.fn()}));
const request = jest.mocked(legalRequest);
const base:LegalStatus={user_id:'user',school_id:'amani',school_name:'Amani School',display_name:'Amina',ready:false,required_documents:LEGAL_DOCUMENTS.filter(d=>d.kind!=='dpa'),documents:[...LEGAL_DOCUMENTS],blockers:[],school_accepted:false,school_authority_verified:false,guardian_required:false,dpa_active:false,incorporated_documents:[],guardian_children:[],can_verify_school_authority:false,can_verify_guardians:false,statements:{school:'school',guardian:'I authorise my child to use the portal.'},receipts:[]};
beforeEach(()=>{request.mockReset();});
test('starts unchecked, identifies both agreements, and opening a readable dialog never accepts',async()=>{
  render(<LegalAcceptance status={base} onStatus={jest.fn()} onRetry={jest.fn()}/>);
  expect(screen.getByRole('checkbox',{name:/Privacy Policy/})).not.toBeChecked();
  expect(screen.getByRole('checkbox',{name:/Terms of Use/})).not.toBeChecked();
  expect(screen.getByRole('button',{name:'Agree & Continue'})).toBeDisabled();
  const link=screen.getAllByRole('link',{name:/Privacy Policy/})[0];fireEvent.click(link);
  const dialog=screen.getByRole('dialog');expect(within(dialog).getByText(/26\./)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button',{name:'Close dialog'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(request).not.toHaveBeenCalled();
});
test('sends exact affirmative selections, prevents double submission, and preserves a failed save',async()=>{
  request.mockRejectedValueOnce(new Error('Unable to record agreements.'));
  render(<LegalAcceptance status={base} onStatus={jest.fn()} onRetry={jest.fn()}/>);
  fireEvent.click(screen.getByRole('checkbox',{name:/Privacy Policy/}));fireEvent.click(screen.getByRole('checkbox',{name:/Terms of Use/}));
  fireEvent.click(screen.getByRole('button',{name:'Agree & Continue'}));
  expect(screen.getByRole('button',{name:'Saving…'})).toBeDisabled();
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to record');
  expect(screen.getByRole('checkbox',{name:/Privacy Policy/})).toBeChecked();
  expect(request).toHaveBeenCalledWith('accept',{selections:base.required_documents.map(doc=>({document_id:doc.id,checked:true}))});
});
test('a child acknowledgement remains separate from guardian authorisation',async()=>{
  const child={...base,guardian_required:true,blockers:[{code:'GUARDIAN_AUTHORISATION_REQUIRED',message:'Your guardian must authorise access.'}]};
  request.mockResolvedValueOnce({...child,required_documents:[]});
  render(<LegalAcceptance status={child} onStatus={jest.fn()} onRetry={jest.fn()}/>);
  expect(screen.getByText(/does not replace your parent/)).toBeVisible();
  fireEvent.click(screen.getByRole('checkbox',{name:/Privacy Policy/}));fireEvent.click(screen.getByRole('checkbox',{name:/Terms of Use/}));
  fireEvent.click(screen.getByRole('button',{name:'Agree & Continue'}));
  expect(await screen.findByRole('status')).toHaveTextContent('recorded');
  expect(screen.getByRole('button',{name:'Check again'})).toBeEnabled();
});
test('verified parents deliberately authorise linked children through a separate checkbox',async()=>{
  const status={...base,ready:true,required_documents:[],guardian_children:[{student_id:'child-1',name:'Alex',verified:true,authorised:false}]};
  request.mockResolvedValue(status);
  render(<GuardianAuthorisations status={status} onStatus={jest.fn()}/>);
  expect(screen.getByRole('button',{name:'Authorise portal access'})).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Authorise portal access'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('guardian/authorise',expect.objectContaining({student_id:'child-1',checked:true})));
});
test('the application gate stays closed on failure and never renders a protected dashboard early',async()=>{
  request.mockRejectedValueOnce(new Error('Service unavailable')).mockResolvedValueOnce({...base,ready:true,required_documents:[]});
  render(<LegalGate><div>Protected school data</div></LegalGate>);
  expect(screen.queryByText('Protected school data')).not.toBeInTheDocument();
  expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable');
  fireEvent.click(screen.getByRole('button',{name:'Try again'}));
  expect(await screen.findByText('Protected school data')).toBeInTheDocument();
});
test('all public, legal, login, invitation and password routes remain available',()=>{
  for(const path of ['/','/app','/parent-portal','/school-portal','/privacy','/terms','/legal/accept','/legal-assets/MyShule_School_DPA_Contract_v2.0.pdf','/invite/accept','/parent/login','/internal/school/new-password']) expect(isLegalProtectedPath(path)).toBe(false);
  for(const path of ['/school/principal','/dashboard/teacher/exams','/internal/portal/attendance','/portal/parent','/student','/superadmin/schools','/library','/school/teacher/students/name.pdf']) expect(isLegalProtectedPath(path)).toBe(true);
});
