import type { AnalyticsPrintReport, AnalyticsReportResponse } from '../../../../api/src/modules/exams/analytics/analytics-report-contract';
export type { AnalyticsPrintReport, AnalyticsReportResponse, AnalyticsReportSection } from '../../../../api/src/modules/exams/analytics/analytics-report-contract';

export function isAnalyticsReportResponse(value:unknown):value is AnalyticsReportResponse {
  if(!value||typeof value!=='object')return false;
  const response=value as AnalyticsReportResponse,report=response.report;
  const strings=(items:unknown):items is string[]=>Array.isArray(items)&&items.every(item=>typeof item==='string');
  const labels=(items:unknown)=>Array.isArray(items)&&items.every(item=>item&&typeof item.label==='string'&&typeof item.value==='string');
  return Boolean(report&&typeof response.filename==='string'&&typeof response.pdf_base64==='string'
    &&['document_number','title','school_name','generated_at','generated_by','scope','exam','period'].every(key=>typeof report[key as keyof AnalyticsPrintReport]==='string')
    &&Number.isFinite(Date.parse(report.generated_at))&&labels(report.filters)&&labels(report.metrics)&&strings(report.notes)
    &&[report.school_address,report.school_motto].every(item=>item===null||typeof item==='string')
    &&Array.isArray(report.sections)&&report.sections.every(section=>section&&typeof section.title==='string'&&strings(section.headers)
      &&Array.isArray(section.rows)&&section.rows.every(row=>strings(row)&&row.length===section.headers.length)&&(section.note===undefined||typeof section.note==='string')));
}

const escape = (value:string) => value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function academicReportHtml(report:AnalyticsPrintReport):string {
  const h=escape;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${h(report.title)}</title><style>
  @page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;background:white;color:#18263b;font:12px/1.55 Arial,sans-serif}main{max-width:794px;margin:auto;padding:30px}h1{font-size:26px;line-height:1.2;margin:20px 0 8px}h2{font-size:16px;margin:22px 0 8px;break-after:avoid}p{margin:5px 0}.school{font-size:19px;font-weight:bold}.muted{color:#526173}.meta{font-size:10px;overflow-wrap:anywhere}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;border-block:1px solid #dbe2eb;margin:18px 0;padding:14px 0}.metrics strong{display:block;font-size:17px}.filters{display:flex;flex-wrap:wrap;gap:5px 16px}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:11px}th,td{padding:9px 7px;text-align:left;vertical-align:top;border-bottom:1px solid #dbe2eb;overflow-wrap:anywhere;white-space:pre-line}th{background:#e9eff6;font-weight:bold}thead{display:table-header-group}tr{break-inside:avoid}th:first-child{width:29%}.note{font-size:10px;color:#526173}.notes{border-top:1px solid #dbe2eb;margin-top:24px;padding-top:12px}footer{margin-top:20px;font-size:9px;color:#526173;overflow-wrap:anywhere}@media(max-width:550px){main{padding:16px}.metrics{grid-template-columns:repeat(2,1fr)}table{font-size:10px}th,td{padding:7px 4px}}@media print{main{max-width:none;padding:0}.metrics{grid-template-columns:repeat(4,1fr)}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}a{color:inherit;text-decoration:none}}
  </style></head><body><main><header><div class="school">${h(report.school_name)}</div>${report.school_motto?`<p class="muted">${h(report.school_motto)}</p>`:''}${report.school_address?`<p class="muted">${h(report.school_address)}</p>`:''}<h1>${h(report.title)}</h1><p><strong>${h(report.exam)}</strong> / ${h(report.period)}</p><p>Scope: ${h(report.scope)}</p><p class="meta">Document ${h(report.document_number)}<br>Generated ${h(new Date(report.generated_at).toLocaleString('en-GB',{timeZone:'Africa/Nairobi'}))} EAT / By ${h(report.generated_by)}</p></header>
  <div class="filters">${report.filters.map(filter=>`<span>${h(filter.label)}: <strong>${h(filter.value)}</strong></span>`).join('')}</div>
  <div class="metrics">${report.metrics.map(metric=>`<div><span class="muted">${h(metric.label)}</span><strong>${h(metric.value)}</strong></div>`).join('')}</div>
  ${report.sections.map(section=>`<section><h2>${h(section.title)}</h2>${section.note?`<p class="note">${h(section.note)}</p>`:''}${section.rows.length?`<table><thead><tr>${section.headers.map(header=>`<th scope="col">${h(header)}</th>`).join('')}</tr></thead><tbody>${section.rows.map(row=>`<tr>${row.map(cell=>`<td>${h(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'<p class="muted">No records in this selection.</p>'}</section>`).join('')}
  <section class="notes"><h2>How to read this report</h2>${report.notes.map(note=>`<p class="note">${h(note)}</p>`).join('')}</section><footer>${h(report.document_number)} / ${h(report.school_name)} / Internal academic review</footer></main></body></html>`;
}
