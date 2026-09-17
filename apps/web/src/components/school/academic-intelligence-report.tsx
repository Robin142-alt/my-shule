"use client";

import { useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useSchoolMutation } from '@/lib/data/school-hooks';
import { academicReportHtml, isAnalyticsReportResponse, type AnalyticsReportResponse, type AnalyticsReportSection } from '@/lib/modules/academic-intelligence-print';

const button='inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50';
const primaryButton='inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-700 bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50';
export function AcademicIntelligenceReport({filters,view,disabled,subjectOnly=false}:{filters:Record<string,string>;view:string;disabled:boolean;subjectOnly?:boolean}) {
  const [open,setOpen]=useState(false);
  const [section,setSection]=useState<AnalyticsReportSection>('summary');
  const [result,setResult]=useState<AnalyticsReportResponse|null>(null);
  const [error,setError]=useState('');
  const [ready,setReady]=useState(false);
  const [pdfUrl,setPdfUrl]=useState('');
  const frame=useRef<HTMLIFrameElement>(null);
  const urlRef=useRef('');
  const mutation=useSchoolMutation<AnalyticsReportResponse,{section:AnalyticsReportSection;filters:Record<string,string>}>(subjectOnly ? '/exams/analytics/reports/subject' : '/exams/analytics/reports','POST',{queueNetworkFailures:false,invalidateSchoolQueries:false});
  useEffect(()=>()=>{if(urlRef.current)URL.revokeObjectURL(urlRef.current);},[]);
  function clearPreview() {setResult(null);setReady(false);setPdfUrl('');setError('');if(urlRef.current)URL.revokeObjectURL(urlRef.current);urlRef.current='';}
  async function generate() {
    if(mutation.isPending)return;
    clearPreview();
    try {
      const response=await mutation.mutateAsync({section,filters});
      if(!isAnalyticsReportResponse(response))throw new Error('The report service did not return a complete document. Please retry.');
      const bytes=Uint8Array.from(atob(response.pdf_base64),char=>char.charCodeAt(0));
      if(String.fromCharCode(...bytes.slice(0,5))!=='%PDF-')throw new Error('The PDF could not be prepared. Please retry.');
      const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
      urlRef.current=url;setPdfUrl(url);setResult(response);
    }catch(reason){setError(reason instanceof Error?reason.message:'The report could not be generated. Please retry.');}
  }
  function print() {
    try {if(!frame.current?.contentWindow)throw new Error('Preview is still loading.');frame.current.contentWindow.focus();frame.current.contentWindow.print();}
    catch {setError('The browser could not open printing. Download the PDF and print it from your PDF viewer.');}
  }
  return <>
    <button className={primaryButton} disabled={disabled} onClick={()=>{
      clearPreview();setSection(view==='Learners'||view==='At Risk'?'learners':view==='Comparisons'?'subjects':view==='Trends'?'trends':view==='Exam Operations'?'operations':'summary');setOpen(true);
    }}><Printer size={16} aria-hidden="true"/>Print / PDF</button>
    <Modal open={open} title="Print or download analytics" description="Prepare a school-branded report from your current selection." size="xl" mobileFullScreen onClose={()=>{if(!mutation.isPending){setOpen(false);clearPreview();}}}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 flex-1 text-sm font-semibold text-slate-700">Report content<select aria-label="Report content" disabled={mutation.isPending} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900" value={section} onChange={event=>{setSection(event.target.value as AnalyticsReportSection);clearPreview();}}>
            <option value="summary">Exam summary</option><option value="learners">Learners - current page</option><option value="subjects">Subject comparison</option><option value="trends">Exam trends</option><option value="operations">Marks and readiness</option>
          </select></label>
          <button className={button} disabled={mutation.isPending} onClick={()=>void generate()}><FileText size={16} aria-hidden="true"/>{mutation.isPending?'Preparing report…':result?'Regenerate preview':'Prepare preview'}</button>
        </div>
        <p className="text-sm text-slate-600">A4 layout with school details, selected filters and generation date. {section==='learners'?'Includes only the current learner page; its range and total are shown in the report.':'Summary figures cover the selected academic scope.'}</p>
        {error&&<p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {mutation.isPending&&<p role="status" className="rounded-lg bg-slate-50 p-4 text-sm">Loading authorized results and preparing your document…</p>}
        {result&&<>
          <div className="flex flex-wrap items-center gap-3"><button className={button} onClick={print} disabled={!ready}><Printer size={16} aria-hidden="true"/>Print report</button><a className={button} href={pdfUrl} download={result.filename}><Download size={16} aria-hidden="true"/>Download PDF</a><span role="status" className="text-xs text-slate-500">Preview ready · {result.report.document_number}</span></div>
          <iframe ref={frame} title="Analytics report preview" srcDoc={academicReportHtml(result.report)} onLoad={()=>{
            setReady(true);
            frame.current?.contentDocument?.addEventListener('keydown',event=>{
              if(event.key==='Escape'){event.preventDefault();setOpen(false);clearPreview();}
            });
          }} sandbox="allow-same-origin allow-modals" className="h-[65vh] min-h-96 w-full rounded-lg border border-slate-200 bg-white"/>
        </>}
        {!result&&!mutation.isPending&&!error&&<div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">Choose your report content, then prepare a preview to check it before printing or downloading.</div>}
      </div>
    </Modal>
  </>;
}
