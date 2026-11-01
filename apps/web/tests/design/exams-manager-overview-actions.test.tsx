import {fireEvent, screen} from '@testing-library/react';
import {OverviewWorkspace} from '@/components/school/exams-manager/overview-workspace';
import {useSchoolQuery} from '@/lib/data/school-hooks';
import {useOptionalSchoolTenantId} from '@/lib/data/school-tenant-scope';
import {ExamsMarksWorkspace} from '@/components/school/teacher-dashboard/exams-marks-workspace';
import {renderWithProviders} from './test-utils';

jest.mock('@/lib/data/school-hooks',()=>({useSchoolQuery:jest.fn()}));
jest.mock('@/lib/data/school-tenant-scope',()=>({useOptionalSchoolTenantId:jest.fn()}));
jest.mock('@/components/school/teacher-dashboard/exams-marks-workspace',()=>({ExamsMarksWorkspace:jest.fn(()=> <p>Exact markbook editor</p>)}));
jest.mock('@/components/school/exams-manager/api-client',()=>({submitAssistedMarkbook:jest.fn(),lockMarksEntry:jest.fn()}));

it('opens the exact published markbook from the existing overview panel and clears it when changing schools',()=>{
  jest.mocked(useOptionalSchoolTenantId).mockReturnValue('school-a');
  jest.mocked(useSchoolQuery).mockImplementation(path=>({data:path?.endsWith('teacher-mark-progress')?{entries:[{
    id:'sheet',window_id:'window',exam_id:'exam',exam_name:'End term',class_section_id:'grade-10',class_name:'Grade 10',
    subject_id:'math',subject:'Mathematics',assessment_id:'paper',paper:'Paper 1',teacher_id:null,teacher:'Unassigned',
    stream_id:'blue',stream:'Blue',total_students:1,entered:1,recorded:1,submitted:1,missing:0,
    submission_state:'submitted',status:'Submitted',window_closed:true,deadline:'2026-01-01',overdue:false,
  }]}:{metrics:{},recent_exams:[]},refetch:jest.fn(),isLoading:false,error:null}) as never);
  const view=renderWithProviders(<OverviewWorkspace onNavigate={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'All sheets'}));
  fireEvent.click(screen.getByRole('button',{name:'Enter / Edit Marks'}));
  expect(ExamsMarksWorkspace).toHaveBeenCalledWith(expect.objectContaining({assistance:expect.objectContaining({
    teacherUserId:null,examSeriesId:'exam',classSectionId:'grade-10',subjectId:'math',assessmentId:'paper',windowId:'window',streamIds:['blue'],
  })}),undefined);
  jest.mocked(useOptionalSchoolTenantId).mockReturnValue('school-b');
  view.rerender(<OverviewWorkspace onNavigate={jest.fn()}/>);
  expect(screen.queryByText('Exact markbook editor')).not.toBeInTheDocument();
});
