"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { ScanBarcode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { usePermissions } from "@/components/providers/permission-context";

export type LibraryRow = Record<string, any>;
export const inputClass = "min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-2 focus:outline-primary";
export const api = <T,>(path: string, body?: LibraryRow) => requestDashboardApi<T>(path.startsWith("/api/")?path:`/api/library/smart/${path}`,
  body ? { method:"POST",body,timeoutMs:120000 } : undefined);
export const dateText = (value: unknown) => {
  if(!value)return "—";
  const source=String(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(source))return source;
  const date=new Date(source);
  return Number.isNaN(date.getTime())?"—":new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Nairobi",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
};
export const newRequest = () => crypto.randomUUID();
export const errorText = (error: unknown) => error instanceof Error ? error.message : "The library request failed. Please retry.";
export function useLibraryData<T>(path: string | null) {
  const [data,setData]=useState<T|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  const previousPath=useRef(path);
  useEffect(()=>{
    if(path===null){setData(null);setLoading(false);return;}
    const controller=new AbortController();setLoading(true);setError("");
    if(previousPath.current!==path)setData(null);
    previousPath.current=path;
    const timer=setTimeout(()=>{void requestDashboardApi<T>(`/api/library/smart/${path}`,{signal:controller.signal}).then(value=>{
      if(!controller.signal.aborted)setData(value);
    }).catch(e=>{if(!controller.signal.aborted)setError(errorText(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});},150);
    return()=>{clearTimeout(timer);controller.abort();};
  },[path,revision]);
  const refresh=useCallback(()=>setRevision(v=>v+1),[]);
  return {data,error,loading,refresh};
}
export function LibraryPanel({title,description,children,actions}:{title:string;description:string;children:ReactNode;actions?:ReactNode}) {
  return <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-bold text-foreground">{title}</h2><p className="mt-1 max-w-3xl text-sm text-muted">{description}</p></div>{actions}</div>{children}
  </section>;
}
export function Feedback({error,success}:{error?:string;success?:string}) {
  return <>{error&&<p role="alert" className="my-3 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {success&&<p role="status" className="my-3 rounded-xl border border-success-border bg-success-soft p-3 text-sm text-success">{success}</p>}</>;
}
export function LoadState({resource,empty,children}:{resource:{loading:boolean;error:string;refresh:()=>void;data?:unknown};empty?:boolean;children:ReactNode}) {
  if(resource.error)return <div role="alert" className="rounded-xl border border-danger-border p-4"><p>{resource.error}</p><Button variant="secondary" onClick={resource.refresh}><RefreshCw size={16}/> Retry</Button></div>;
  if(resource.loading&&resource.data==null)return <p role="status" className="py-6 text-muted">Loading school library records…</p>;
  if(empty)return <p className="rounded-xl bg-surface-muted p-5 text-sm text-muted">No matching records. Adjust the search, or register your first book using an unused barcode.</p>;
  return <>{children}</>;
}
export function Field({label,children}:{label:string;children:ReactNode}) {
  return <label className="block min-w-0 space-y-1 text-sm font-medium text-foreground"><span>{label}</span>{children}</label>;
}
export function Pager({offset,setOffset,count}:{offset:number;setOffset:(v:number)=>void;count:number}) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted"><span>Showing {count ? offset+1 : 0}–{offset+count}</span>
    <div className="flex gap-2"><Button variant="secondary" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-50))}>Previous</Button>
      <Button variant="secondary" disabled={count<50} onClick={()=>setOffset(offset+50)}>Next</Button></div></div>;
}
export function WriteButton(props: React.ComponentProps<typeof Button>) {
  const {hasPermission}=usePermissions();const allowed=hasPermission("library:write");
  return <Button {...props} disabled={props.disabled||!allowed} title={!allowed?"Library write permission is required":props.title}/>;
}

