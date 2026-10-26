"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { publishSchoolDataUpdate } from "@/lib/school/school-operational-store";
import { retrieveBankTransactions, type BankConnectionHealth } from "@/lib/finance/payment-channels-client";

export function BankRetrievalControl({revisionId,canWrite}:{revisionId:string;canWrite:boolean}) {
  const tenant=useOptionalSchoolTenantId();
  const query=useSchoolQuery<BankConnectionHealth[]>("/payments/bank-connections",{refetchInterval:30_000});
  const row=query.data?.find(item=>item.revision_id===revisionId);
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [reason,setReason]=useState(""),[fromDate,setFromDate]=useState("");
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(!tenant || !canWrite || busy) return;
    setBusy(true);setError("");setNotice("");
    try {
      const result=await retrieveBankTransactions(tenant,revisionId,reason,fromDate||undefined);
      setNotice(result.message);setOpen(false);setReason("");setFromDate("");
      publishSchoolDataUpdate(tenant,"finance");await query.refetch();
    } catch(cause) {setError(cause instanceof Error?cause.message:"Bank retrieval could not be queued. Retry.");}
    finally {setBusy(false);}
  }
  return <div className="mt-3 space-y-2 rounded-lg bg-surface-muted p-3 text-sm">
    {query.isLoading ? <p role="status">Checking bank retrieval…</p> : query.error ?
      <div role="alert">Bank retrieval status is unavailable. <Button variant="ghost" onClick={()=>void query.refetch()}>Retry status</Button></div> :
      <>
        <p className="font-medium">{row?.last_error ? "Connection needs attention" : row?.last_success_at ? "Automatic bank retrieval" : "Awaiting first bank retrieval"}</p>
        {row?.last_success_at && <p>Last retrieved: {new Date(row.last_success_at).toLocaleString()}</p>}
        {row?.last_error && <p role="alert" className="text-danger">{row.last_error}</p>}
        {row?.scan_date && <p className="text-muted">Next statement date: {row.scan_date}</p>}
      </>}
    {notice && <p role="status">{notice}</p>}
    {canWrite && <Button variant="secondary" disabled={busy || row?.status==='suspended'} onClick={()=>{setOpen(true);setError("");}}>Retrieve / retry</Button>}
    <Modal open={open} title="Retrieve bank transactions" onClose={()=>{if(!busy)setOpen(false);}}>
      <form onSubmit={submit} className="space-y-4">
        <p>Retrieve missing or delayed transactions from this approved school account. Verified incoming payments will follow normal allocation.</p>
        <label className="block space-y-1"><span>Reason</span><textarea className="input-base w-full" required minLength={5} maxLength={1000}
          value={reason} onChange={e=>setReason(e.target.value)} /></label>
        <label className="block space-y-1"><span>Earlier statement date (optional)</span><input className="input-base w-full" type="date"
          value={fromDate} onChange={e=>setFromDate(e.target.value)} />
          <span className="block text-sm text-muted">Leave blank to resume. Backfill covers dates since activation, within the last year. Use reviewed statements for older payments.</span></label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button>
          <Button type="submit" disabled={busy || reason.trim().length<5}>{busy?"Queuing…":"Queue retrieval"}</Button></div>
      </form>
    </Modal>
  </div>;
}
