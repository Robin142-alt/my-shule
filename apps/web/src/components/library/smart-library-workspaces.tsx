"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Barcode, BookOpen, Download, Printer, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsvFile, openPrintDocument } from "@/lib/dashboard/export";
import { useSchoolCommandIdentity } from "@/components/school/integrated-school-command-header";
import {
  api, BorrowerPicker, dateText, errorText, Feedback, Field, inputClass, LibraryPanel,
  LoadState, newRequest, Pager, ScannerInput, soundFeedback, useLibraryData, WriteButton, type LibraryRow, type ScanCompletion,
} from "./smart-library-shared";

function useCommand() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
  const pending=useRef(false),request=useRef<{fingerprint:string;id:string}|null>(null);
  const run=async(path:string,body:LibraryRow,onSuccess:(result:LibraryRow)=>void,message:string,propagate=false)=>{
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");setSuccess("");
    const fingerprint=JSON.stringify({path,body});
    if(request.current?.fingerprint!==fingerprint)request.current={fingerprint,id:newRequest()};
    try{
      const result=await api<LibraryRow>(path,{...body,request_id:request.current.id});
      request.current=null;setSuccess(message);onSuccess(result);
    }catch(e){setError(errorText(e));if(propagate)throw e;}
    finally{pending.current=false;setBusy(false);}
  };
  return {busy,error,success,run};
}
const searchQuery=(search:string,offset:number)=>`search=${encodeURIComponent(search)}&offset=${offset}`;
const statuses=["available","issued","lost","damaged","retired"];

export function SmartOverview({onNavigate}:{onNavigate:(view:string)=>void}) {
  const data=useLibraryData<LibraryRow>("summary");
  const metrics=[["total_copies","Registered copies","catalogue"],["available_copies","Available","catalogue"],
    ["issued_copies","Issued","loans"],["overdue_loans","Overdue","loans"],["lost_copies","Lost","lost_damaged"],
    ["damaged_copies","Damaged","lost_damaged"],["retired_copies","Retired","stocktake"],["unused_barcodes","Unused stickers","barcodes"]];
  return <LibraryPanel title="Library overview" description="Every physical copy, borrower and barcode in your school, in one place." actions={<Button variant="secondary" onClick={data.refresh}><RefreshCw size={16}/> Refresh</Button>}>
    <LoadState resource={data}><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(([key,label,view])=><button type="button" key={key} onClick={()=>onNavigate(view)} className="rounded-xl border border-border bg-surface-muted p-4 text-left hover:border-primary"><span className="text-sm text-muted">{label}</span><strong className="mt-2 block text-3xl">{data.data?.[key]??0}</strong></button>)}</div>
      <p className="my-4 text-sm text-muted">{data.data?.student_loans??0} copies with students · {data.data?.staff_loans??0} with staff</p></LoadState>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[["issue","Issue books","Select one borrower, then scan their books."],["return","Return books","Scan just the books being returned."],["add_books","Register copies","Attach a sticker and connect it to a title."]].map(([id,title,copy])=><button key={id} onClick={()=>onNavigate(id)} className="rounded-xl border border-border p-5 text-left hover:bg-surface-muted"><BookOpen className="mb-2 text-primary" size={22}/><strong>{title}</strong><p className="mt-1 text-sm text-muted">{copy}</p></button>)}
    </div>
    {!data.loading&&!data.error&&data.data?.total_copies===0&&<div className="mt-5 rounded-xl border border-info-border bg-info-soft p-4 text-sm">Start by generating barcode stickers. Print a calibration sheet, attach stickers, then register your books. <Button className="mt-3" onClick={()=>onNavigate("barcode_print")}>Generate barcodes</Button></div>}
  </LibraryPanel>;
}