export function soundFeedback(success:boolean) {
  if(localStorage.getItem("myshule-library-scanner-sound")!=="true")return;
  try {
    const context=new AudioContext(),oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.frequency.value=success?880:240;gain.gain.value=.06;
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.1);
    oscillator.onended=()=>{void context.close();};
  }catch{/* Visual feedback remains available if browser audio is disabled. */}
}
/** Only this focused field consumes Enter. No global keyboard interception. */
export function ScannerInput({onScan,disabled=false,label="Scan barcode",autoFocus=false,focusKey,onPendingChange}:{onScan:(code:string)=>Promise<void>;disabled?:boolean;label?:string;autoFocus?:boolean;focusKey?:string;onPendingChange?:(pending:number)=>void}) {
  const [value,setValue]=useState(""),[error,setError]=useState(""),[pending,setPending]=useState(0);
  const field=useRef<HTMLInputElement>(null),queue=useRef(Promise.resolve()),inFlight=useRef(new Set<string>()),handler=useRef(onScan);
  useEffect(()=>{handler.current=onScan;},[onScan]);
  // Focus only on workspace activation, becoming enabled, or an explicit title
  // selection. Ordinary form edits and background refreshes never steal focus.
  useEffect(()=>{if(autoFocus&&!disabled)field.current?.focus();},[autoFocus,disabled,focusKey]);
  useEffect(()=>{onPendingChange?.(pending);},[pending,onPendingChange]);
  const scan=(event:FormEvent)=>{
    event.preventDefault();if(!value||disabled)return;
    const code=value.replace(/[\r\n]+$/,"");setValue("");field.current?.focus();
    if(inFlight.current.has(code)){setError(`${code} is already being processed.`);return;}
    inFlight.current.add(code);setPending(n=>n+1);
    queue.current=queue.current.then(async()=>{
      try{await handler.current(code);setError("");soundFeedback(true);}
      catch(e){setError(errorText(e));soundFeedback(false);}
      finally{inFlight.current.delete(code);setPending(n=>n-1);}
      // Let React commit title/profile changes before the next queued scan.
      await new Promise(resolve=>setTimeout(resolve,0));
    });
  };
  return <div className="space-y-2"><form onSubmit={scan} className="flex flex-wrap items-end gap-2">
    <label className="min-w-0 flex-1 basis-full text-sm font-medium sm:basis-0"><span className="mb-1 flex items-center gap-2"><ScanBarcode size={18}/>{label}</span>
      <input ref={field} autoFocus={autoFocus} aria-label={label} value={value} onChange={e=>setValue(e.target.value)} disabled={disabled}
        className={`${inputClass} font-mono`} autoComplete="off" spellCheck={false} placeholder="Scan or type the exact barcode, then Enter"/></label>
    <Button type="submit" disabled={disabled||!value}>Add scan</Button><Button variant="secondary" onClick={()=>field.current?.focus()}>Focus scanner</Button>
  </form><p className="text-xs text-muted">USB keyboard mode · Enter suffix · Manual entry supported{pending>0?` · ${pending} scan(s) processing`:""}</p>
  <Feedback error={error}/></div>;
}

export function BorrowerPicker({selected,onSelect,includeInactive=false}:{selected:LibraryRow|null;onSelect:(person:LibraryRow|null)=>void;includeInactive?:boolean}) {
  const [search,setSearch]=useState(""),[kind,setKind]=useState(""),[offset,setOffset]=useState(0);
  const people=useLibraryData<LibraryRow[]>(selected?null:`borrowers?search=${encodeURIComponent(search)}&type=${kind}&offset=${offset}&include_inactive=${includeInactive}`);
  const profile=useLibraryData<LibraryRow>(selected?`history?subject_id=${selected.subject_id}&borrower_type=${selected.borrower_type}&status=active`:null);
  if(selected)return <div className="rounded-xl border border-info-border bg-info-soft p-4">
    <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">{selected.name}</h3><p className="text-sm">{selected.identifier} · {selected.borrower_type} {selected.class_name} {selected.stream_name}</p></div>
      <Button variant="secondary" onClick={()=>onSelect(null)}>Change borrower</Button></div>
    <LoadState resource={profile}><div className="mt-3 text-sm">{profile.data?.outstanding??0} outstanding · {profile.data?.overdue??0} overdue · Limit: {profile.data?.max_active_loans??"No school limit configured"}</div>
      {profile.data?.loans?.length>0&&<details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Currently held books</summary><ul className="mt-2 space-y-1">{profile.data?.loans.map((loan:LibraryRow)=><li key={loan.id}>{loan.title} · {loan.barcode||loan.accession_number} · Due {dateText(loan.due_on)}{loan.overdue?" · Overdue":""}</li>)}</ul></details>}</LoadState>
  </div>;
  return <div className="space-y-3"><div className="grid gap-3 sm:grid-cols-[1fr_180px]">
    <Field label="Find a borrower"><input className={inputClass} value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}} placeholder="Name, admission number, staff number or class"/></Field>
    <Field label="Borrower type"><select className={inputClass} value={kind} onChange={e=>{setKind(e.target.value);setOffset(0);}}><option value="">Students & staff</option><option value="student">Students</option><option value="staff">Staff</option></select></Field></div>
    <LoadState resource={people}><div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">{people.data?.map(p=><button type="button" key={`${p.borrower_type}:${p.subject_id}`} className="rounded-xl border border-border p-3 text-left hover:bg-surface-muted focus:outline-2 focus:outline-primary" onClick={()=>onSelect(p)}>
      <span className="block font-semibold">{p.name}</span><span className="text-xs text-muted">{p.identifier} · {p.borrower_type} · {p.class_name} {p.stream_name}</span></button>)}</div>
      {!people.data?.length&&<p className="text-sm text-muted">No matching students or staff. Check the school’s student or staff register.</p>}
      <Pager offset={offset} setOffset={setOffset} count={people.data?.length??0}/></LoadState></div>;
}
