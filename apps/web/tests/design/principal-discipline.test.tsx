import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PrincipalDisciplineWorkspace } from '@/components/school/principal-dashboard/discipline-workspace';
const request = jest.fn(); const refetch = jest.fn(); let canWrite = true;
const incident = { id:'case-1', incident_number:'DIS-1', title:'Playground incident', student_id:'learner', student_name:'Test Learner', admission_number:'ADM-42', class_label:'Grade 8', category_name:'Conduct', severity:'medium', status:'reported', occurred_at:'2026-11-02T07:00:00Z', description:'Recorded details', assigned_staff_name:'Duty teacher' };
jest.mock('@/components/providers/permission-context', () => ({usePermissions:()=>({hasPermission:(permission:string)=>permission.endsWith(':read') || canWrite})}));
jest.mock('@/components/school/principal-dashboard/verified-tenant-api',()=>({useVerifiedPrincipalDashboardApi:()=>request}));
jest.mock('@/components/common/learner-picker',()=>({LearnerPicker:({onChange}:any)=><button type="button" onClick={()=>onChange({id:'learner', name:'Test Learner', admissionNumber:'ADM-42',classLabel:'Grade 8'})}>Choose matching learner</button>}));
jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:(path:string)=>({data:
  !path ? undefined :
  path?.includes('incident-options') ? {classes:[{id:'class', label:'Grade 8'}], years:[{id:'year',label:'2026'}], terms:[{id:'term',label:'Term 3'}], offense_categories:[{id:'category',label:'Conduct',default_severity:'medium'}]} :
  path?.includes('/profile') ? {academic_enrollment:{class_id:'class',academic_year_id:'year',academic_term_id:'term'}} :
  path==='/discipline/incidents/case-1' ? {incident, actions:[],comments:[],internal_visible:true} :
  path?.startsWith('/discipline/incidents') ? [incident] :
  path?.includes('analytics') ? {open_cases:1,severe_incidents:0,pending_approvals:0,repeat_offender_alerts:0,top_offenses:[]} : {recentIncidents:[]}, refetch})}));
beforeEach(()=>{canWrite=true;request.mockReset().mockResolvedValue({incident});});

test('register exposes learner, admission number, severity, assigned staff and case details',()=>{
  render(<PrincipalDisciplineWorkspace tenantSlug="test-school"/>);
  expect(screen.getByText('ADM-42')).toBeVisible(); expect(screen.getByText('Duty teacher')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Playground incident'}));
  expect(within(screen.getByRole('dialog')).getByText('Recorded details')).toBeVisible();
});
test('reporting uses canonical severity and existing learner academic context',async()=>{
  render(<PrincipalDisciplineWorkspace tenantSlug="test-school"/>);
  fireEvent.click(screen.getByRole('button',{name:'Report Incident'}));
  const dialog=screen.getByRole('dialog',{name:'Report Incident'});
  fireEvent.click(within(dialog).getByText('Choose matching learner'));
  fireEvent.change(within(dialog).getByLabelText('Title'),{target:{value:'Playground incident'}});
  fireEvent.change(within(dialog).getByLabelText('Category'),{target:{value:'category'}});
  fireEvent.change(within(dialog).getByLabelText('Severity'),{target:{value:'medium'}});
  fireEvent.change(within(dialog).getByLabelText('Description'),{target:{value:'Recorded details'}});
  fireEvent.click(within(dialog).getByRole('button',{name:'Save incident'}));
  await waitFor(()=>expect(request).toHaveBeenCalledWith('/discipline/incidents',expect.objectContaining({method:'POST',body:expect.objectContaining({student_id:'learner',class_id:'class',academic_term_id:'term',academic_year_id:'year',offense_category_id:'category',severity:'medium'})})));
});
test('read-only access offers case details without incident or follow-up mutations',()=>{
  canWrite=false;render(<PrincipalDisciplineWorkspace tenantSlug="test-school"/>);
  expect(screen.queryByRole('button',{name:'Report Incident'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Playground incident'}));
  expect(screen.queryByRole('button',{name:'Save follow-up'})).not.toBeInTheDocument();
});