export function SmartCirculation({mode}:{mode:"issue"|"return"}) {
  const identity=useSchoolCommandIdentity();
  const [borrower,setBorrower]=useState<LibraryRow|null>(null),[basket,setBasket]=useState<LibraryRow[]>([]),[receipt,setReceipt]=useState<LibraryRow|null>(null);
  const [due,setDue]=useState(()=>dateText(new Date(Date.now()+14*86400000).toISOString()));
  const [condition,setCondition]=useState("good"),[reason,setReason]=useState("");
  const [pendingScans,setPendingScans]=useState(0);
  const scanned=useRef(new Set<string>()),command=useCommand();
  const scan=async(code:string)=>{
    if(scanned.current.has(code))throw new Error(`${code} is already in this list.`);
    scanned.current.add(code);
    try{
      const book=await api<LibraryRow>(`scan?barcode=${encodeURIComponent(code)}`);
      if(mode==="issue"&&book.status!=="available")throw new Error(`${book.title} (${code}) is ${book.status}.`);
      if(mode==="return"&&!book.loan)throw new Error(`${book.title} has no active loan.`);
      setBasket(rows=>[...rows,book]);setReceipt(null);
    }catch(e){scanned.current.delete(code);throw e;}
  };
  const submit=()=>void command.run(mode,{barcodes:basket.map(b=>b.barcode),
    ...(mode==="issue"?{borrower_type:borrower?.borrower_type,subject_id:borrower?.subject_id,due_on:due}:{condition,reason})},result=>{
      setReceipt({...result,books:basket,borrower,mode});setBasket([]);scanned.current.clear();
    },`${basket.length} book(s) ${mode==="issue"?"issued":"returned"} successfully.`);
  const printReceipt=()=>{
    if(!receipt)return;
    const rows=receipt.books.map((book:LibraryRow)=>({label:`${book.title} — ${book.barcode}`,
      value:`${receipt.borrower?.name??book.loan?.borrower_name??""} · ${mode==="issue"?`Due ${receipt.loans?.[0]?.due_on}`:`Returned ${dateText(receipt.returns?.[0]?.returned_at)}`}`}));
    openPrintDocument({eyebrow:identity.schoolName,logoUrl:identity.logoUrl,title:`Library ${mode} slip`,subtitle:`Transaction ${receipt.transaction_id}`,rows,footer:`Generated ${new Date().toLocaleString()} by ${identity.userLabel}. This slip reflects the saved library transaction.`});
  };
  return <LibraryPanel title={mode==="issue"?"Issue books":"Return books"} description={mode==="issue"?"Choose the borrower once. Scan each physical book, review the list and confirm.":"Scan one or several returned books. All other loans stay with their borrowers."}>
    <Feedback error={command.error} success={command.success}/>
    {receipt&&<div className="mb-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={printReceipt}><Printer size={16}/> Preview / print slip</Button><Button variant="secondary" onClick={()=>downloadCsvFile({filename:`library-${mode}-${receipt.transaction_id}.csv`,headers:["Book","Barcode","Borrower"],rows:receipt.books.map((b:LibraryRow)=>[b.title,b.barcode,receipt.borrower?.name??b.loan?.borrower_name??""])})}><Download size={16}/> Download slip</Button></div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"><div className="space-y-5">
      {mode==="issue"&&<BorrowerPicker key={receipt?.transaction_id??"pending"} selected={borrower} onSelect={person=>{if(!command.busy&&pendingScans===0){setBorrower(person);setReceipt(null);}}}/>}
      <ScannerInput key={mode} autoFocus onScan={scan} onPendingChange={setPendingScans} disabled={command.busy||(mode==="issue"&&!borrower)} label="Scan a book"/>
      {mode==="issue"?<Field label="Due date for this issue"><input type="date" required className={inputClass} value={due} onChange={e=>setDue(e.target.value)} disabled={command.busy}/></Field>:<>
        <Field label="Condition of selected returned books"><select className={inputClass} value={condition} onChange={e=>setCondition(e.target.value)} disabled={command.busy}><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option><option value="lost">Lost — close loan and record loss</option></select></Field>
        {["damaged","lost"].includes(condition)&&<Field label="Incident notes (required)"><textarea className={inputClass} value={reason} onChange={e=>setReason(e.target.value)}/></Field>}
        <p className="text-xs text-muted">Return different conditions in separate groups. Only existing school fine rules apply.</p></>}
    </div><div className="rounded-xl border border-border bg-surface-muted p-4">
      <h3 className="mb-4 font-bold">{basket.length} book(s) ready to {mode}</h3>
      {!basket.length&&<p className="py-8 text-sm text-muted">Scanned books appear here. Scan the barcode sticker on each physical copy.</p>}
      <ul className="space-y-2">{basket.map(book=><li key={book.id} className="flex items-start justify-between gap-3 rounded-xl bg-surface p-3"><div className="min-w-0"><strong className="block break-words">{book.title}</strong><code className="text-sm">{book.barcode}</code>
        {mode==="return"&&<p className="mt-1 text-sm text-muted">{book.loan.borrower_name} · {book.loan.borrower_number} · Due {dateText(book.loan.due_on)}{book.loan.overdue?" · Overdue":""}</p>}</div>
        <Button variant="ghost" size="icon" disabled={command.busy} aria-label={`Remove ${book.barcode}`} onClick={()=>{scanned.current.delete(book.barcode);setBasket(list=>list.filter(b=>b.id!==book.id));}}><X size={16}/></Button></li>)}</ul>
      <WriteButton className="mt-5 w-full" disabled={command.busy||pendingScans>0||!basket.length||(mode==="issue"&&(!borrower||!due))||(["lost","damaged"].includes(condition)&&!reason.trim())} onClick={submit}>
        {command.busy?"Saving…":`Confirm ${mode} of ${basket.length} book(s)`}</WriteButton>
    </div></div>
  </LibraryPanel>;
}

export function SmartCatalogue({registration=false}:{registration?:boolean}) {
  const [search,setSearch]=useState(""),[offset,setOffset]=useState(0),[title,setTitle]=useState<LibraryRow|null>(null);
  const [creating,setCreating]=useState(false),[barcode,setBarcode]=useState(""),[fields,setFields]=useState({title:"",author:"",isbn:"",category:"",publisher:"",condition:"good",shelf_location:""});
  const data=useLibraryData<LibraryRow[]>(`catalogue?${searchQuery(search,offset)}`),command=useCommand();
  const saveCopy=(code:string,propagate=false)=>command.run("register",{barcode:code,...fields,...(title?{catalog_item_id:title.id}:{})},result=>{
    setTitle({id:result.catalog_item_id,title:result.title});setCreating(false);setBarcode("");data.refresh();
  },"Physical copy registered. Keep the same title selected to scan the next copy.",propagate);
  const register=async(code:string)=>{
    setBarcode(code);
    const list=await api<LibraryRow[]>(`barcodes?search=${encodeURIComponent(code)}&exact=true`);
      const reserved=list.find(r=>r.barcode===code);
      if(!reserved)throw new Error("This barcode is not reserved for your school. Generate or import it in Barcode Management.");
      if(reserved.copy_id||reserved.retired_at)throw new Error("This sticker is already assigned or retired.");
    if(title||(creating&&fields.title.trim()))await saveCopy(code,true);
  };
  const submit=(event:FormEvent)=>{event.preventDefault();void saveCopy(barcode);};
  return <LibraryPanel title={registration?"Register physical books":"Book catalogue & registration"} description="Keep one title record and give every physical copy its own barcode. Existing catalogue records are preserved.">
    <Feedback error={command.error} success={command.success}/>
    <div className="grid gap-6 xl:grid-cols-2"><div>
      <Field label="Find an existing title"><input className={inputClass} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}} placeholder="Title, author or ISBN"/></Field>
      <LoadState resource={data}><div className="mt-3 space-y-2">{data.data?.map(item=><button key={item.id} onClick={()=>{setTitle(item);setCreating(false);}} className={`w-full rounded-xl border p-3 text-left ${title?.id===item.id?"border-primary bg-info-soft":"border-border hover:bg-surface-muted"}`}>
        <strong className="block">{item.title}</strong><span className="text-sm text-muted">{item.author||"Author not recorded"} · {item.available_copies} available / {item.total_copies} copies</span></button>)}
        {!data.data?.length&&<p className="py-5 text-sm text-muted">No matching titles. Create the title once, then register its physical copies.</p>}</div><Pager offset={offset} setOffset={setOffset} count={data.data?.length??0}/></LoadState>
      <WriteButton variant="secondary" className="mt-3" onClick={()=>{setCreating(true);setTitle(null);}}>Create a new title</WriteButton>
    </div><div className="rounded-xl border border-border p-4">
      <ScannerInput label="Scan a sticker to register" autoFocus={!creating} focusKey={title?.id} onScan={register}/>
      <p className="my-3 text-sm text-muted">{barcode&&!title&&!creating?`Sticker ${barcode} is ready. Select or create its book title below.`:"With a title selected, each scan saves the next physical copy automatically."}</p>
      <h3 className="mb-3 font-bold">{title?title.title:creating?"New title":"Select a title to register copies"}</h3>
      {(title||creating)&&<><form onSubmit={submit} className="space-y-3">
        {creating&&<div className="grid gap-3 sm:grid-cols-2">{(["title","author","isbn","category","publisher"] as const).map(key=><Field key={key} label={key==="isbn"?"ISBN (optional)":`${key[0].toUpperCase()+key.slice(1)}${key==="title"?" *":" (optional)"}`}><input className={inputClass} required={key==="title"} value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})}/></Field>)}</div>}
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Condition"><select className={inputClass} value={fields.condition} onChange={e=>setFields({...fields,condition:e.target.value})}><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option></select></Field>
          <Field label="Shelf location (optional)"><input className={inputClass} value={fields.shelf_location} onChange={e=>setFields({...fields,shelf_location:e.target.value})}/></Field></div>
        <Field label="Scanned barcode"><input className={`${inputClass} font-mono`} required value={barcode} onChange={e=>setBarcode(e.target.value)} autoComplete="off"/></Field>
        <WriteButton type="submit" disabled={command.busy||!barcode}>{command.busy?"Registering…":"Register this physical copy"}</WriteButton>
      </form></>}
    </div></div>
  </LibraryPanel>;
}

