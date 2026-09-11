import type { SubjectEvidence } from '../analytics-engine';

export function evidence(overrides:Partial<SubjectEvidence>={}):SubjectEvidence {
  return {exam_series_id:'exam-1',exam_name:'Mid term',exam_date:'2026-02-01',academic_term_id:'term-1',academic_year_id:'year-1',term_name:'Term 1',year_name:'2026',
    student_id:'learner-1',student_name:'Amina',admission_number:'A001',subject_id:'math',subject_name:'Mathematics',department_id:'science',department_name:'Science',
    class_section_id:'form-1',class_name:'Form 1',grade_level:'1',stream_id:'blue',stream_name:'Blue',average:75,expected:1,recorded:1,numeric_count:1,absent:0,missing:0,
    explicit_count:0,invalid:0,draft:0,submitted:0,reviewed:0,locked:1,published:0,report_status:'approved',policy_id:'grading-1',reporting_mode:'traditional',
    boundaries:[{label:'A',min:80,max:100,points:12,is_pass:true},{label:'C',min:50,max:79.99,points:6,is_pass:true},{label:'E',min:0,max:49.99,points:1,is_pass:false}],
    teachers:[{id:'teacher-1',name:'Ms Teacher'}],interventions:[],...overrides};
}
