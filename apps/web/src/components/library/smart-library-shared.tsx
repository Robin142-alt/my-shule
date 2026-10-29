"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ScanBarcode, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { usePermissions } from "@/components/providers/permission-context";
import { onFormNavigationKeyDown } from "@/lib/accessibility/keyboard-navigation";

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
export function useCommand() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
  const pending=useRef(false),requests=useRef(new Map<string,string>());
  const run=async(path:string,body:LibraryRow,onSuccess:(result:LibraryRow)=>void,message:string,propagate=false)=>{
    if(pending.current){if(propagate)throw new Error("Wait for the previous library action to finish.");return;}
    pending.current=true;setBusy(true);setError("");setSuccess("");
    const fingerprint=JSON.stringify({path,body});
    const requestId=requests.current.get(fingerprint)??newRequest();requests.current.set(fingerprint,requestId);
    try{const result=await api<LibraryRow>(path,{...body,request_id:requestId});requests.current.delete(fingerprint);setSuccess(message);onSuccess(result);return "saved" as const;}
    catch(e){if(propagate)throw e;setError(errorText(e));return /^Request failed: 4(?!08)\d\d\b/.test(errorText(e))?"rejected" as const:"unknown" as const;}
    finally{pending.current=false;setBusy(false);}
  };
  return {busy,error,success,run};
}
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
  return <section onKeyDown={onFormNavigationKeyDown} className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
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
export function Pager({offset,setOffset,count,pageSize=50}:{offset:number;setOffset:(v:number)=>void;count:number;pageSize?:number}) {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted"><span>Showing {count ? offset+1 : 0}–{offset+count}</span>
    <div className="flex gap-2"><Button variant="secondary" disabled={!offset} onClick={()=>setOffset(Math.max(0,offset-pageSize))}>Previous</Button>
      <Button variant="secondary" disabled={count<pageSize} onClick={()=>setOffset(offset+pageSize)}>Next</Button></div></div>;
}
export function WriteButton(props: React.ComponentProps<typeof Button>) {
  const {hasPermission}=usePermissions();const allowed=hasPermission("library:write");
  return <Button {...props} disabled={props.disabled||!allowed} title={!allowed?"Library write permission is required":props.title}/>;
}

let scannerAudio:AudioContext|undefined;
async function prepareScannerAudio(force=false) {
  try {
    if(!force&&localStorage.getItem("myshule-library-scanner-sound")!=="true")return;
    if(!scannerAudio||scannerAudio.state==="closed")scannerAudio=new AudioContext();
    if(scannerAudio.state==="suspended"){
      // Some browsers leave resume pending while sound is blocked. Do not
      // leave the test button waiting indefinitely for an optional feature.
      let timer:ReturnType<typeof setTimeout>|undefined;
      try{await Promise.race([scannerAudio.resume(),new Promise<void>(resolve=>{timer=setTimeout(resolve,2000);})]);}
      finally{clearTimeout(timer);}
    }
    return scannerAudio.state==="running"?scannerAudio:undefined;
  }catch{return;}
}
export async function soundFeedback(success:boolean,force=false):Promise<boolean> {
  try {
    const context=await prepareScannerAudio(force);
    if(!context)return false;
    const oscillator=context.createOscillator(),gain=context.createGain();
    oscillator.frequency.value=success?880:240;gain.gain.value=.06;
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(context.currentTime+.1);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
    return true;
  }catch{return false;}
}
const scannerCompletionStorage="myshule-library-scanner-completion";
const scannerSettingsEvent="myshule-scanner-settings-changed";
type ScannerCompletionKey="enter"|"tab";
function readScannerCompletion():ScannerCompletionKey {
  try{return localStorage.getItem(scannerCompletionStorage)==="tab"?"tab":"enter";}catch{return "enter";}
}
function subscribeScannerCompletion(notify:()=>void) {
  const storage=(event:StorageEvent)=>{if(event.key===scannerCompletionStorage||event.key===null)notify();};
  window.addEventListener("storage",storage);window.addEventListener(scannerSettingsEvent,notify);
  return()=>{window.removeEventListener("storage",storage);window.removeEventListener(scannerSettingsEvent,notify);};
}
export function useScannerCompletionKey() {
  return useSyncExternalStore(subscribeScannerCompletion,readScannerCompletion,():ScannerCompletionKey=>"enter");
}
export function saveScannerCompletionKey(key:ScannerCompletionKey) {
  localStorage.setItem(scannerCompletionStorage,key);
  window.dispatchEvent(new Event(scannerSettingsEvent));
}
export type ScanCompletion="enter"|"tab"|"button";
/** Keyboard/HID input is transport- and brand-independent. Only this field
 * consumes configured suffixes; unrelated inputs keep normal navigation. */