export function SmartBarcodeWorkspace({management=false}:{management?:boolean}) {
  const [quantity,setQuantity]=useState(96),[offset,setOffset]=useState(0),[batchOffset,setBatchOffset]=useState(0),[batchId,setBatchId]=useState("");
  const [search,setSearch]=useState(""),[status,setStatus]=useState(""),[external,setExternal]=useState(""),[selected,setSelected]=useState<string[]>([]);
  const [guides,setGuides]=useState(true),[preview,setPreview]=useState(""),[pdfError,setPdfError]=useState(""),[pdfBusy,setPdfBusy]=useState(false);
  const batches=useLibraryData<LibraryRow[]>(`batches?offset=${batchOffset}`),barcodes=useLibraryData<LibraryRow[]>(`barcodes?${searchQuery(search,offset)}&status=${status}&batch_id=${batchId}`);
  const command=useCommand();
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  const showPdf=async(calibration=false,selection=false)=>{
    setPdfBusy(true);setPdfError("");setPreview("");
    try{
      const query=selection?`selected=${encodeURIComponent(JSON.stringify(selected))}`:`batch_id=${batchId}`;
      const response=await fetch(`/api/library/smart/barcodes/${calibration?"calibration":`pdf?${query}&guides=${guides}`}`,{credentials:"include",cache:"no-store"});
      if(!response.ok){const data=await response.json().catch(()=>null);throw new Error(data?.message||`PDF generation failed (${response.status}).`);}
      setPreview(URL.createObjectURL(await response.blob()));
    }catch(e){setPdfError(errorText(e));}finally{setPdfBusy(false);}
  };
  return <LibraryPanel title={management?"Barcode management":"Barcode generator & A4 printing"} description="Permanent school-owned identifiers. Six columns × sixteen rows; exactly 96 positions per A4 sheet. Each sticker is 32 × 15 mm.">
    <Feedback error={command.error||pdfError} success={command.success}/>
    <div className="grid gap-6 lg:grid-cols-[minmax(220px,.7fr)_minmax(0,1.5fr)]"><div className="space-y-5">
      <form onSubmit={e=>{e.preventDefault();void command.run("batches",{quantity},result=>{setBatchId(result.id);batches.refresh();barcodes.refresh();},`${quantity} barcodes reserved in ${Math.ceil(quantity/96)} A4 sheet(s).`);}} className="space-y-3 rounded-xl border border-border p-4">
        <Field label="Custom quantity"><input className={inputClass} type="number" min={1} max={100000} required value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></Field>
        <p className="text-sm text-muted">{Math.ceil(quantity/96)||0} sheet(s) · {quantity%96?`${96-quantity%96} empty positions on the last sheet`:"Full sheets"}</p>
        <WriteButton type="submit" disabled={command.busy}>{command.busy?"Reserving…":"Generate barcodes"}</WriteButton>
      </form>
      {management&&<form className="space-y-3 rounded-xl border border-border p-4" onSubmit={e=>{e.preventDefault();void command.run("barcodes/import",{barcodes:external.split(/\r?\n/).filter(Boolean)},result=>{setBatchId(result.id);setExternal("");batches.refresh();barcodes.refresh();},"Purchased barcodes reserved for your school.");}}>
        <Field label="Externally purchased barcodes — one per line"><textarea rows={6} className={`${inputClass} font-mono`} value={external} onChange={e=>setExternal(e.target.value)} required/></Field>
        <p className="text-xs text-muted">Keep leading zeros. The entire import is rejected if any identifier is already reserved.</p>
        <WriteButton type="submit" disabled={command.busy}>Validate & import barcodes</WriteButton></form>}
      <div className="space-y-3 rounded-xl bg-surface-muted p-4"><strong className="text-sm">Print setup</strong><p className="text-sm text-muted">Use A4, Actual size / 100%. Disable Fit to page. Measure the test sheet before using adhesive paper.</p>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={guides} onChange={e=>setGuides(e.target.checked)}/> Optional cutting guides</label>
        <Button variant="secondary" disabled={pdfBusy} onClick={()=>void showPdf(true)}>Print test sheet</Button></div>
    </div><div className="min-w-0 space-y-4">
      <h3 className="font-bold">Previous batches</h3><LoadState resource={batches}><div className="grid gap-2 sm:grid-cols-2">{batches.data?.map(batch=><button key={batch.id} className={`rounded-xl border p-3 text-left ${batchId===batch.id?"border-primary bg-info-soft":"border-border"}`} onClick={()=>{setBatchId(batch.id);setOffset(0);setSelected([]);}}>
        <span className="block font-semibold">{batch.quantity.toLocaleString()} barcodes · {batch.pages} sheet(s)</span><span className="text-xs text-muted">{dateText(batch.created_at)} · {batch.source} · {batch.id.slice(0,8)}</span></button>)}</div>
        {!batches.data?.length&&<p className="text-sm text-muted">No batches yet. Generate the number of stickers you need.</p>}</LoadState>
      <Pager offset={batchOffset} setOffset={setBatchOffset} count={batches.data?.length??0}/>
      <div className="flex flex-wrap gap-2"><Button disabled={!batchId||pdfBusy} onClick={()=>void showPdf()}><Barcode size={16}/>{pdfBusy?"Preparing PDF…":"Preview / reprint batch"}</Button>
        {selected.length>0&&<Button variant="secondary" disabled={pdfBusy} onClick={()=>void showPdf(false,true)}>Print {selected.length} selected</Button>}</div>
      {management&&<><div className="grid gap-3 sm:grid-cols-2"><Field label="Barcode search"><input className={inputClass} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}}/></Field>
        <Field label="Assignment"><select className={inputClass} value={status} onChange={e=>{setStatus(e.target.value);setOffset(0);}}><option value="">All barcodes</option><option value="unused">Unassigned</option><option value="assigned">Assigned</option></select></Field></div>
        {batchId&&<Button variant="ghost" onClick={()=>setBatchId("")}>Show all school barcodes</Button>}
        <LoadState resource={barcodes}><div className="space-y-1">{barcodes.data?.map(row=><label key={row.barcode} className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
          <input type="checkbox" checked={selected.includes(row.barcode)} onChange={e=>setSelected(s=>e.target.checked?[...s,row.barcode]:s.filter(v=>v!==row.barcode))}/>
          <code className="break-all">{row.barcode}</code><span className="ml-auto">{row.title||"Unassigned"} · {row.retired_at?"Retired":row.status||"Unused"}<small className="block text-muted">Reserved {dateText(row.created_at)}{row.assigned_at?` · Assigned ${dateText(row.assigned_at)}`:""}</small></span></label>)}</div></LoadState>
      <Pager offset={offset} setOffset={setOffset} count={barcodes.data?.length??0}/></>}
    </div></div>
    {preview&&<div className="mt-6 space-y-3"><div className="flex flex-wrap gap-3"><a className="app-button rounded-lg border border-border px-4 py-2 text-sm" href={preview} download="myshule-library-barcodes.pdf">Download PDF</a>
      <a className="app-button rounded-lg bg-primary px-4 py-2 text-sm text-white" href={preview} target="_blank" rel="noreferrer">Open PDF & print barcodes</a><Button variant="ghost" onClick={()=>setPreview("")}>Close preview</Button></div>
      <iframe title="A4 barcode sheet preview" src={preview} className="h-[620px] w-full rounded-xl border border-border"/></div>}
  </LibraryPanel>;
}

