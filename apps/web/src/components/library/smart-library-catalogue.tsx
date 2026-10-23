"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/components/providers/permission-context";
import { api, errorText, Feedback, Field, inputClass, LibraryPanel, LoadState, Pager, ScannerInput, useCommand, useLibraryData, WriteButton, type LibraryRow } from "./smart-library-shared";

const initial={title:"",author:"",isbn:"",edition:"",publisher:"",category:"",language:"",condition:"good",shelf_location:"",lendable:true};
export function SmartCatalogue({registration=false}:{registration?:boolean}) {
  const {hasPermission}=usePermissions();const writable=hasPermission("library:write");
  const [search,setSearch]=useState(""),[offset,setOffset]=useState(0),[title,setTitle]=useState<LibraryRow|null>(null);
  const selected=useRef<LibraryRow|null>(null);
  const [creating,setCreating]=useState(false),[editing,setEditing]=useState(false),[fields,setFields]=useState(initial);
  const [barcode,setBarcode]=useState(""),[count,setCount]=useState(0),[pending,setPending]=useState(0);
  const [failed,setFailed]=useState<Record<string,string>>({});
  const [subjects,setSubjects]=useState<string[]>([]),[classes,setClasses]=useState<string[]>([]),[subjectSearch,setSubjectSearch]=useState("");
  const [filterSubject,setFilterSubject]=useState(""),[filterClass,setFilterClass]=useState("");
  const [acquisition,setAcquisition]=useState({source:"",acquired_on:"",price:"",notes:""});
  const [batchId,setBatchId]=useState(""),[start,setStart]=useState(1),[end,setEnd]=useState(96),[range,setRange]=useState<LibraryRow|null>(null),[rangeError,setRangeError]=useState(""),[checking,setChecking]=useState(false);
  const options=useLibraryData<LibraryRow>("classifications"),batches=useLibraryData<LibraryRow[]>("batches");
  const data=useLibraryData<LibraryRow[]>(`catalogue?search=${encodeURIComponent(search)}&offset=${offset}&subject_id=${filterSubject}&class_id=${encodeURIComponent(filterClass)}`);
  const command=useCommand(),subjectCommand=useCommand();const locked=command.busy||pending>0;
  const choose=(item:LibraryRow|null)=>{
    selected.current=item;setTitle(item);setCreating(!item);setEditing(false);setRange(null);
    setFields({...initial,...Object.fromEntries(Object.keys(initial).map(key=>[key,item?.[key]??initial[key as keyof typeof initial]]))} as typeof initial);
    setSubjects((item?.subjects??[]).map((s:LibraryRow)=>s.id));setClasses((item?.classes??[]).map((c:LibraryRow)=>c.id));
  };
  const details=()=>({...fields,subject_ids:subjects,class_ids:classes,acquisition,...(selected.current?{catalog_item_id:selected.current.id}:{})});
  const save=async(code:string,propagate=false)=>command.run("register",{...details(),barcode:code},result=>{
    const newTitle=!selected.current;
    const item=result.catalogue??{...fields,...selected.current,id:result.catalog_item_id,title:result.title};selected.current=item;setTitle(item);setCreating(false);setEditing(false);setBarcode("");setCount(n=>n+1);setFailed(previous=>{const next={...previous};delete next[code];return next;});data.refresh();
    if(result.catalogue){setSubjects(item.subjects.map((s:LibraryRow)=>s.id));setClasses(item.classes.map((c:LibraryRow)=>c.id));}
    if(newTitle)options.refresh();
  },"Physical copy registered. Ready for the next sticker.",propagate);
  const scan=async(code:string)=>{
    setBarcode(code);
    if(selected.current||(creating&&fields.title.trim())){await save(code,true);return;}
    const found=await api<LibraryRow[]>(`barcodes?search=${encodeURIComponent(code)}&exact=true`);
    if(!found.some(r=>r.barcode===code&&!r.copy_id&&!r.retired_at))throw new Error("Use an unused sticker reserved for this school. Generate or import it in Barcode Management.");
  };
  const toggle=(value:string,values:string[],set:(v:string[])=>void)=>set(values.includes(value)?values.filter(v=>v!==value):[...values,value]);
  return <LibraryPanel title={registration?"Register physical books":"Book catalogue & registration"} description="Select a title once, then scan each copy. Only a title and its copy barcode are required.">
    <Feedback error={command.error} success={command.success}/>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"><div className="min-w-0 space-y-3">
      <Field label="Find an existing title"><input className={inputClass} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}} placeholder="Title, author or ISBN"/></Field>
      <details className="text-sm"><summary className="cursor-pointer font-medium">Filter by subject or class</summary><div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Field label="Subject filter"><select className={inputClass} value={filterSubject} onChange={e=>{setFilterSubject(e.target.value);setOffset(0);}}><option value="">All subjects</option>{options.data?.subjects?.filter((s:LibraryRow)=>s.source==="library").map((s:LibraryRow)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Class filter"><select className={inputClass} value={filterClass} onChange={e=>{setFilterClass(e.target.value);setOffset(0);}}><option value="">All classes</option>{options.data?.classes?.map((c:LibraryRow)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      </div></details>
      <LoadState resource={data}><div className="space-y-2">{data.data?.map(item=><button type="button" disabled={locked} key={item.id} onClick={()=>choose(item)} className={`w-full rounded-lg border p-3 text-left ${title?.id===item.id?"border-primary bg-info-soft":"border-border hover:bg-surface-muted"}`}>
        <strong className="block">{item.title}{item.edition?` · ${item.edition}`:""}</strong><span className="text-sm text-muted">{item.author?`${item.author} · `:""}{item.available_copies} available / {item.total_copies} copies</span>
        {!!item.subjects?.length&&<span className="block text-xs text-muted">{item.subjects.map((s:LibraryRow)=>s.name).join(", ")}</span>}
      </button>)}{!data.data?.length&&<p className="py-3 text-sm text-muted">No matching titles. Add a title to register its first copy.</p>}</div><Pager offset={offset} setOffset={setOffset} count={data.data?.length??0}/></LoadState>
      <WriteButton variant="secondary" disabled={locked} onClick={()=>choose(null)}>Create a new title</WriteButton>
    </div><div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{title?title.title:creating?"New title":"Select a title"}</h3><span role="status" className="text-sm text-success">{count} registered this session</span></div>
      {title&&!editing&&<div className="flex flex-wrap gap-2 text-sm"><span>{title.edition||"Edition not specified"}</span><WriteButton variant="ghost" disabled={locked} onClick={()=>setEditing(true)}>Edit title details</WriteButton></div>}
      {(creating||editing)&&<div className="space-y-3 rounded-lg border border-border p-3">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Book title"><input className={inputClass} required disabled={locked} value={fields.title} onChange={e=>setFields({...fields,title:e.target.value})}/></Field><Field label="Author (optional)"><input className={inputClass} disabled={locked} value={fields.author} onChange={e=>setFields({...fields,author:e.target.value})}/></Field></div>
        <details><summary className="cursor-pointer text-sm font-medium">Subjects & suitable classes (optional)</summary><p className="my-2 text-xs text-muted">Leave empty for general books. Suitable classes describe the book; they do not restrict borrowers.</p>
          <LoadState resource={options}><Field label="Find or add a subject"><input className={inputClass} disabled={locked} value={subjectSearch} onChange={e=>setSubjectSearch(e.target.value)} placeholder="Search school or library subjects"/></Field>
            <div className="my-2 flex max-h-40 flex-wrap gap-2 overflow-auto">{options.data?.subjects?.filter((s:LibraryRow)=>s.name.toLowerCase().includes(subjectSearch.toLowerCase())).map((s:LibraryRow)=><label key={s.id} className="flex items-center gap-2 rounded border border-border p-2 text-sm"><input type="checkbox" disabled={locked} checked={subjects.includes(s.id)} onChange={()=>toggle(s.id,subjects,setSubjects)}/>{s.name}</label>)}</div>
            <WriteButton variant="secondary" disabled={locked||subjectCommand.busy||!subjectSearch.trim()} onClick={()=>void subjectCommand.run("subjects",{name:subjectSearch},result=>{setSubjects(s=>[...new Set([...s,result.id])]);setSubjectSearch("");options.refresh();},"Library subject saved. Academic settings are unchanged.")}>Add library-only subject</WriteButton><Feedback error={subjectCommand.error} success={subjectCommand.success}/>
            <fieldset className="mt-3"><legend className="text-sm font-medium">Suitable classes — choose any</legend><div className="mt-2 flex max-h-40 flex-wrap gap-2 overflow-auto">{options.data?.classes?.map((c:LibraryRow)=><label key={c.id} className="flex items-center gap-2 rounded border border-border p-2 text-sm"><input type="checkbox" disabled={locked} checked={classes.includes(c.id)} onChange={()=>toggle(c.id,classes,setClasses)}/>{c.name}</label>)}</div></fieldset>
          </LoadState></details>
        <details><summary className="cursor-pointer text-sm font-medium">Edition, ISBN & other title details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">{(["edition","isbn","publisher","category","language"] as const).map(key=><Field key={key} label={key==="isbn"?"Publisher ISBN (optional)":`${key[0].toUpperCase()+key.slice(1)} (optional)`}><input className={inputClass} disabled={locked} value={fields[key]} onChange={e=>setFields({...fields,[key]:e.target.value})}/></Field>)}</div><p className="mt-2 text-xs text-muted">The publisher ISBN describes the edition. Each physical copy still needs its own MyShule barcode.</p></details>
        {editing&&<div className="flex gap-2"><WriteButton disabled={locked||!fields.title.trim()} onClick={()=>void command.run("catalogue",details(),result=>{selected.current={...title,...result};setTitle(selected.current);setEditing(false);data.refresh();options.refresh();},"Title details updated.")}>Save title details</WriteButton><Button variant="secondary" disabled={locked} onClick={()=>{if(title)choose(title);}}>Cancel</Button></div>}
      </div>}
      {(title||creating)&&<details><summary className="cursor-pointer text-sm font-medium">Copy condition, shelf & acquisition details</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Condition"><select className={inputClass} disabled={locked} value={fields.condition} onChange={e=>setFields({...fields,condition:e.target.value})}><option value="good">Good</option><option value="fair">Fair</option><option value="damaged">Damaged</option></select></Field>
        <Field label="Shelf location (optional)"><input className={inputClass} disabled={locked} value={fields.shelf_location} onChange={e=>setFields({...fields,shelf_location:e.target.value})}/></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={locked} checked={fields.lendable} onChange={e=>setFields({...fields,lendable:e.target.checked})}/>May leave the library on loan</label>
        {(["source","acquired_on","price","notes"] as const).map(key=><Field key={key} label={{source:"Source / donor",acquired_on:"Acquired on",price:"Price (KES)",notes:"Acquisition notes"}[key]}><input className={inputClass} disabled={locked} type={key==="acquired_on"?"date":"text"} value={acquisition[key]} onChange={e=>setAcquisition({...acquisition,[key]:e.target.value})}/></Field>)}
      </div></details>}
      <ScannerInput label="Scan a sticker to register" autoFocus={!creating} focusKey={title?.id} disabled={editing||!writable} onPendingChange={setPending} onScan={async code=>{try{await scan(code);}catch(e){setFailed(previous=>({...previous,[code]:errorText(e)}));throw e;}}}/>
      {Object.keys(failed).length>0&&<div className="space-y-2 rounded-lg border border-warning-border p-3 text-sm"><strong>Scans needing attention</strong>{Object.entries(failed).map(([code,message])=><div key={code}><code>{code}</code> · {message}<WriteButton variant="ghost" disabled={locked||!title} onClick={()=>void save(code)}>Retry {code}</WriteButton></div>)}</div>}
      {barcode&&<div className="flex flex-wrap items-center gap-2 text-sm"><code>{barcode}</code><WriteButton disabled={locked||editing||(!title&&!fields.title.trim())} onClick={()=>void save(barcode)}>Register this physical copy</WriteButton>{!title&&!creating&&<span>Select or create its title first.</span>}</div>}
      {title&&<details><summary className="cursor-pointer text-sm font-medium">Register a reserved batch range</summary><p className="my-2 text-xs text-muted">Use this only when every selected sticker will label a copy of {title.title}. Positions follow the printed batch order.</p>
        <LoadState resource={batches}><Field label="Reserved barcode batch"><select className={inputClass} value={batchId} disabled={locked} onChange={e=>{setBatchId(e.target.value);setRange(null);}}><option value="">Choose a batch</option>{batches.data?.map(b=><option key={b.id} value={b.id}>{b.quantity} labels · {b.id.slice(0,8)}</option>)}</select></Field></LoadState>
        <div className="my-3 grid grid-cols-2 gap-3"><Field label="First label position"><input className={inputClass} type="number" min={1} disabled={locked} value={start} onChange={e=>{setStart(Number(e.target.value));setRange(null);}}/></Field><Field label="Last label position"><input className={inputClass} type="number" min={start} disabled={locked} value={end} onChange={e=>{setEnd(Number(e.target.value));setRange(null);}}/></Field></div>
        <Button variant="secondary" disabled={!batchId||locked||checking} onClick={async()=>{setChecking(true);setRangeError("");setRange(null);try{setRange(await api(`registration-range?batch_id=${batchId}&start=${start}&end=${end}`));}catch(e){setRangeError(errorText(e));}finally{setChecking(false);}}}>{checking?"Checking labels…":"Preview reserved range"}</Button>
        <Feedback error={rangeError}/>{range&&<div className="mt-3 space-y-2 text-sm"><p>{range.count} unused labels: <code>{range.barcodes[0]}</code> to <code>{range.barcodes.at(-1)}</code></p><WriteButton disabled={locked} onClick={()=>void command.run("register-batch",{...details(),batch_id:batchId,start,end},result=>{setCount(n=>n+result.count);setRange(null);data.refresh();},"Reserved copies registered together.")}>Confirm registration of {range.count} copies</WriteButton></div>}
      </details>}
    </div></div>
  </LibraryPanel>;
}
