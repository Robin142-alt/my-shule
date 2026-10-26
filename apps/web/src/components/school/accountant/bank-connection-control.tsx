"use client";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { configureSchoolBank, testSchoolBank, type CollectionProvider, type CollectionChannelRevision } from "@/lib/finance/payment-channels-client";

export function BankConnectionControl({row,provider,onUpdated}:{row:CollectionChannelRevision;provider:CollectionProvider;onUpdated:()=>Promise<unknown>}) {
  const tenant=useOptionalSchoolTenantId();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [environment,setEnvironment]=useState(row.environment ?? 'sandbox');
  const [credentials,setCredentials]=useState<Record<string,string>>({});
  async function perform(save:boolean) {
    if(!tenant || busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const result=save ? await configureSchoolBank(tenant,row.id,{connection_mode:'bank_api',environment,credentials}) : await testSchoolBank(tenant,row.id);
      if(save) {setOpen(false);setCredentials({});setNotice('Credentials saved securely. Test the bank connection next.');}
      else if(result.last_error) setError(result.last_error);
      else setNotice('Bank account check passed. Super Admin can now complete activation.');
      await onUpdated();
    } catch(cause) {setError(cause instanceof Error?cause.message:'Unable to update the bank connection. Retry.');}
    finally {setBusy(false);}
  }
  function submit(event:FormEvent) {event.preventDefault();void perform(true);}
  return <div className="mt-3 space-y-2">
    {notice && <p role="status" className="text-sm">{notice}</p>}
    {error && !open && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" disabled={busy} onClick={()=>{setOpen(true);setError('');setCredentials({});}}>Configure bank connection</Button>
      {['connecting','ready'].includes(row.status) && <Button variant="secondary" disabled={busy} onClick={()=>void perform(false)}>{busy?'Checking…':'Test bank connection'}</Button>}
    </div>
    <Modal open={open} title={`Connect ${provider.name}`} onClose={()=>{if(!busy){setOpen(false);setCredentials({});}}}>
      <form onSubmit={submit} className="space-y-4">
        <p>{row.account_name} · <span className="font-mono">{row.account_number}</span></p>
        <p className="text-sm text-muted">{provider.assessment?.onboarding || 'Use credentials issued for this school’s approved account. Complete the bank’s onboarding before testing.'}</p>
        <label className="block space-y-1"><span>Environment</span><select className="input-base w-full" value={environment} onChange={e=>setEnvironment(e.target.value)}>
          {(provider.bank_api_environments ?? ['sandbox','production']).map(value=>
            <option key={value} value={value}>{value==='sandbox'?'Sandbox — testing only':'Production'}</option>)}</select></label>
        {provider.credential_fields.map(field=><label className="block space-y-1" key={field.key}>
          <span>{field.label}{!field.required?' (optional)':''}</span>
          {field.multiline?<textarea className="input-base w-full font-mono text-sm" rows={5} autoComplete="off" spellCheck={false}
            required={field.required} maxLength={8192} value={credentials[field.key] ?? ''} onChange={e=>setCredentials({...credentials,[field.key]:e.target.value})}/>:
            <input className="input-base w-full" type={field.secret?'password':'text'} autoComplete="off" required={field.required} maxLength={8192}
              value={credentials[field.key] ?? ''} onChange={e=>setCredentials({...credentials,[field.key]:e.target.value})}/>}
          {field.description && <span className="block text-sm text-muted">{field.description}</span>}
        </label>)}
        {error && <p role="alert" className="text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>{setOpen(false);setCredentials({});}}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy?'Saving…':'Save connection'}</Button></div>
      </form>
    </Modal>
  </div>;
}
