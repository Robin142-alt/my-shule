"use client";

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useSchoolMutation } from '@/lib/data/school-hooks';
import { academicReportHtml, isAnalyticsReportResponse, type AnalyticsReportResponse } from '@/lib/modules/academic-intelligence-print';
import type { AnalyticsLibrary } from '../../../../../api/src/modules/exams/analytics/analytics-library-contract';
import styles from './exam-analytics.module.css';

export function ExamAnalyticsExport({ids,catalog,filters,onClose}:{ids:string[];catalog:AnalyticsLibrary['catalog'];filters:Record<string,string>;onClose:()=>void}) {
  const [chosen,setChosen]=useState(ids);
  const [result,setResult]=useState<AnalyticsReportResponse|null>(null);
  const [urls,setUrls]=useState({pdf:'',csv:''});
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [search,setSearch]=useState('');
  const [format,setFormat]=useState<'both'|'csv'>('both');
  const frame=useRef<HTMLIFrameElement>(null);
  const objectUrls=useRef<string[]>([]);
  const mutation=useSchoolMutation<AnalyticsReportResponse,{section:'library';filters:Record<string,string>;format:'both'|'csv'}>('/exams/analytics/reports','POST',{queueNetworkFailures:false,invalidateSchoolQueries:false});
  useEffect(()=>()=>objectUrls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
  function clear() {setResult(null);setReady(false);setError('');objectUrls.current.forEach(url=>URL.revokeObjectURL(url));objectUrls.current=[];setUrls({pdf:'',csv:''});}
  function choose(next:string[]) {setChosen(next);clear();}
  async function prepare() {
    if(!chosen.length||mutation.isPending)return;
    clear();
    try {
      const response=await mutation.mutateAsync({section:'library',format,filters:{...filters,analytics_mode:'library',analytic_ids:chosen.join(','),analytic_page:'1'}});
      if(!isAnalyticsReportResponse(response)||!response.csv_base64||!response.csv_filename)throw new Error('The report service returned an incomplete document. Please retry.');
      const bytes=(base64:string)=>Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
      const pdf=bytes(response.pdf_base64);
      if(format!=='csv'&&String.fromCharCode(...pdf.slice(0,5))!=='%PDF-')throw new Error('The PDF could not be prepared. Please retry.');
      const next={pdf:format==='csv'?'':URL.createObjectURL(new Blob([pdf],{type:'application/pdf'})),csv:URL.createObjectURL(new Blob([bytes(response.csv_base64)],{type:'text/csv;charset=utf-8'}))};
      objectUrls.current=Object.values(next).filter(Boolean);setUrls(next);setResult(response);
    }catch(reason){setError(reason instanceof Error?reason.message:'Report generation failed. Please retry.');}
  }
  return <Modal open title="Download & print analytics" description="Choose your content. Every report includes full results, school identity, context and methodology." size="xl" mobileFullScreen onClose={()=>{if(!mutation.isPending)onClose();}}>
    <div className={styles.export}>
      <div className={styles.actionRow}><button className={styles.button} disabled={mutation.isPending} onClick={()=>choose(ids)}>Current selection</button><button className={styles.button} disabled={mutation.isPending} onClick={()=>choose(catalog.map(c=>c.id))}>Whole analytics library</button><span>{chosen.length} analytics selected</span></div>
      <details><summary>Choose individual analytics</summary><input className={styles.input} type="search" aria-label="Find report content" placeholder="Find an analytic…" value={search} onChange={e=>setSearch(e.target.value)}/><div className={styles.reportChoices}>{catalog.filter(c=>`${c.title} ${c.category}`.toLowerCase().includes(search.toLowerCase())).map(c=><label key={c.id}><input type="checkbox" disabled={mutation.isPending} checked={chosen.includes(c.id)} onChange={e=>choose(e.target.checked?[...chosen,c.id]:chosen.filter(id=>id!==c.id))}/><span>{c.title}<small>{c.category}</small></span></label>)}</div></details>
      <label>Output<select className={styles.input} aria-label="Export format" disabled={mutation.isPending} value={format} onChange={e=>{setFormat(e.target.value as 'both'|'csv');clear();}}><option value="both">PDF preview + spreadsheet data</option><option value="csv">CSV only — faster for large collections</option></select></label>
      <div className={styles.actionRow}><button className={styles.primaryButton} disabled={mutation.isPending||!chosen.length} onClick={()=>void prepare()}><FileText size={16}/>{mutation.isPending?'Preparing report…':format==='csv'?'Prepare data export':result?'Regenerate preview':'Prepare preview'}</button><p>All matching rows are included, across every page. Charts print as precise, labelled evidence tables.</p></div>
      {error&&<div role="alert" className={styles.error}>{error}<button className={styles.button} onClick={()=>void prepare()}>Retry report</button></div>}
      {mutation.isPending&&<p role="status">Preparing authorized results, PDF and spreadsheet data…</p>}
      {result&&<><div className={styles.actionRow}>
        {urls.pdf&&<a className={styles.primaryButton} href={urls.pdf} download={result.filename}><Download size={16}/>Download PDF</a>}
        <a className={styles.button} href={urls.csv} download={result.csv_filename}><Download size={16}/>Download CSV</a>
        {urls.pdf&&<button className={styles.button} disabled={!ready} onClick={()=>{try{if(!frame.current?.contentWindow)throw new Error();frame.current.contentWindow.focus();frame.current.contentWindow.print();}catch{setError('Printing could not open. Download the PDF and print it from your PDF viewer.');}}}><Printer size={16}/>Print report</button>}
      </div><p role="status">Prepared · {result.report.document_number}</p>{urls.pdf?<iframe ref={frame} title="Exam Analytics report preview" srcDoc={academicReportHtml(result.report)} sandbox="allow-same-origin allow-modals" className={styles.preview} onLoad={()=>{setReady(true);frame.current?.contentDocument?.addEventListener('keydown',event=>{if(event.key==='Escape')onClose();});}}/>:<p>Your complete data export is ready. Choose PDF preview to prepare a printable document.</p>}</>}
    </div>
  </Modal>;
}
