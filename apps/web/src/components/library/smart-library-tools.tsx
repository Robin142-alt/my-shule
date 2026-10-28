"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import { Modal } from "@/components/ui/modal";
import { borrowerReportHtml, loadLibraryReportLogo, printLibraryReport, type BorrowerReport } from "@/lib/library/borrower-report";
import { api, dateText, errorText, Feedback, Field, inputClass, LoadState, useCommand, useLibraryData, WriteButton, type LibraryRow } from "./smart-library-shared";

export function RenewLoan({loan,onSaved}:{loan:LibraryRow;onSaved:()=>void}) {
  const [open,setOpen]=useState(false),[due,setDue]=useState(""),[reason,setReason]=useState("");const command=useCommand();
  return <div className="mt-2">{loan.renewals?.length>0&&<details className="mb-2 text-xs"><summary className="cursor-pointer">Renewal history ({loan.renewals.length})</summary>{loan.renewals.map((r:LibraryRow,i:number)=><p key={i} className="mt-1">{dateText(r.created_at)}: {dateText(r.previous_due_on)} → {dateText(r.due_on)}{r.reason?` · ${r.reason}`:""}</p>)}</details>}
    {!loan.returned_at&&<WriteButton variant="secondary" onClick={()=>setOpen(!open)} disabled={command.busy||loan.copy_status==="lost"}>Renew loan</WriteButton>}
    {!loan.returned_at&&loan.copy_status==="lost"&&<p className="mt-1 text-xs text-muted">Record recovery or resolve the loss before renewing this copy.</p>}
    {open&&<form className="mt-3 space-y-2" onSubmit={e=>{e.preventDefault();void command.run("renew",{loan_id:loan.id,due_on:due,reason},()=>{setOpen(false);onSaved();},"Loan renewed. The original issue record is preserved.");}}>
      <p className="text-xs text-muted">{loan.renewal_count??0} previous renewals · Current due date {dateText(loan.due_on)}</p>
      <Field label={`New due date for ${loan.barcode}`}><input className={inputClass} type="date" required value={due} onChange={e=>setDue(e.target.value)}/></Field>
      <Field label="Renewal note (optional)"><input className={inputClass} value={reason} onChange={e=>setReason(e.target.value)}/></Field>
      <WriteButton type="submit" disabled={command.busy||!due}>Confirm renewal</WriteButton>
    </form>}<Feedback error={command.error} success={command.success}/>
  </div>;
}

export function BorrowingPolicies() {
  const data=useLibraryData<LibraryRow[]>("policies"),command=useCommand();
  const [type,setType]=useState("student"),[maximum,setMaximum]=useState(""),[renewals,setRenewals]=useState("");
  return <details className="mt-5 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-semibold">School borrowing rules</summary>
    <LoadState resource={data}><div className="my-3 text-sm">{data.data?.length?data.data.map(p=><p key={p.borrower_type}>{p.borrower_type}: {p.max_active_loans} active books · {p.max_renewals} renewals per loan</p>):<p>No school limits configured. Save a rule only when the school has agreed its limits.</p>}</div></LoadState>
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={e=>{e.preventDefault();void command.run("policies",{borrower_type:type,max_active_loans:Number(maximum),max_renewals:Number(renewals)},()=>data.refresh(),"School borrowing rules saved.");}}>
      <Field label="Policy borrower type"><select className={inputClass} value={type} onChange={e=>{const value=e.target.value;setType(value);const p=data.data?.find(r=>r.borrower_type===value);setMaximum(p?String(p.max_active_loans):"");setRenewals(p?String(p.max_renewals):"");}}><option value="student">Students</option><option value="staff">Staff</option></select></Field>
      <Field label="Maximum active books"><input className={inputClass} type="number" min={1} step={1} required value={maximum} onChange={e=>setMaximum(e.target.value)}/></Field>
      <Field label="Maximum renewals per loan"><input className={inputClass} type="number" min={0} step={1} required value={renewals} onChange={e=>setRenewals(e.target.value)}/></Field>
      <WriteButton type="submit" disabled={command.busy||!maximum||renewals===""}>Save borrowing rule</WriteButton>
    </form><Feedback error={command.error} success={command.success}/>
  </details>;
}

