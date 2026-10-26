"use client";
import { useRef,useState,type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes,formatActivityDate,toMinorUnits } from "@/lib/billing/billing-utils";

type Student={student_id:string;student_name?:string|null};
type Source={source_kind:"manual"|"online";source_id:string;receipt_number:string;available_minor:string;reserved_minor:string};
type Refund={id:string;amount_minor:string;receipt_number:string;student_name:string;reason:string;status:string;
  can_review:boolean;can_cancel:boolean;can_complete:boolean;external_reference?:string;paid_at?:string;decision_reason?:string;cancellation_reason?:string};
const endpoint="/billing/credit-refunds";

export function CreditRefunds({student,onClose}:{student?:Student|null;onClose?:()=>void}) {
  const tenant=useOptionalSchoolTenantId(),client=useQueryClient(),{hasPermission}=usePermissions();
  const [open,setOpen]=useState(false),[offset,setOffset]=useState(0),[selected,setSelected]=useState<Refund|null>(null);
  const [action,setAction]=useState<"review"|"cancel"|"payout"|null>(null),[confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const inFlight=useRef(false),submission=useRef({key:"",body:""});
  const sources=useSchoolQuery<{items:Source[]}>(student?`${endpoint}/sources/${encodeURIComponent(student.student_id)}`:null);
  const query=useSchoolQuery<{items:Refund[]}>(open&&!student?`${endpoint}?offset=${offset}`:null);
  const creating=Boolean(student),editing=creating||Boolean(selected),canWrite=hasPermission("billing:write");
  function reset(){setSelected(null);setAction(null);setConfirmed(false);setError("");submission.current={key:"",body:""};}
  function close(){if(busy)return;reset();setOpen(false);onClose?.();}
  function choose(row:Refund,next:typeof action){reset();setNotice("");setSelected(row);setAction(next);}
  async function save(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(!tenant||!confirmed||inFlight.current||!canWrite)return;
    const form=new FormData(event.currentTarget);let body:Record<string,string>,path=endpoint;
    if(creating){
      const source=sources.data?.items.find(s=>`${s.source_kind}:${s.source_id}`===form.get("source"));
      const amount=toMinorUnits(String(form.get("amount")??""));
      if(!source||!amount||BigInt(amount)>BigInt(source.available_minor)){setError("Choose a receipt and an amount within its available credit.");return;}
      submission.current.key ||= crypto.randomUUID();
      body={source_kind:source.source_kind,source_id:source.source_id,amount_minor:amount,reason:String(form.get("reason")??"").trim(),idempotency_key:submission.current.key};
    }else if(selected&&action==="payout"){
      const paid=new Date(String(form.get("paid_at")??""));
      if(!Number.isFinite(paid.getTime())||paid.getTime()>Date.now()){setError("Enter the actual payout date, which cannot be in the future.");return;}
      path+=`/${selected.id}/payout`;body={external_reference:String(form.get("reference")??"").trim(),evidence_reference:String(form.get("evidence")??"").trim(),paid_at:paid.toISOString()};
    }else if(selected){path+=`/${selected.id}/decision`;body={decision:action==="cancel"?"cancel":String(form.get("decision")),reason:String(form.get("reason")??"").trim()};}else return;
    if(("reason" in body&&body.reason.length<5)||("evidence_reference" in body&&(body.evidence_reference.length<10||body.external_reference.length<3))){setError("Complete the required notes and payment evidence.");return;}
    const signature=JSON.stringify(body);
    if(submission.current.body&&submission.current.body!==signature){setError("A request was already attempted. Retry its original details, or close and check the queue before changing them.");return;}
    submission.current.body=signature;inFlight.current=true;setBusy(true);setError("");
    try{
      const result=await requestDashboardApi<{status:string}>(path,{tenantId:tenant,method:"POST",body});
      setNotice(result.status==="pending"?"Credit reserved for independent Principal review. No payout has been made.":result.status==="completed"?
        "Payout recorded. The fee statement and remaining credit have updated.":result.status==="approved"?
        "Refund approved. Return the approved amount to the original payer through the original channel, then record its evidence.":"Reservation released. The credit is available for fees again.");
      reset();onClose?.();setOpen(true);await client.invalidateQueries({queryKey:["school",tenant]});
    }catch(cause){setError(cause instanceof Error?cause.message:"Unable to save the refund. Retry the original details.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  const label=creating?"Request refund":action==="payout"?"Confirm payout":action==="cancel"?"Confirm cancellation":"Confirm decision";
  return <>
    <Button variant="secondary" disabled={!hasPermission("billing:read")} onClick={()=>{reset();setNotice("");setOpen(true);}}>Credit refunds</Button>
    <Modal open={open||creating} title="Credit refunds" size="lg" mobileFullScreen onClose={close}
      footer={<><Button variant="secondary" disabled={busy} onClick={close}>Close</Button>{editing&&<Button form="credit-refund-form" type="submit" disabled={!canWrite||busy||!confirmed}>{busy?"Saving…":label}</Button>}</>}>
      <div className="space-y-4">
        {notice&&<p role="status" className="rounded-lg bg-success-soft p-3 text-sm">{notice}</p>}
        {(error||query.error||sources.error)&&<p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error||query.error?.message||sources.error?.message}</p>}
        <p className="text-sm text-muted">Reserve unused credit, obtain independent Principal approval, then record the actual payout. MyShule records the refund; staff make the payment through the original channel.</p>
        {editing?<form id="credit-refund-form" onSubmit={save} className="space-y-4">
          <p className="font-semibold">{student?.student_name??selected?.student_name}{selected?` · ${formatMinorKes(selected.amount_minor)} · ${selected.receipt_number}`:""}</p>
          {creating?<>
            <label className="block text-sm">Credit receipt<select name="source" required className="input-base mt-1 w-full" disabled={busy||sources.isLoading} defaultValue=""><option value="">Choose available credit</option>
              {sources.data?.items.map(s=><option key={`${s.source_kind}:${s.source_id}`} value={`${s.source_kind}:${s.source_id}`} disabled={BigInt(s.available_minor)<=BigInt(0)}>{s.receipt_number} · {formatMinorKes(s.available_minor)} available · {formatMinorKes(s.reserved_minor)} reserved</option>)}</select></label>
            {sources.isLoading?<p role="status">Loading available credit…</p>:!sources.error&&!sources.data?.items.length?<p>No unused credit is available for this learner. Review their statement before requesting a refund.</p>:null}
            <Button variant="ghost" type="button" disabled={busy||sources.isFetching} onClick={()=>void sources.refetch()}>Refresh credit</Button>
            <label className="block text-sm">Refund amount (KES)<input name="amount" inputMode="decimal" required className="input-base mt-1 w-full" disabled={busy}/></label>
          </>:<p className="text-sm">{selected?.reason}</p>}
          {action==="payout"?<>
            <label className="block text-sm">Outgoing payment reference<input name="reference" required minLength={3} maxLength={100} className="input-base mt-1 w-full" disabled={busy}/></label>
            <label className="block text-sm">Paid at<input name="paid_at" type="datetime-local" step="1" required className="input-base mt-1 w-full" disabled={busy}/></label>
            <label className="block text-sm">Evidence location and details<textarea name="evidence" required minLength={10} maxLength={1000} className="input-base mt-1 w-full" disabled={busy}/></label>
          </>:<>
            {action==="review"&&<label className="block text-sm">Decision<select name="decision" className="input-base mt-1 w-full" disabled={busy}><option value="approve">Approve refund</option><option value="reject">Reject refund</option></select></label>}
            <label className="block text-sm">Reason<textarea name="reason" required minLength={5} maxLength={1000} className="input-base mt-1 w-full" disabled={busy}/></label>
          </>}
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>{action==="payout"?"I checked the approved amount, original payer, original payment channel and the actual payout evidence.":action==="cancel"?"No payout has been made for this refund.":"I checked the learner, unused credit, refund amount and reason."}</label>
        </form>:<>
          <Button variant="ghost" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh refunds</Button>
          {query.isLoading?<p role="status">Loading refunds…</p>:!query.error&&!query.data?.items.length?<p>No credit refunds on this page. In Invoices, open Learner balances and choose Refund credit for a learner with unused credit.</p>:null}
          {query.data?.items.map(row=><article key={row.id} className="space-y-2 rounded-xl border border-border p-4 text-sm">
            <p className="break-words font-semibold">{row.student_name} · {formatMinorKes(row.amount_minor)}</p><p className="break-words">{row.receipt_number} · {row.status}</p><p>{row.reason}</p>
            {row.decision_reason&&<p>Review: {row.decision_reason}</p>}{row.cancellation_reason&&<p>Cancelled: {row.cancellation_reason}</p>}
            {row.external_reference&&<p className="break-words">Paid {formatActivityDate(row.paid_at??"")} · {row.external_reference}</p>}
            <div className="flex flex-wrap gap-2">{row.can_review&&<Button size="sm" disabled={!canWrite} onClick={()=>choose(row,"review")}>Review refund</Button>}
              {row.can_complete&&<Button size="sm" disabled={!canWrite} onClick={()=>choose(row,"payout")}>Record payout</Button>}
              {row.can_cancel&&<Button size="sm" variant="secondary" disabled={!canWrite} onClick={()=>choose(row,"cancel")}>Cancel request</Button>}</div>
          </article>)}
          <div className="flex justify-end gap-2"><Button variant="secondary" disabled={!offset||query.isFetching} onClick={()=>setOffset(offset-50)}>Previous page</Button><Button variant="secondary" disabled={(query.data?.items.length??0)<50||query.isFetching} onClick={()=>setOffset(offset+50)}>Next page</Button></div>
        </>}
      </div>
    </Modal>
  </>;
}