export function SmartBorrowerRecords({loansOnly=false}:{loansOnly?:boolean}) {
  const [selected,setSelected]=useState<LibraryRow|null>(null),[status,setStatus]=useState(""),[search,setSearch]=useState(""),[offset,setOffset]=useState(0);
  const command=useCommand();
  const path=loansOnly?`loans?${searchQuery(search,offset)}&status=${status}`:selected?`history?subject_id=${selected.subject_id}&borrower_type=${selected.borrower_type}&status=${status}&offset=${offset}`:null;
  const data=useLibraryData<LibraryRow|LibraryRow[]>(path);
  const rows:LibraryRow[]=Array.isArray(data.data)?data.data:data.data?.loans??[];
  return <LibraryPanel title={loansOnly?"Loans & overdue books":"Borrower book history"} description="See the exact copies each student or staff member holds, with independent issue dates, due dates and returns.">
    <Feedback error={command.error} success={command.success}/>
    {!loansOnly&&<BorrowerPicker includeInactive selected={selected} onSelect={p=>{setSelected(p);setOffset(0);}}/>}
    {(selected||loansOnly)&&<><div className="my-4 grid gap-3 sm:grid-cols-2">{loansOnly&&<Field label="Search loans"><input className={inputClass} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}} placeholder="Borrower, admission number, barcode or title"/></Field>}
      <Field label="Loan status"><select className={inputClass} value={status} onChange={e=>{setStatus(e.target.value);setOffset(0);}}><option value="">All history</option><option value="active">Currently borrowed</option><option value="overdue">Overdue</option><option value="returned">Returned</option></select></Field></div>
      <LoadState resource={data}><div className="space-y-2">{rows.map(row=><div key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border p-4">
        <div><strong className="block">{row.title}</strong><code>{row.barcode||row.accession_number}</code><p className="mt-1 text-sm text-muted">{row.borrower_name} · {row.borrower_number}</p></div>
        <div className="text-sm"><p>Issued {dateText(row.issued_at)} · Due {dateText(row.due_on)}</p><p className={row.overdue?"font-semibold text-danger":"text-muted"}>{row.returned_at?`Returned ${dateText(row.returned_at)} (${row.return_condition||"recorded"})`:row.overdue?"Overdue — still with borrower":"Currently borrowed"}</p>
          {row.overdue&&!row.returned_at&&<WriteButton variant="secondary" className="mt-2" disabled={command.busy} onClick={()=>void command.run(`/api/admin-command/librarian/overdue-books/${encodeURIComponent(row.id)}/remind`,{},()=>data.refresh(),"Overdue reminder queued for the exact active borrower or linked guardian accounts.")}>{command.busy?"Queuing reminder…":"Send overdue reminder"}</WriteButton>}</div>
      </div>)}{!rows.length&&<p className="p-5 text-sm text-muted">No matching loans. Use Issue Books to record a borrower’s first loan.</p>}</div><Pager offset={offset} setOffset={setOffset} count={rows.length}/></LoadState></>}
  </LibraryPanel>;
}

