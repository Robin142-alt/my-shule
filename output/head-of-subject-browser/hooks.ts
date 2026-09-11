
import {useState} from 'react';
import {buildAcademicIntelligence} from "C:/Users/user/Desktop/PROJECTS/Shule hub/tmp/head-of-subject-role/apps/api/src/modules/exams/analytics/analytics-engine";
import {evidence} from "C:/Users/user/Desktop/PROJECTS/Shule hub/tmp/head-of-subject-role/apps/api/src/modules/exams/analytics/testing/evidence.fixture";
export function useSchoolQuery(url:string){
  const scenario=new URLSearchParams(location.search).get('scenario');
  const params=Object.fromEntries(new URLSearchParams(url.split('?')[1]??''));
  const data=url==='/academics/my-subject-appointments' ? (scenario==='empty'?[]:[{id:'qa-ap',subject_name:'Mathematics',status:'active',appointment_type:'acting',effective_from:'2026-01-01',effective_to:'2026-12-31',academic_year_name:'2026'}]) : {...buildAcademicIntelligence([evidence({average:45}),evidence({student_id:'learner-2',student_name:'Brian Otieno',average:85})],{level:'subject',role:'head_of_subject',actor_user_id:'hos'},{page:1,page_size:25,...params},['subject','assignment']),capabilities:{can_start_intervention:true}};
  return {data,isLoading:scenario==='loading',error:scenario==='error'?new Error('Test service unavailable'):null,refetch:()=>{},isFetching:false};
}
export function useSchoolMutation(endpoint:string){const [isPending,setPending]=useState(false);return {isPending,mutateAsync:async(body)=>{window.__endpoint=endpoint;setPending(true);try{const response=await fetch('/qa-report',{method:'POST',body:JSON.stringify(body)});if(!response.ok)throw new Error('QA report failed');return response.json();}finally{setPending(false);}}};}