export function CopyDetails({copy,onSaved}:{copy:LibraryRow;onSaved:()=>void}) {
  const [open,setOpen]=useState(false),[shelf,setShelf]=useState(copy.shelf_location??""),[lendable,setLendable]=useState(copy.lendable!==false),[reason,setReason]=useState("");const command=useCommand();
  return <div className="min-w-0"><WriteButton variant="ghost" disabled={command.busy} onClick={()=>setOpen(!open)}>Shelf & lending</WriteButton>
    {open&&<form className="mt-2 space-y-2" onSubmit={e=>{e.preventDefault();void command.run("copies/details",{copy_id:copy.id,shelf_location:shelf,lendable,acquisition:copy.acquisition??{},reason},()=>{setOpen(false);onSaved();},"Copy details updated with an audit record.");}}>
      <Field label={`Shelf for ${copy.barcode}`}><input className={inputClass} value={shelf} onChange={e=>setShelf(e.target.value)}/></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lendable} onChange={e=>setLendable(e.target.checked)}/>May leave the library on loan</label>
      <Field label="Reason for copy correction"><input className={inputClass} required value={reason} onChange={e=>setReason(e.target.value)}/></Field>
      <WriteButton type="submit" disabled={command.busy||!reason.trim()}>Save copy details</WriteButton>
    </form>}<Feedback error={command.error} success={command.success}/>
  </div>;
}

export function LibraryExport({path,title,kind}:{path:string;title:string;kind:"loans"|"inventory"}) {
  return kind==="loans"?<BorrowerReportExport path={path}/>:<InventoryExport path={path} title={title} kind={kind}/>;
}

