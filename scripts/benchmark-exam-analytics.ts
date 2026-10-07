/** Local deterministic load probe; never reads or seeds school records. */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {buildAcademicIntelligence,type SubjectEvidence} from '../apps/api/src/modules/exams/analytics/analytics-engine';
import {evidence} from '../apps/api/src/modules/exams/analytics/testing/evidence.fixture';
const studentCount=Number(process.argv[2]??1000);
if(!Number.isInteger(studentCount)||studentCount<1||studentCount>10000)throw new Error('Choose 1–10000 fixture learners.');
const template=evidence(),rows:SubjectEvidence[]=[];
for(let exam=0;exam<6;exam++)for(let student=0;student<studentCount;student++)for(let subject=0;subject<8;subject++)rows.push({...template,
  student_id:`s${student}`,student_name:`QA learner ${student}`,exam_series_id:`e${exam}`,exam_date:`2026-0${exam+1}-01`,exam_name:`Exam ${exam}`,
  class_section_id:`c${student%12}`,class_name:`Class ${student%12}`,subject_id:`subject${subject}`,subject_name:`Subject ${subject}`,
  average:(student+subject+exam)%101});
const start=performance.now();
const data=buildAcademicIntelligence(rows,{level:'school',role:'exams_manager',actor_user_id:'qa'},{page:1,page_size:25,analytics_mode:'library'},['school']);
const elapsed=performance.now()-start;
const secondStart=performance.now();
const next=buildAcademicIntelligence(rows,{level:'school',role:'exams_manager',actor_user_id:'qa'},{page:1,page_size:25,analytics_mode:'library',analytic_ids:'student-profiles'},['school']);
const viewChange=performance.now()-secondStart;
assert.equal(next.library!.items[0].total,studentCount);
assert.equal(data.performance.learners_examined,studentCount);assert.equal(data.library!.items.length,6);assert.ok(data.library!.items.every(i=>i.rows.length<=25));
console.log(JSON.stringify({fixture_learners:studentCount,subject_results:rows.length,cycles:6,analytics:data.library!.catalog.length,calculation_ms:Math.round(elapsed),view_change_ms:Math.round(viewChange),response_bytes:Buffer.byteLength(JSON.stringify(data)),heap_mb:Math.round(process.memoryUsage().heapUsed/1024/1024)}));