export function SmartScanBook() {
  const [book,setBook]=useState<LibraryRow|null>(null);
  return <LibraryPanel title="Scan book" description="Identify the exact physical copy and its current borrower. School-owned barcodes only.">
    <ScannerInput autoFocus onScan={async code=>setBook(await api<LibraryRow>(`scan?barcode=${encodeURIComponent(code)}`))}/>
    {book&&<div className="mt-5 rounded-xl border border-border p-5"><h3 className="text-xl font-bold">{book.title}</h3><p>{book.author} · <code>{book.barcode}</code></p><p className="my-3">Status: {book.status} · Condition: {book.condition} · Shelf: {book.shelf_location||"Not recorded"}</p>
      {book.loan?<div className="rounded-lg bg-info-soft p-3"><strong>{book.loan.borrower_name}</strong> · {book.loan.borrower_number}<p>Borrowed {dateText(book.loan.issued_at)} · Due {dateText(book.loan.due_on)}{book.loan.overdue?" · Overdue":""}</p></div>:<p className="text-sm text-muted">No active loan for this copy.</p>}
      {book.incidents?.length>0&&<div className="mt-4"><h4 className="font-semibold">Condition history</h4>{book.incidents.map((i:LibraryRow)=><p key={i.id} className="mt-2 text-sm">{dateText(i.created_at)} · {i.action} · {i.reason}</p>)}</div>}</div>}
  </LibraryPanel>;
}

