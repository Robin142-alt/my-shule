type Row = Record<string, any>;
export const day = (value: unknown) => value instanceof Date ? value.toISOString().slice(0,10) : String(value ?? '').slice(0,10);
const validDay = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(day(value)) && !Number.isNaN(Date.parse(day(value))) && new Date(day(value)).toISOString().slice(0,10)===day(value);
export function localDay(now: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function activeLearner(student: Row): boolean {
  const active = new Set(['active','enrolled']);
  return active.has(String(student.status).toLowerCase())
    && (student.student_status == null || active.has(String(student.student_status).toLowerCase()));
}
export function calendarEligibility(year: Row, terms: Row[], years: Row[], timezone: string, now = new Date(), allowScheduled=false): {
  due: boolean; blocker: string | null; nextYear: Row | null; today: string;
} {
  let today: string;
  try { today = localDay(now, timezone); } catch { return {due:false,blocker:'Correct the school timezone before automatic progression.',nextYear:null,today:''}; }
  const result = (blocker: string | null, nextYear: Row | null = null) => ({due:!blocker && today>day(year.ends_on),blocker,nextYear,today});
  if (!(allowScheduled?['draft','active','closed']:['active','closed']).includes(year.status) || year.archived_at) return result('Activate a confirmed academic calendar before progression.');
  if (!validDay(year.starts_on) || !validDay(year.ends_on) || day(year.starts_on)>=day(year.ends_on)) return result('Review the academic year dates; a complete year requires a start and a later end.');
  const periods = terms.filter(item=>!['inactive','archived'].includes(item.status) && !item.archived_at).sort((a,b)=>day(a.starts_on).localeCompare(day(b.starts_on)));
  if (!periods.length) return result('Add the academic year’s term dates before automatic progression.');
  if (periods.some((term,index)=>!validDay(term.starts_on)||!validDay(term.ends_on)||day(term.starts_on)>day(term.ends_on)
    || day(term.starts_on)<day(year.starts_on)||day(term.ends_on)>day(year.ends_on)
    || (index>0 && day(term.starts_on)<=day(periods[index-1].ends_on)))) return result('Correct overlapping or out-of-year term dates before progression.');
  const eligible = years.filter(item=>item.id!==year.id && !['inactive','archived'].includes(item.status) && !item.archived_at);
  if (eligible.some(item=>day(item.starts_on)<=day(year.ends_on)&&day(item.ends_on)>=day(year.starts_on))) return result('Academic years overlap. Correct the calendar before progression.');
  const later = eligible.filter(item=>day(item.starts_on)>day(year.ends_on)).sort((a,b)=>day(a.starts_on).localeCompare(day(b.starts_on)));
  const nextYear = later[0] ?? null;
  if (nextYear && later.slice(1).some(item=>day(item.starts_on)<=day(nextYear.ends_on))) return result('The next academic year overlaps another calendar. Correct its dates.');
  return result(null,nextYear);
}

function grade(section: Row): {model:string;stage:string;number:number;key:string} | null {
  const model = String(section.curriculum_model ?? '').trim().toUpperCase();
  const value = String(section.grade_level ?? '').trim();
  const name = String(section.name ?? '').trim();
  let stage = 'grade'; let number: number | undefined;
  if (['CBC','CBE'].includes(model)) {
    const pre = /^(?:PP|PRE[- ]?PRIMARY)\s*([12])$/i.exec(value) ?? /^(?:PP|PRE[- ]?PRIMARY)\s*([12])$/i.exec(name);
    if (pre) { stage='pp'; number=Number(pre[1]); }
    else number=Number(/^(?:GRADE\s*)?(\d{1,2})$/i.exec(value)?.[1] ?? /^GRADE\s*(\d{1,2})$/i.exec(name)?.[1]);
    if (!number || (stage==='grade' && number>12)) return null;
  } else if (model==='8-4-4') {
    const label = /^(FORM|STANDARD|STD)\s*(\d)$/i.exec(value) ?? /^(FORM|STANDARD|STD)\s*(\d)$/i.exec(name);
    if (!label) return null;
    stage=label[1].toLowerCase()==='form'?'form':'standard'; number=Number(label[2]);
    if (number<1 || number>(stage==='form'?4:8)) return null;
  } else return null;
  return {model,stage,number,key:`${model}:${stage}:${number}`};
}
export function resolveNextClass(source: Row, templates: Row[], configuration: Row = {}, repeating=false): {
  target?: Row; completion?: 'graduated'|'completed'; blocker?: string; nextName?: string;
} {
  const current=grade(source);
  const sameModel = templates.filter(item=>String(item.curriculum_model).toUpperCase()===String(source.curriculum_model).toUpperCase());
  const select=(matches:Row[],nextName:string) => matches.length===1 ? {target:matches[0],nextName}
    : {blocker:matches.length ? `More than one ${nextName} destination is configured. Resolve the duplicate class.` : `Configure the school’s ${nextName} class or confirm its educational endpoint.`,nextName};
  if (!current) {
    const sequence = Array.isArray(configuration.sequence) ? configuration.sequence.map((item:any)=>String(typeof item==='string'?item:item.name??item.label??'')) : [];
    const index=sequence.findIndex((name:string)=>name===source.grade_level||name===source.name);
    if(index<0) return {blocker:'This pathway needs a confirmed class sequence in its curriculum configuration.'};
    if(!repeating && index===sequence.length-1 && configuration.terminal===true) return {completion:'graduated'};
    const name=sequence[index+(repeating?0:1)];
    if(!name) return {blocker:'Confirm the completion point for this educational pathway.'};
    return select(sameModel.filter(item=>item.grade_level===name||item.name===name),name);
  }
  if(!repeating && ((current.stage==='form'&&current.number===4)||(current.stage==='grade'&&current.number===12))) return {completion:'graduated'};
  const explicitEnd=String(configuration.institution_end??'').trim().toLowerCase();
  if(!repeating && explicitEnd && [String(source.name).toLowerCase(),`${current.stage} ${current.number}`].includes(explicitEnd)) return {completion:'completed'};
  let nextStage=current.stage, nextNumber=current.number+(repeating?0:1);
  if(!repeating && current.stage==='pp'&&current.number===2){nextStage='grade';nextNumber=1;}
  if(!repeating && current.stage==='standard'&&current.number===8){nextStage='form';nextNumber=1;}
  const nextName=`${nextStage==='pp'?'PP':nextStage.charAt(0).toUpperCase()+nextStage.slice(1)} ${nextNumber}`;
  return select(sameModel.filter(item=>grade(item)?.key===`${current.model}:${nextStage}:${nextNumber}`),nextName);
}