export function ScannerInput({onScan,disabled=false,label="Scan barcode",autoFocus=false,focusKey,onPendingChange,submitLabel="Add scan",focusLabel="Focus scanner",errorDurationMs}:{onScan:(code:string,completion:ScanCompletion)=>Promise<void>;disabled?:boolean;label?:string;autoFocus?:boolean;focusKey?:string;onPendingChange?:(pending:number)=>void;submitLabel?:string;focusLabel?:string;errorDurationMs?:number}) {
  const [value,setValue]=useState(""),[error,setError]=useState<{message:string}|null>(null),[pending,setPending]=useState(0),[focused,setFocused]=useState(false);
  const hintId=useId();
  const completionKey=useScannerCompletionKey();
  const field=useRef<HTMLInputElement>(null),queue=useRef(Promise.resolve()),inFlight=useRef(new Set<string>()),handler=useRef(onScan);
  useEffect(()=>{handler.current=onScan;},[onScan]);
  useEffect(()=>{
    if(!error||!errorDurationMs)return;
    const timer=setTimeout(()=>setError(null),errorDurationMs);
    return()=>clearTimeout(timer);
  },[error,errorDurationMs]);
  // Focus only on workspace activation, becoming enabled, or an explicit title
  // selection. Ordinary form edits and background refreshes never steal focus.
  useEffect(()=>{if(autoFocus&&!disabled)field.current?.focus({preventScroll:true});},[autoFocus,disabled,focusKey]);
  useEffect(()=>{onPendingChange?.(pending);},[pending,onPendingChange]);
  useEffect(()=>{
    const blur=()=>setFocused(false),focus=()=>setFocused(document.activeElement===field.current);
    window.addEventListener("blur",blur);window.addEventListener("focus",focus);
    return()=>{window.removeEventListener("blur",blur);window.removeEventListener("focus",focus);};
  },[]);
  const scan=(completion:ScanCompletion)=>{
    if(disabled)return;
    const code=(field.current?.value??value).replace(/[\r\n]+$/,"");if(!code)return;
    setValue("");setError(null);field.current?.focus({preventScroll:true});
    // Unlock audio during the input gesture, before a queued network request.
    // Audio and browser-storage failures must never reject the scan queue.
    void prepareScannerAudio();
    if(inFlight.current.has(code)){setError({message:`${code} is already being processed.`});return;}
    inFlight.current.add(code);setPending(n=>n+1);
    queue.current=queue.current.then(async()=>{
      try{await handler.current(code,completion);setError(null);void soundFeedback(true);}
      catch(e){setError({message:`${code} · ${errorText(e)}`});void soundFeedback(false);}
      finally{inFlight.current.delete(code);setPending(n=>n-1);}
      // Let React commit title/profile changes before the next queued scan.
      await new Promise(resolve=>setTimeout(resolve,0));
    });
  };
  // Reserve two lines so losing focus cannot move a clicked control between
  // pointer-down and pointer-up on narrow screens.
  return <div className="space-y-2"><p role="status" className={`min-h-10 text-sm ${focused&&!disabled?"text-success":"text-muted"}`}>
    {disabled?"Scanner input is paused.":focused?"Ready for scanner input.":"Scanner input is not focused."}</p>
  <form data-keyboard-navigation="off" onSubmit={event=>{event.preventDefault();scan("button");}} className="flex flex-wrap items-end gap-2">
    <label className="min-w-0 flex-1 basis-full text-sm font-medium sm:basis-0"><span className="mb-1 flex items-center gap-2"><ScanBarcode size={18}/>{label}</span>
      <input ref={field} autoFocus={autoFocus} aria-label={label} aria-describedby={hintId} value={value} onChange={e=>setValue(e.target.value)} disabled={disabled}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onKeyDown={e=>{
          if(e.nativeEvent.isComposing||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
          if(e.key==="Enter"){e.preventDefault();scan("enter");}
          else if(e.key==="Tab"&&completionKey==="tab"&&field.current?.value){e.preventDefault();scan("tab");}
        }}
        className={`${inputClass} font-mono`} autoComplete="off" spellCheck={false} placeholder={`Scan or type the exact barcode, then ${completionKey==="tab"?"Tab or Enter":"Enter"}`}/></label>
    <Button type="submit" disabled={disabled||!value}>{submitLabel}</Button><Button variant="secondary" disabled={disabled} onClick={()=>field.current?.focus()}>{focusLabel}</Button>
  </form><p id={hintId} className="text-xs text-muted">{value?`${value.length} characters received. Press ${completionKey==="tab"?"Tab or Enter":"Enter"} or choose “${submitLabel}”. If a scan stops here, match its suffix in Scanner Settings.`:`Keyboard / HID mode · ${completionKey==="tab"?"Tab or Enter":"Enter"} suffix · Manual entry supported`}{pending>0?` · ${pending} scan(s) processing`:""}</p>
  <Feedback error={error?.message}/></div>;
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
