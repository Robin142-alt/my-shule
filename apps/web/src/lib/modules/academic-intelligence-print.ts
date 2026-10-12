import type { AnalyticsPrintReport, AnalyticsReportResponse } from '../../../../api/src/modules/exams/analytics/analytics-report-contract';
import { analyticsReportMethods } from '../../../../api/src/modules/exams/analytics/analytics-report-contract';
export type { AnalyticsPrintReport, AnalyticsReportResponse, AnalyticsReportSection } from '../../../../api/src/modules/exams/analytics/analytics-report-contract';
export { ANALYTICS_REPORT_SECTIONS, ANALYTICS_REPORT_LABELS, ANALYTICS_VIEW_REPORT } from '../../../../api/src/modules/exams/analytics/analytics-report-contract';

export function isAnalyticsReportResponse(value:unknown):value is AnalyticsReportResponse {
  if(!value||typeof value!=='object')return false;
  const response=value as AnalyticsReportResponse,report=response.report;
  const strings=(items:unknown):items is string[]=>Array.isArray(items)&&items.every(item=>typeof item==='string');
  const labels=(items:unknown)=>Array.isArray(items)&&items.every(item=>item&&typeof item.label==='string'&&typeof item.value==='string');
  const chartValid=(chart:AnalyticsPrintReport['sections'][number]['chart'])=>chart===undefined||Boolean(chart&&['bar','line'].includes(chart.kind)&&typeof chart.label==='string'&&Number.isInteger(chart.total)
    &&Array.isArray(chart.points)&&chart.points.every(p=>p&&typeof p.label==='string'&&(p.value===null||typeof p.value==='number'&&Number.isFinite(p.value))));
  return Boolean(report&&typeof response.filename==='string'&&typeof response.pdf_base64==='string'
    &&['document_number','title','school_name','generated_at','generated_by','scope','exam','period'].every(key=>typeof report[key as keyof AnalyticsPrintReport]==='string')
    &&Number.isFinite(Date.parse(report.generated_at))&&labels(report.filters)&&labels(report.metrics)&&strings(report.notes)
    &&[report.school_address,report.school_motto].every(item=>item===null||typeof item==='string')
    &&Array.isArray(report.sections)&&report.sections.every(section=>section&&typeof section.title==='string'&&strings(section.headers)
      &&Array.isArray(section.rows)&&section.rows.every(row=>strings(row)&&row.length===section.headers.length)&&(section.note===undefined||typeof section.note==='string')
      &&(section.empty_message===undefined||typeof section.empty_message==='string')
      &&(section.metric===undefined||Boolean(section.metric&&typeof section.metric.value==='string'&&typeof section.metric.unit==='string'))
      &&chartValid(section.chart)));
}

