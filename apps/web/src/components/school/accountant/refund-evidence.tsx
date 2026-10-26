"use client";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes,formatActivityDate } from "@/lib/billing/billing-utils";

type Receipt={id:string;receipt_number:string;amount_minor:string;metadata?:{source?:string}};
type Evidence={id:string;amount_minor:string;external_reference:string;evidence_reference:string;paid_at:string;
  reason:string;status:string;can_review:boolean;decision_reason?:string;receipt_number?:string;student_name?:string};
const endpoint="/billing/refund-evidence";

/** Retrospective payout evidence for full reversed receipts; never initiates a transfer. */
export function RefundEvidence({receipt,onClose}:{receipt?:Receipt|null;onClose?:()=>void}) {
  const tenant=useOptionalSchoolTenantId(),client=useQueryClient(),{hasPermission}=usePermissions();
  const [open,setOpen]=useState(false),[offset,setOffset]=useState(0),[review,setReview]=useState<Evidence|null>(null);
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const inFlight=useRef(false),submitted=useRef("");
  const query=useSchoolQuery<{items:Evidence[]}>(open&&!receipt?`${endpoint}?offset=${offset}`:null);
  const rows=query.data?.items??[];
  function close(){if(busy)return;setOpen(false);setReview(null);setConfirmed(false);setError("");submitted.current="";onClose?.();}
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!tenant||!confirmed||inFlight.current||!hasPermission("billing:write"))return;
    const form=new FormData(event.currentTarget);
    const reason=String(form.get("reason")??"").trim();
    if(reason.length<5){setError("Give at least five characters of notes.");return;}
    let body:Record<string,string>;
    if(receipt){
      const paid=new Date(String(form.get("paid_at")??""));
      if(!Number.isFinite(paid.getTime())||paid.getTime()>Date.now()){setError("Enter the actual refund date, which cannot be in the future.");return;}
      body={receipt_id:receipt.id,source_kind:receipt.metadata?.source==="stk_payment"?"stk":"manual",amount_minor:receipt.amount_minor,
        external_reference:String(form.get("reference")??"").trim(),evidence_reference:String(form.get("evidence")??"").trim(),paid_at:paid.toISOString(),reason};
      if(body.external_reference.length<3||body.evidence_reference.length<10){setError("Provide the outgoing reference and where its evidence can be checked.");return;}
    }else if(review) body={decision:String(form.get("decision")),reason};else return;
    const signature=JSON.stringify(body);
    if(submitted.current&&submitted.current!==signature){setError("A request was already attempted. Retry its original details or reopen the review after checking the queue.");return;}
    submitted.current=signature;inFlight.current=true;setBusy(true);setError("");
    try{
      const result=await requestDashboardApi<{status:string}>(review?`${endpoint}/${review.id}/decision`:endpoint,{tenantId:tenant,method:"POST",body});
      setNotice(result.status==="pending_review"?"Awaiting independent Principal review. No transfer or additional ledger posting was made.":
        result.status==="approved"?"Refund evidence approved. The existing reversal remains the only accounting entry.":"Evidence rejected. The original financial records remain unchanged.");
      onClose?.();setReview(null);setOpen(true);setConfirmed(false);submitted.current="";
      await client.invalidateQueries({queryKey:["school",tenant]});
    }catch(cause){setError(cause instanceof Error?cause.message:"Unable to save refund evidence. Retry the original details.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  return <>
    <Button variant="secondary" disabled={!hasPermission("billing:read")} onClick={()=>{setNotice("");setOpen(true);}}>Refund evidence</Button>
    <Modal open={open||Boolean(receipt)} size="lg" mobileFullScreen title="Refund evidence" onClose={close}
      footer={<><Button variant="secondary" disabled={busy} onClick={close}>Close</Button>{(receipt||review)&&<Button form="receipt-refund-form" type="submit" disabled={busy||!confirmed||!hasPermission("billing:write")}>{busy?"Saving…":receipt?"Submit evidence":"Confirm decision"}</Button>}</>}>
      <div className="space-y-4">
        {notice&&<p role="status" className="rounded-lg bg-success-soft p-3 text-sm">{notice}</p>}
        {(error||query.error)&&<p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error||query.error?.message}</p>}
        <p className="text-sm text-muted">Record proof of a full refund already paid outside MyShule, after the receipt reversal was approved and executed. This does not send money. This form covers full reversed receipts only.</p>
        {(receipt||review)?<form id="receipt-refund-form" onSubmit={save} className="space-y-4">
          <p className="font-semibold">{receipt?.receipt_number??review?.external_reference} · {formatMinorKes(receipt?.amount_minor??review?.amount_minor??"0")}</p>
          {receipt?<>
            <label className="block text-sm">Outgoing payment reference<input name="reference" required minLength={3} maxLength={100} className="input-base mt-1 w-full" disabled={busy}/></label>
            <label className="block text-sm">Refund paid at<input name="paid_at" type="datetime-local" required className="input-base mt-1 w-full" disabled={busy}/></label>
            <label className="block text-sm">Evidence location and details<textarea name="evidence" required minLength={10} maxLength={1000} className="input-base mt-1 w-full" disabled={busy}/></label>
          </>:<><p className="break-words text-sm">{review?.student_name} · {review?.receipt_number}</p><p className="break-words text-sm">{review?.evidence_reference}</p><p className="text-sm">Paid {formatActivityDate(review?.paid_at??"")} · {review?.reason}</p>
            <label className="block text-sm">Decision<select name="decision" className="input-base mt-1 w-full" disabled={busy}><option value="approve">Approve evidence</option><option value="reject">Reject evidence</option></select></label></>}
          <label className="block text-sm">{receipt?"Reason":"Review notes"}<textarea name="reason" required minLength={5} maxLength={1000} className="input-base mt-1 w-full" disabled={busy}/></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I checked the full amount, original payer and outgoing account against the executed reversal and payout evidence.</label>
        </form>:<>
          <Button variant="ghost" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh evidence</Button>
          {query.isLoading?<p role="status">Loading refund evidence…</p>:!query.error&&!rows.length?<p>No refund evidence on this page. Open Payments, find an already reversed receipt and choose Record refund evidence.</p>:null}
          {rows.map(row=><article key={row.id} className="space-y-2 rounded-xl border border-border p-4 text-sm">
            <p className="break-words font-semibold">{row.external_reference} · {formatMinorKes(row.amount_minor)}</p><p>{row.status.replaceAll("_"," ")}</p>
            <p className="break-words">{row.student_name} · {row.receipt_number}</p>
            <p className="break-words">{row.evidence_reference}</p><p>{row.reason}</p>{row.decision_reason&&<p>Decision: {row.decision_reason}</p>}
            {row.can_review&&<Button size="sm" disabled={!hasPermission("billing:write")} onClick={()=>{setReview(row);setConfirmed(false);setError("");setNotice("");submitted.current="";}}>Review evidence</Button>}
          </article>)}
          <div className="flex justify-end gap-2"><Button variant="secondary" disabled={!offset||query.isFetching} onClick={()=>setOffset(offset-50)}>Previous page</Button><Button variant="secondary" disabled={rows.length<50||query.isFetching} onClick={()=>setOffset(offset+50)}>Next page</Button></div>
        </>}
      </div>
    </Modal>
  </>;
}