export function SmartInventory({incidents=false}:{incidents?:boolean}) {
  const [search,setSearch]=useState(""),[status,setStatus]=useState(incidents?"lost":""),[offset,setOffset]=useState(0),[selected,setSelected]=useState<LibraryRow|null>(null);
  const [nextStatus,setNextStatus]=useState("lost"),[reason,setReason]=useState(""),[replacement,setReplacement]=useState("");
  const data=useLibraryData<LibraryRow[]>(`inventory?${searchQuery(search,offset)}&status=${status}`),command=useCommand();
  return <LibraryPanel title={incidents?"Lost, damaged & replacement books":"Physical inventory"} description="Condition changes preserve all borrowing history. Record a borrowed copy’s loss or damage through the return desk.">
    <Feedback error={command.error} success={command.success}/>
    <div className="mb-4 grid gap-3 sm:grid-cols-2"><Field label="Find a book"><input className={inputClass} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}} placeholder="Title or barcode"/></Field>
      <Field label="Availability"><select className={inputClass} value={status} onChange={e=>{setStatus(e.target.value);setOffset(0);}}><option value="">All copies</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></Field></div>
    <LoadState resource={data}><div className="space-y-2">{data.data?.map(c=><div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"><div><strong>{c.title}</strong><p className="text-sm text-muted">{c.barcode||c.accession_number} · {c.status} · {c.condition}</p></div>
      <WriteButton variant="secondary" disabled={c.status==="issued"||c.status==="retired"} onClick={()=>{setSelected(c);setReason("");}}>Update condition</WriteButton></div>)}
      {!data.data?.length&&<p className="py-6 text-sm text-muted">No matching physical copies. Register books or change the status filter.</p>}</div><Pager offset={offset} setOffset={setOffset} count={data.data?.length??0}/></LoadState>
    {selected&&<div className="mt-5 space-y-3 rounded-xl bg-surface-muted p-4"><form className="space-y-3" onSubmit={e=>{e.preventDefault();void command.run("incidents",{copy_id:selected.id,status:nextStatus,reason,...(replacement?{replacement_copy_id:replacement}:{})},()=>{setSelected(null);data.refresh();},"Condition change recorded with its history.");}}>
      <h3 className="font-bold">Update {selected.title} · {selected.barcode}</h3>
      <Field label="New state"><select className={inputClass} value={nextStatus} onChange={e=>setNextStatus(e.target.value)}><option value="lost">Lost</option><option value="damaged">Damaged</option><option value="available">Found / repaired — available</option><option value="retired">Retired — permanent</option></select></Field>
      <Field label="Reason"><textarea className={inputClass} value={reason} onChange={e=>setReason(e.target.value)} required/></Field>
      {replacement&&<p className="text-sm">Replacement copy selected. <Button variant="ghost" onClick={()=>setReplacement("")}>Clear</Button></p>}
      <div className="flex gap-2"><WriteButton type="submit" disabled={command.busy}>Save condition change</WriteButton><Button variant="secondary" onClick={()=>setSelected(null)}>Cancel</Button></div>
    </form><ScannerInput label="Replacement barcode (optional)" onScan={async code=>{const b=await api<LibraryRow>(`scan?barcode=${encodeURIComponent(code)}`);if(b.status!=="available")throw new Error("Replacement must be an available registered copy.");setReplacement(b.id);}}/></div>}
  </LibraryPanel>;
}