const escape = (value:string) => value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
function reportChartHtml(chart:NonNullable<AnalyticsPrintReport['sections'][number]['chart']>):string {
  const points=chart.points,h=escape;
  if(!points.some(p=>p.value!==null))return '';
  const values=points.map(p=>p.value).filter((v):v is number=>v!==null);
  let content='';let height=220;
  if(chart.kind==='bar'){
    height=points.length*29+12;const max=Math.max(1,...values.map(Math.abs)),negative=values.some(v=>v<0),zero=negative?380:180;
    content=points.map((p,i)=>{const width=Math.abs(p.value??0)/max*(negative?200:400),y=i*29+12;
      return `<text x="0" y="${y+3}" fill="#47685f">${h(p.label.length>25?p.label.slice(0,24)+'…':p.label)}</text><rect x="180" y="${y-6}" width="400" height="9" rx="3" fill="#edf3f0"/>${negative?`<path d="M380 ${y-9}v16" stroke="#98b8ac"/>`:''}<rect x="${(p.value??0)<0?zero-width:zero}" y="${y-6}" width="${width}" height="9" fill="${(p.value??0)<0?'#b16953':'#168f80'}"/><text x="635" y="${y+3}" text-anchor="end">${p.value===null?'—':p.value}</text>`;}).join('');
  }else{
    const low=Math.min(0,...values),high=Math.max(1,...values),x=(i:number)=>40+(points.length===1?285:i/(points.length-1)*570),y=(v:number)=>170-(v-low)/(high-low)*145;
    content=Array.from({length:5},(_,i)=>{const value=low+(high-low)*i/4,yy=y(value);return `<path d="M40 ${yy}H610" stroke="#e0eae5"/><text x="30" y="${yy+4}" text-anchor="end" fill="#59756d">${Math.round(value*10)/10}</text>`;}).join('');
    points.forEach((p,i)=>{if(p.value===null)return;if(i&&points[i-1].value!==null)content+=`<path d="M${x(i-1)} ${y(points[i-1].value!)}L${x(i)} ${y(p.value)}" stroke="#168f80" stroke-width="2" fill="none"/>`;content+=`<circle cx="${x(i)}" cy="${y(p.value)}" r="3" fill="#168f80"><title>${h(p.label)}: ${p.value}</title></circle>`;});
    content+=`<text x="40" y="196">${h(points[0].label)}</text><text x="610" y="196" text-anchor="end">${h(points.at(-1)!.label)}</text>`;
  }
  return `<figure class="chart"><figcaption>${h(chart.label)}</figcaption><svg role="img" aria-label="${h(chart.label)}" viewBox="0 0 640 ${height}" xmlns="http://www.w3.org/2000/svg">${content}</svg><p class="note">${points.length<chart.total?`Chart shows the first ${points.length} of ${chart.total} results. `:''}All exact values appear below.</p></figure>`;
}
export function academicReportHtml(report:AnalyticsPrintReport):string {
  const h=escape;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(report.title)}</title><style>
  @page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;background:white;color:#18263b;font:12px/1.55 Arial,sans-serif}main{max-width:794px;margin:auto;padding:30px}h1{font-size:26px;line-height:1.2;margin:20px 0 8px}h2{font-size:16px;margin:22px 0 8px;break-after:avoid}p{margin:5px 0}.school{font-size:19px;font-weight:bold}.muted{color:#526173}.meta{font-size:10px;overflow-wrap:anywhere}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-block:1px solid #dbe2eb;margin:18px 0;padding:14px 0}.metrics strong{display:block;font-size:17px}.filters{display:flex;flex-wrap:wrap;gap:5px 16px}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px}th,td{padding:9px 7px;text-align:left;vertical-align:top;border-bottom:1px solid #dbe2eb;overflow-wrap:anywhere;white-space:pre-line}th{background:#e9eff6;font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}th:first-child{width:29%}.note{font-size:10px;color:#526173}.notes{border-top:1px solid #dbe2eb;margin-top:24px;padding-top:12px}footer{margin-top:20px;font-size:9px;color:#526173;overflow-wrap:anywhere}@media(max-width:550px){main{padding:16px}.metrics{grid-template-columns:repeat(2,1fr)}table{font-size:10px}th,td{padding:7px 4px}}@media print{main{max-width:none;padding:0}.metrics{grid-template-columns:repeat(4,1fr)}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}a{color:inherit;text-decoration:none}}
  header{border-top:4px solid #087e75;padding-top:18px}h1,h2,.school{color:#193e38}.metrics:empty{display:none}.filters{margin:16px 0;font-size:11px}.metric{background:#edf6f2;border-radius:8px;padding:16px 20px;margin:12px 0;break-inside:avoid}.metric strong{font-size:30px;color:#155e57;display:block}.metric span{color:#52796f}tbody tr:nth-child(odd){background:#f8faf9}th{background:#e5f0eb}.chart{margin:16px 0 20px;break-inside:avoid}.chart svg{display:block;width:100%;font:11px Arial,sans-serif;fill:#365752}.chart figcaption{font-size:11px;font-weight:bold;color:#52796f}.notes h3{font-size:12px;margin-bottom:5px;break-after:avoid}.notes p{break-inside:avoid}
  </style></head><body><main><header><div class="school">${h(report.school_name)}</div>${report.school_motto?`<p class="muted">${h(report.school_motto)}</p>`:''}${report.school_address?`<p class="muted">${h(report.school_address)}</p>`:''}<h1>${h(report.title)}</h1><p><strong>${h(report.exam)}</strong> / ${h(report.period)}</p><p>Scope: ${h(report.scope)}</p><p class="meta">Document ${h(report.document_number)}<br>Generated ${h(new Date(report.generated_at).toLocaleString('en-GB',{timeZone:'Africa/Nairobi'}))} EAT / By ${h(report.generated_by)}</p></header>
  <div class="filters">${report.filters.map(filter=>`<span>${h(filter.label)}: <strong>${h(filter.value)}</strong></span>`).join('')}</div>
  <div class="metrics">${report.metrics.map(metric=>`<div><span class="muted">${h(metric.label)}</span><strong>${h(metric.value)}</strong></div>`).join('')}</div>
  ${report.sections.map(section=>`<section>${report.sections.length>1||section.title!==report.title?`<h2>${h(section.title)}</h2>`:''}${section.metric?`<div class="metric"><strong>${h(section.metric.value)}</strong><span>${h(section.metric.unit)}</span></div>`:`${section.chart?reportChartHtml(section.chart):''}${section.rows.length?`<table><thead><tr>${section.headers.map(header=>`<th scope="col">${h(header)}</th>`).join('')}</tr></thead><tbody>${section.rows.map(row=>`<tr>${row.map(cell=>`<td>${h(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:`<p class="muted">${h(section.empty_message??'No results for this selection. Choose another exam or clear a filter.')}</p>`}`}</section>`).join('')}
  <section class="notes"><h2>Calculation details</h2>${analyticsReportMethods(report).map(section=>`<h3>${h(section.title)}</h3><p class="note">${h(section.note)}</p>`).join('')}<h2>How to read this report</h2>${report.notes.map(note=>`<p class="note">${h(note)}</p>`).join('')}</section><footer>${h(report.document_number)} / ${h(report.school_name)} / Internal academic review</footer></main></body></html>`;
}