function BorrowerReportExport({path}:{path:string}) {
  const query=new URL(path,"https://library.invalid/").searchParams;
  const [type,setType]=useState(query.get("status")==="returned"?"history":"outstanding");
  const [className,setClassName]=useState(""),[stream,setStream]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [report,setReport]=useState<BorrowerReport|null>(null),[logo,setLogo]=useState<string|null>(null);
  const [landscape,setLandscape]=useState(false),[ready,setReady]=useState(""),[printing,setPrinting]=useState(false);
  const frame=useRef<HTMLIFrameElement>(null),options=useLibraryData<LibraryRow>("classifications");
  const key=report?`${report.document_number}:${landscape}`:"";
  const prepare=async()=>{
    if(busy)return;setBusy(true);setError("");setReady("");
    try{
      const value=await api<BorrowerReport>("/api/admin-command/librarian/borrowers/report",{
        type,subject_id:query.get("subject_id")||undefined,borrower_type:query.get("borrower_type")||undefined,
        status:query.get("status")||undefined,search:query.get("search")||undefined,
        class_name:className||undefined,stream_name:stream||undefined,
      });
      setLogo(await loadLibraryReportLogo(value.school.logo_url));setReport(value);
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  const print=async()=>{
    if(printing||ready!==key)return;setPrinting(true);setError("");
    try{await printLibraryReport(frame.current);}catch(e){setError(errorText(e));}finally{setPrinting(false);}
  };
  return <details className="my-3 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Export / print this report</summary>
    <div className="my-3 grid gap-3 sm:grid-cols-3"><Field label="Report type"><select className={inputClass} value={type} onChange={e=>setType(e.target.value)}><option value="outstanding" disabled={query.get("status")==="returned"}>Outstanding library books</option><option value="history">Borrowing history (includes returns)</option></select></Field>
      {!query.get("subject_id")&&<><Field label="Report Grade/Form"><select className={inputClass} value={className} onChange={e=>{setClassName(e.target.value);setStream("");}}><option value="">Whole school</option>{Array.from(new Set<string>((options.data?.classes??[]).map((c:LibraryRow)=>String(c.name)))).sort().map(name=><option key={name}>{name}</option>)}</select></Field>
      <Field label="Report stream (optional)"><input className={inputClass} value={stream} onChange={e=>setStream(e.target.value)} placeholder="All streams"/></Field></>}
    </div><p className="my-2 text-xs text-muted">Includes all matching loans, across every page. The selected borrower, search and loan status filters also apply.</p>
    <Button variant="secondary" disabled={busy} onClick={()=>void prepare()}>{busy?"Preparing report…":"Prepare report preview"}</Button><Feedback error={error}/>
    {report&&<Modal open title={`${report.title} preview`} onClose={()=>setReport(null)} size="xl" mobileFullScreen>
      <div className="flex h-[65dvh] min-h-48 flex-col sm:h-[calc(60dvh-2.5rem)]"><div className="mb-3 flex flex-wrap gap-2"><Field label="Report layout"><select value={landscape?"landscape":"portrait"} onChange={e=>setLandscape(e.target.value==="landscape")} className={inputClass}><option value="portrait">A4 portrait</option><option value="landscape">A4 landscape</option></select></Field>
        <Button disabled={printing||ready!==key} onClick={()=>void print()}>{printing?"Opening print preview…":"Print / Save as PDF"}</Button>
        <Button variant="secondary" onClick={()=>downloadCsvFile({filename:`${report.document_number}.csv`,headers:["Borrower","Admission / staff number","Grade/Form","Stream","Book title","Barcode","Date issued","Due date","Status"],rows:report.records.map(r=>[r.student_name,r.admission_no,r.class_name,r.stream_name,r.book_title,r.barcode,r.issue_date,r.due_date??"",r.status])})}>Download complete CSV</Button>
      </div><p className="mb-2 text-xs text-muted">{report.records.length} records. Save as PDF in the print dialog uses this same document.</p><Feedback error={error}/>
      <iframe key={key} ref={frame} title={`${report.title} printable document`} srcDoc={borrowerReportHtml(report,logo,landscape)} onLoad={()=>setReady(key)} className="min-h-0 w-full flex-1 rounded-lg border border-border"/>
      </div></Modal>}
  </details>;
}

function InventoryExport({path,title,kind}:{path:string;title:string;kind:"loans"|"inventory"}) {
  const identity=useSchoolCommandIdentity(),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [preview,setPreview]=useState<{rows:string[][];generated:string;id:string}|null>(null);
  const headers=kind==="loans"?["Title","Barcode","Borrower","Identifier","Issued","Due","Returned","Renewals"]:["Title","Barcode","Status","Condition","Shelf","Borrowable"];
  const prepare=async()=>{
    setBusy(true);setError("");setPreview(null);
    try{
      const all:LibraryRow[]=[];const query=new URL(path,"https://library.invalid/");query.searchParams.set("limit","100");
      for(let offset=0;;offset+=100){query.searchParams.set("offset",String(offset));const value=await api<LibraryRow[]|LibraryRow>(`${query.pathname.slice(1)}${query.search}`);const rows:LibraryRow[]=Array.isArray(value)?value:value.loans;all.push(...rows);if(rows.length<100)break;}
      const rows=all.map(r=>kind==="loans"?[r.title,r.barcode,r.borrower_name,r.borrower_number,dateText(r.issued_at),dateText(r.due_on),dateText(r.returned_at),r.renewal_count??0]:[r.title,r.barcode,r.status,r.condition,r.shelf_location,r.lendable===false?"Library use only":"Yes"]);
      setPreview({rows:rows.map(r=>r.map(v=>String(v??""))),generated:new Date().toLocaleString(),id:`LIB-${crypto.randomUUID().slice(0,8).toUpperCase()}`});
    }catch(e){setError(errorText(e));}finally{setBusy(false);}
  };
  return <details className="my-3 rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Export / print this report</summary>
    <p className="my-2 text-xs text-muted">Includes every page matching the selected filters.</p><Button variant="secondary" disabled={busy} onClick={()=>void prepare()}>{busy?"Preparing report…":"Prepare report preview"}</Button><Feedback error={error}/>
    {preview&&<div className="mt-3 space-y-2"><p className="text-sm">{preview.rows.length} records · Generated {preview.generated}</p><div className="max-h-48 overflow-auto"><table className="w-full text-left text-xs"><thead><tr>{headers.map(h=><th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{preview.rows.slice(0,25).map((row,i)=><tr key={i}>{row.map((cell,j)=><td className="p-2" key={j}>{cell}</td>)}</tr>)}</tbody></table></div>{preview.rows.length>25&&<p className="text-xs text-muted">Showing the first 25 rows; download and print include all {preview.rows.length}.</p>}
      <div className="flex flex-wrap gap-2"><Button onClick={()=>downloadCsvFile({filename:`${preview.id}-${kind}.csv`,headers,rows:preview.rows})}>Download complete CSV</Button>
        <Button variant="secondary" onClick={()=>openPrintDocument({eyebrow:identity.schoolName,logoUrl:identity.logoUrl,title,subtitle:`${preview.id} · ${preview.rows.length} records · ${preview.generated}`,rows:preview.rows.map(row=>({label:`${row[0]} · ${row[1]}`,value:row.slice(2).map((v,i)=>`${headers[i+2]}: ${v}`).join(" · ")})),footer:`Generated by ${identity.userLabel}.`})}>Open print view / save PDF</Button></div>
    </div>}
  </details>;
}