export function SmartStocktake() {
  const identity=useSchoolCommandIdentity();
  const [id,setId]=useState(""),[name,setName]=useState(""),[offset,setOffset]=useState(0),[feedback,setFeedback]=useState("");
  const [pendingScans,setPendingScans]=useState(0),[exporting,setExporting]=useState(false);
  const sessions=useLibraryData<LibraryRow[]>("stocktakes"),report=useLibraryData<LibraryRow>(id?`stocktakes/${id}?offset=${offset}`:null),command=useCommand();
  const exportAll=async()=>{
    let all:LibraryRow[]=[],exceptions:LibraryRow[]=[];let position=0;
    setExporting(true);
    try{
      while(true){const data=await api<LibraryRow>(`stocktakes/${id}?offset=${position}&limit=100`);all=all.concat(data.items);exceptions=exceptions.concat(data.exceptions);if(data.items.length<100&&data.exceptions.length<100)break;position+=100;}
      downloadCsvFile({filename:`library-stocktake-${id}.csv`,headers:["Barcode","Accession","Title","Expected status","Current status","Verified / discrepancy"],
        rows:[...all.map(r=>[r.barcode,r.accession_number,r.title,r.expected_status,r.current_status,r.verified_at??"Not seen"]),
          ...exceptions.map(r=>[r.barcode,"","","","",r.outcome])].map(row=>row.map(v=>String(v??"")))});
    }catch(e){setFeedback(errorText(e));}finally{setExporting(false);}
  };
  return <LibraryPanel title="Inventory & barcode stocktaking" description="Take a snapshot of expected books, then scan the shelves. Issued books are counted separately from books expected on site.">
    <Feedback error={command.error} success={command.success}/>
    <form onSubmit={e=>{e.preventDefault();void command.run("stocktakes",{name},result=>{setId(result.id);sessions.refresh();},"Stocktaking session opened.");}} className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-0 flex-1"><Field label="New session name"><input className={inputClass} value={name} onChange={e=>setName(e.target.value)} placeholder="Term 3 shelf check" required/></Field></div><WriteButton type="submit" disabled={command.busy||pendingScans>0}>Start stocktake</WriteButton>
    </form>
    <LoadState resource={sessions}><Field label="Open or previous session"><select className={inputClass} disabled={pendingScans>0||command.busy} value={id} onChange={e=>{setId(e.target.value);setOffset(0);}}><option value="">Select a stocktaking session</option>{sessions.data?.map(s=><option value={s.id} key={s.id}>{s.name} · {s.status} · {s.verified}/{s.expected} seen</option>)}</select></Field></LoadState>
    {id&&<div className="mt-5 space-y-4"><LoadState resource={report}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[["total","In snapshot"],["verified","Verified"],["issued","Expected with borrowers"],["missing","Expected on site, not seen"]].map(([key,label])=><div key={key} className="rounded-xl bg-surface-muted p-4"><span className="text-sm">{label}</span><strong className="block text-2xl">{report.data?.[key]??0}</strong></div>)}</div>
      <ScannerInput autoFocus onPendingChange={setPendingScans} disabled={command.busy||report.data?.session.status!=="open"} onScan={async barcode=>{const result=await api<LibraryRow>(`stocktakes/${id}/scan`,{barcode});setFeedback(`${barcode}: ${result.duplicate?"already scanned":result.outcome.replaceAll("_"," ")}`);report.refresh();sessions.refresh();}}/>
      <p role="status" className="text-sm">{feedback}</p>
      <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={exporting} onClick={()=>void exportAll()}>{exporting?"Preparing report…":"Download complete stocktake CSV"}</Button>
        <Button variant="secondary" onClick={()=>openPrintDocument({eyebrow:identity.schoolName,logoUrl:identity.logoUrl,title:report.data?.session.name??"Library stocktake",subtitle:`Stocktake ${id} · ${dateText(report.data?.session.created_at)}`,
          rows:[{label:"Snapshot",value:String(report.data?.total)},{label:"Verified",value:String(report.data?.verified)},{label:"With borrowers",value:String(report.data?.issued)},{label:"Not seen on site",value:String(report.data?.missing)}],
          footer:`Generated ${new Date().toLocaleString()} by ${identity.userLabel}. Stocktake status: ${report.data?.session.status}.`})}>Preview / print summary</Button>
        <WriteButton disabled={command.busy||pendingScans>0||report.data?.session.status!=="open"} onClick={()=>void command.run(`stocktakes/${id}/complete`,{},()=>{report.refresh();sessions.refresh();},"Stocktake completed. The snapshot and scans remain available.")}>Complete stocktake</WriteButton></div>
      <div className="space-y-2">{report.data?.items.map((item:LibraryRow)=><div key={item.accession_number} className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-sm"><span>{item.title} · <code>{item.barcode||item.accession_number}</code></span><span>{item.verified_at?"Verified":item.expected_status==="issued"?"With borrower":`Not seen · ${item.expected_status}`}</span></div>)}</div>
      {report.data?.exceptions.length>0&&<div className="rounded-xl border border-warning-border bg-warning-soft p-4"><h3 className="font-bold">Scan discrepancies</h3>{report.data?.exceptions.map((s:LibraryRow)=><p key={s.barcode} className="text-sm">{s.barcode}: {s.outcome.replaceAll("_"," ")}</p>)}</div>}
      <Pager offset={offset} setOffset={setOffset} count={Math.max(report.data?.items.length??0,report.data?.exceptions.length??0)}/>
    </LoadState></div>}
    <div className="mt-6"><SmartInventory/></div>
  </LibraryPanel>;
}

export function SmartScannerSettings() {
  const [sound,setSound]=useState(false),[storageError,setStorageError]=useState(""),[audioMessage,setAudioMessage]=useState(""),[testingSound,setTestingSound]=useState(false);
  const [last,setLast]=useState<{code:string;completion:ScanCompletion;count:number}|null>(null);
  useEffect(()=>{
    try{setSound(localStorage.getItem("myshule-library-scanner-sound")==="true");}
    catch{setStorageError("This browser could not read saved sound settings. Visual scan feedback remains available.");}
  },[]);
  const saveSound=(enabled:boolean)=>{
    try{localStorage.setItem("myshule-library-scanner-sound",String(enabled));setSound(enabled);setStorageError("");}
    catch{setStorageError("This browser could not save sound settings. Allow site storage, then try again. Scanning still works.");}
  };
  return <LibraryPanel title="Scanner settings & test" description="Test keyboard input from your USB scanner before registering or lending books. Nothing in this test changes library records.">
    <div className="mb-5 rounded-xl border border-info-border bg-info-soft p-4 text-sm">
      <p className="font-semibold">Connect a USB scanner in keyboard / HID mode.</p>
      <p className="mt-1">MyShule cannot detect a connected keyboard-mode scanner or change its hardware settings. Enable Code 128 and an Enter suffix using the scanner’s manual.</p>
    </div>
    <ScannerInput autoFocus onScan={async(code,completion)=>setLast(previous=>({code,completion,count:(previous?.count??0)+1}))}
      label="Test your scanner" submitLabel="Complete test" focusLabel="Start scanner test"/>
    {last?<div role="status" className="mt-4 rounded-xl border border-success-border bg-success-soft p-4 text-sm">
      <p>Received exactly: <code className="break-all font-bold">{last.code}</code> ({last.code.length} characters).</p>
      <p className="mt-1">Completed tests: {last.count} · {last.completion==="enter"?"Enter received":"Completed with button — an Enter suffix was not tested"}.</p>
      <p className="mt-1">Compare this value with your sticker, including leading zeros. Typed or pasted text tests the page; only a physical scan tests the device.</p>
    </div>:<p className="my-4 text-sm text-muted">No completed tests yet. Scan a sticker, or type its value and press Enter to check the page input.</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">Sound on this browser</h3>
        <label className="my-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={sound} onChange={e=>saveSound(e.target.checked)}/> Optional sound feedback on this device</label>
        <p className="mb-3 text-xs text-muted">Changes save automatically in this browser. Your scanner may also have its own beep.</p>
        <Button variant="secondary" disabled={testingSound} onClick={async()=>{
          setTestingSound(true);setAudioMessage("");
          // A click provides the browser gesture required to enable Web Audio.
          const played=await soundFeedback(true,true);
          setAudioMessage(played?"Test tone started. If you cannot hear it, check the computer volume and browser sound permissions.":"Sound is unavailable in this browser. Check site sound permissions; visual feedback still works.");
          setTestingSound(false);
        }}>{testingSound?"Testing sound…":"Test sound"}</Button>
        <Feedback error={storageError}/>{audioMessage&&<p role="status" className="mt-3 text-sm text-muted">{audioMessage}</p>}
      </section>
      <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">Nothing appears when you scan?</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm"><li>Choose “Start scanner test”, then scan a printed Code 128 sticker.</li>
          <li>If no characters arrive, scan into a blank Notepad document. If that is also empty, check the cable or receiver, USB port, keyboard / HID mode and Code 128 support.</li>
          <li>If text arrives but the test does not finish, enable an Enter suffix on the scanner. “Complete test” lets you check the received value manually.</li>
          <li>If characters differ from the sticker, match the scanner’s keyboard layout to the computer.</li></ol>
      </section>
    </div>
  </LibraryPanel>;
}
