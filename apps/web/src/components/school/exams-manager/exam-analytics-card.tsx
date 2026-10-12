"use client";

import { ArrowDownToLine, ArrowUpRight, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticRow, AnalyticValue, LibraryAnalytic } from '../../../../../api/src/modules/exams/analytics/analytics-library-contract';
import styles from './exam-analytics.module.css';

export const analyticValue=(value:AnalyticValue|undefined)=>value===null||value===undefined?'—':typeof value==='number'?new Intl.NumberFormat('en-KE',{maximumFractionDigits:2}).format(value):value;
export function ExamAnalyticsCard({item,onExport,onDrill,onPage,disabled}:{item:LibraryAnalytic;onExport:(id:string)=>void;onDrill:(filters:Record<string,string>)=>void;onPage:(page:number)=>void;disabled:boolean}) {
  const [expanded,setExpanded]=useState(false);
  const numeric=item.value_column??1;
  const values=item.rows.map((r,index)=>({name:String(r.values[0]??''),value:typeof r.values[numeric]==='number'?r.values[numeric]:null,index}));
  const max=Math.max(1,...values.map(v=>Math.abs(Number(v.value??0))));
  const showChart=item.kind==='line'&&values.some(v=>v.value!==null);
  const showBars=item.kind==='bar'&&values.some(v=>v.value!==null);
  const hasVisual=showChart||showBars||item.id==='focused-comparison';
  const comparison=item.id==='focused-comparison';
  const hasNegative=values.some(v=>typeof v.value==='number'&&v.value<0);
  const [allBars,setAllBars]=useState(false);
  const first=(item.page-1)*item.page_size+1;
  const comparisonMetric=(r:AnalyticRow)=><div className={styles.comparisonMetric} key={String(r.values[0])}><h4>{r.values[0]}</h4><div><span><small>{item.rows[0]?.values[1]}</small><strong>{analyticValue(r.values[1])}</strong></span><span><small>{item.rows[0]?.values[2]}</small><strong>{analyticValue(r.values[2])}</strong></span></div>{typeof r.values[3]==='number'&&<p className={styles.comparisonDelta}>{r.values[3]>0?'+':''}{analyticValue(r.values[3])} points difference</p>}</div>;
  const keyComparisons=new Set(['Average %','Pass rate %','Learners with results','Mean grade']);
  return <article className={`${styles.card} ${item.kind==='metric'?styles.metric:''}`} aria-labelledby={`analytic-${item.id}`}>
    <header className={styles.cardHeader}><div><p className={styles.eyebrow}>{item.kind==='metric'?'At a glance':item.category}</p><h3 id={`analytic-${item.id}`}>{item.title}</h3></div><div className={styles.cardActions}>
      <button disabled={disabled} onClick={()=>onExport(item.id)} aria-label={`Download ${item.title}`} title="Download PDF or CSV"><ArrowDownToLine size={16}/><span>Download</span></button>
      <button disabled={disabled} onClick={()=>onExport(item.id)} aria-label={`Print ${item.title}`} title="Print a formatted report"><Printer size={16}/></button>
    </div></header>
    {item.kind==='metric'?<><strong className={styles.metricValue}>{analyticValue(item.rows[0]?.values[1])}<small>{item.rows[0]?.values[1]!=null?item.rows[0]?.values[2]:''}</small></strong>{item.rows[0]?.values[1]==null&&<p className={styles.muted}>{item.id==='matched-growth'?'Choose two exams with matching learner results.':item.id==='mean-grade'?'A single grading scale is needed.':item.id.includes('rate')?'No graded results in this selection.':'No approved scores in this selection.'}</p>}<details className={styles.method}><summary>How this is calculated</summary><p>{item.note}</p></details></>:<>
      <p className={styles.question}>{item.question}</p>
      {!item.rows.length?<div className={styles.empty}><strong>{item.empty_title??'No results for this selection'}</strong><p>{item.empty_message??'Choose another exam or clear a filter to explore available results.'}</p></div>:<>
        {comparison&&<><div className={styles.comparisonGrid}>{item.rows.slice(1).filter(r=>keyComparisons.has(String(r.values[0]))).map(comparisonMetric)}</div><details className={styles.method}><summary>Compare median, highest, lowest and spread</summary><div className={styles.comparisonGrid}>{item.rows.slice(1).filter(r=>!keyComparisons.has(String(r.values[0]))).map(comparisonMetric)}</div></details></>}
        {showChart&&<div className={styles.chart} role="img" aria-label={`${item.title}: ${item.columns[numeric]}. Exact values appear in the table below.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={values} margin={{top:15,right:16,left:-16,bottom:5}}><defs><linearGradient id={`fill-${item.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0c8c81" stopOpacity={0.22}/><stop offset="100%" stopColor="#0c8c81" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid vertical={false} stroke="#e5eeec"/><XAxis dataKey="name" tick={{fontSize:11}} tickLine={false} axisLine={false} minTickGap={40}/><YAxis tick={{fontSize:11}} tickLine={false} axisLine={false}/><Tooltip formatter={v=>[v===null?'No recorded score':String(v),item.columns[numeric]]}/><Area dataKey="value" type="linear" dot={{r:3,fill:'#0c8c81',stroke:'#fff',strokeWidth:2}} activeDot={{r:5}} stroke="#0c8c81" strokeWidth={2.5} fill={`url(#fill-${item.id})`} connectNulls={false} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div>}
        {showBars&&<div className={styles.bars} aria-label={`${item.title} chart`}><p className={styles.chartLabel}>{item.columns[numeric]}{hasNegative?' · zero at centre':''}</p>{(allBars?values:values.slice(0,10)).map(v=><div className={styles.barRow} key={v.index}><span title={v.name}>{v.name}</span><div className={hasNegative?styles.signedTrack:undefined}><i style={{width:`${Math.abs(Number(v.value??0))/max*(hasNegative?50:100)}%`,marginLeft:hasNegative?`${Number(v.value)<0?50-Math.abs(Number(v.value))/max*50:50}%`:undefined,background:Number(v.value)<0?'#c26a50':undefined}}/></div><strong>{analyticValue(v.value as AnalyticValue)}</strong></div>)}{values.length>10&&<button className={styles.textButton} onClick={()=>setAllBars(!allBars)}>{allBars?'Show first 10':`Show all ${values.length} on this page`}</button>}</div>}
        {item.kind==='insight'?<div className={styles.insights}>{(expanded?item.rows:item.rows.slice(0,4)).map((r,i)=><div key={i}><span>{r.values[0]}</span><p>{r.values[1]}</p>{r.drill&&Object.values(r.drill).some(Boolean)&&<button disabled={disabled} className={styles.textButton} onClick={()=>onDrill(r.drill!)}>Explore evidence <ArrowUpRight size={14}/></button>}</div>)}{item.rows.length>4&&<button className={styles.textButton} onClick={()=>setExpanded(!expanded)}>{expanded?'Show key observations':`Show all ${item.rows.length} observations`}</button>}</div>:<>
          {hasVisual&&<button className={styles.textButton} onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?'Hide data table':`View data table (${item.total} rows)`}</button>}
          {(!hasVisual||expanded)&&<div className={styles.tableWrap}><table><caption className={styles.srOnly}>{item.title} — {item.total} rows</caption><thead><tr>{item.columns.map((c,i)=><th key={i} scope="col">{c}</th>)}{item.rows.some(r=>r.drill)&&<th scope="col">Explore</th>}</tr></thead><tbody>{item.rows.map((r,i)=><tr key={i}>{r.values.map((v,j)=><td key={j} data-label={item.columns[j]} title={v===null?'No comparable recorded value. See calculation details.':undefined} style={item.kind==='matrix'&&j===numeric&&typeof v==='number'?{backgroundColor:`rgba(12,140,129,${0.04+Math.min(Math.max(v,0),100)/100*0.22})`}:undefined}>{analyticValue(v)}</td>)}{item.rows.some(r=>r.drill)&&<td data-label="Explore">{r.drill&&<button className={styles.textButton} disabled={disabled} onClick={()=>onDrill(r.drill!)} aria-label={`Explore ${r.values[0]}`}>Explore <ArrowUpRight size={14}/></button>}</td>}</tr>)}</tbody></table>{item.rows.some(r=>r.values.includes(null))&&<p className={styles.muted}>— No recorded or comparable value. See calculation details.</p>}</div>}
        </>}
      </>}
      {item.total>item.page_size&&<div className={styles.pagination}><span>{first}–{Math.min(item.total,first+item.rows.length-1)} of {item.total} · charts show this page</span><div><button disabled={disabled||item.page===1} aria-label="Previous analytics page" onClick={()=>onPage(item.page-1)}><ChevronLeft size={18}/></button><button disabled={disabled||item.page*item.page_size>=item.total} aria-label="Next analytics page" onClick={()=>onPage(item.page+1)}><ChevronRight size={18}/></button></div></div>}
      <details className={styles.method}><summary>Calculation details</summary><p>{item.note}</p></details>
    </>}
  </article>;
}
