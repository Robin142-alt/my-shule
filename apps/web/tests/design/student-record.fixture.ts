export const record = {
  student: { id: 'student-1', admission_number: 'ADM-42', first_name: 'Actual', middle_name: null, last_name: 'Learner',
    date_of_birth: null, gender: 'female', status: 'active', nationality: 'Kenyan', birth_certificate_number: null,
    upi_number: null, nemis_number: null, updated_at: '2026-10-19 12:00:00.123456+00',
    class_section_id: 'class-1', stream_id: null, academic_year_id: 'year', class_name: 'Grade 7', stream_name: null,
    curriculum: 'CBC', guardian_name: null, guardian_relationship: null, guardian_phone: null, guardian_linked_students: 0 },
  subjects: [{ id: 'mat', code: 'MAT', name: 'Mathematics', is_compulsory: true }, { id: 'sci', code: 'SCI', name: 'Science', is_compulsory: false }], can_edit: true,
};
export const options = {
  academic_years: [{id:'year',name:'2026'}], classes: [{id:'class-1', name:'Grade 7', academic_year_id:'year', curriculum:'CBC'}, {id:'class-2', name:'Grade 7 West', academic_year_id:'year', curriculum:'CBC'}],
  streams: [], subjects: record.subjects, class_subject_assignments: [
    {class_section_id:'class-1',subject_id:'mat',is_compulsory:true}, {class_section_id:'class-1',subject_id:'sci',is_compulsory:false},
    {class_section_id:'class-2',subject_id:'mat',is_compulsory:true}],
};