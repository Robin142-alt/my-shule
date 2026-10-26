"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permission-context";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes } from "@/lib/billing/billing-utils";

type Discrepancy = { id:string;reconciliation_batch_id:string;provider_transaction_id:string;detail:string;reconciliation_state:string;collection_amount_minor:string|null };
type Approval = { id:string;action:string;status:string;amount_minor:string|null;reason:string;target_student_name?:string;invoice_number?:string;can_approve:boolean;can_cancel:boolean;can_reopen?:boolean;execution:Record<string,string>|null };
type Action = {kind:"request";row:Discrepancy}|{kind:"approve"|"cancel"|"reopen";row:Approval};
const base="/payments/mpesa/reconciliation";

export function ReconciliationCorrections() {
  const tenantId=useOptionalSchoolTenantId(),client=useQueryClient();
  const {hasPermission}=usePermissions();
  const [open,setOpen]=useState(false),[tab,setTab]=useState<"discrepancies"|"approvals">("discrepancies");
  const [offset,setOffset]=useState(0),[action,setAction]=useState<Action|null>(null),[reason,setReason]=useState("");
  const [confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const inFlight=useRef(false);
  const discrepancies=useSchoolQuery<{items:Discrepancy[]}>(open&&tab==="discrepancies"?`${base}/review?limit=50&offset=${offset}`:null);
  const approvals=useSchoolQuery<Approval[]>(open&&tab==="approvals"?`${base}/approval-requests?limit=50&offset=${offset}`:null);
  const query=tab==="discrepancies"?discrepancies:approvals;
  const count=tab==="discrepancies"?(discrepancies.data?.items?.length??0):(approvals.data?.length??0);
  function choose(next:Action){setAction(next);setReason("");setConfirmed(false);setError("");setNotice("");}
  async function submit() {
    if(!tenantId||!action||!hasPermission("billing:write")||!confirmed||inFlight.current||(action.kind!=="approve"&&reason.trim().length<5))return;
    inFlight.current=true;setBusy(true);setError("");
    try {
      const path=action.kind==="request"?`${base}/approval-requests`:`${base}/approval-requests/${action.row.id}/${action.kind}`;
      const body=action.kind==="request"?{action:"reversal",subject_type:"mpesa_reconciliation_discrepancy",subject_id:action.row.id,
        reconciliation_discrepancy_id:action.row.id,reconciliation_batch_id:action.row.reconciliation_batch_id,
        amount_minor:action.row.collection_amount_minor,currency_code:"KES",reason:reason.trim()}:action.kind==="cancel"||action.kind==="reopen"?{reason:reason.trim()}:{};
      const result=await requestDashboardApi<{status:string}>(path,{tenantId,method:"POST",body});
      setNotice(result.status==="approved"?"Correction executed and financial result verified.":result.status==="cancelled"?"Correction request cancelled. No payment was changed.":result.status==="pending_second_approval"?"First review saved. A different Principal must give final approval.":"Correction requested. Two independent reviews are required before execution.");
      setAction(null);setTab("approvals");setOffset(0);
      await client.invalidateQueries({queryKey:["school",tenantId]});
    }catch(cause){setError(cause instanceof Error?cause.message:"The correction could not be saved. Retry after reviewing the current status.");}
    finally{inFlight.current=false;setBusy(false);}
  }
  return <>
    <Button variant="secondary" disabled={!hasPermission("billing:read")} onClick={()=>setOpen(true)}>Financial correction reviews</Button>
    <Modal open={open} size="xl" mobileFullScreen title="Financial correction reviews" onClose={()=>{if(!busy)setOpen(false);}}
      footer={<><Button variant="secondary" disabled={busy} onClick={()=>action?setAction(null):setOpen(false)}>{action?"Back to reviews":"Close"}</Button>
        {action&&<Button disabled={busy||!hasPermission("billing:write")||!confirmed||(action.kind!=="approve"&&reason.trim().length<5)} onClick={()=>void submit()}>{busy?"Saving…":action.kind==="approve"?"Confirm approval":action.kind==="cancel"?"Cancel request":action.kind==="reopen"?"Start new review":"Request correction"}</Button>}</>}>
      <div className="space-y-4">
        {notice&&<p role="status" className="rounded-lg bg-success-soft p-3 text-sm">{notice}</p>}
        {(error||query.error)&&<p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error||query.error?.message}</p>}
        {action?<div className="space-y-4">
          <p className="text-sm">{action.kind==="request"?`Request reversal of ${formatMinorKes(action.row.collection_amount_minor??"0")} for ${action.row.provider_transaction_id}.`:action.row.reason}</p>
          {action.kind!=="request"&&<p className="text-sm">{action.row.action.replaceAll("_"," ")} · {formatMinorKes(action.row.amount_minor??"0")} {action.row.target_student_name&&`· ${action.row.target_student_name}`} {action.row.invoice_number&&`· ${action.row.invoice_number}`}</p>}
          <p className="text-sm text-muted">The approved correction updates the relevant invoice or receipt. This action does not send money. The payment, approval and audit history remain available.</p>
          {action.kind==="reopen"&&<p className="text-sm">The earlier decision will be preserved. A new request needs two independent reviews before any correction can execute.</p>}
          {action.kind!=="approve"&&<label className="block text-sm">Reason<textarea className="input-base mt-1 w-full" disabled={busy} maxLength={1000} value={reason} onChange={event=>setReason(event.target.value)}/></label>}
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" disabled={busy} checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>I have checked the payment and the reason for this decision.</label>
        </div>:<>
          <div className="flex flex-wrap gap-2"><Button variant={tab==="discrepancies"?"primary":"ghost"} onClick={()=>{setTab("discrepancies");setOffset(0);}}>Discrepancies</Button><Button variant={tab==="approvals"?"primary":"ghost"} onClick={()=>{setTab("approvals");setOffset(0);}}>Approval requests</Button><Button variant="ghost" disabled={query.isFetching} onClick={()=>void query.refetch()}>Refresh reviews</Button></div>
          {query.isLoading&&<p role="status">Loading reconciliation reviews…</p>}
          {!query.isLoading&&!query.error&&!count&&<p className="rounded-lg border border-border p-4 text-sm">No {tab==="approvals"?"correction requests":"open discrepancies"} on this page. Provider verification and unmatched payments remain available in Collections.</p>}
          <div className="grid gap-3 md:grid-cols-2">{tab==="discrepancies"?(discrepancies.data?.items??[]).map(row=><article key={row.id} className="min-w-0 space-y-2 rounded-xl border border-border p-4"><p className="break-words font-semibold">{row.provider_transaction_id||"Payment reference requires review"}</p><p className="text-sm">{row.detail}</p><p className="text-sm text-muted">{row.reconciliation_state.replaceAll("_"," ")}</p>
            {row.collection_amount_minor?<Button size="sm" disabled={!hasPermission("billing:write")} onClick={()=>choose({kind:"request",row})}>Request reversal review</Button>:<p className="text-sm text-muted">Review the original payment in the verification inbox before correcting this discrepancy.</p>}
          </article>):(approvals.data??[]).map(row=><article key={row.id} className="min-w-0 space-y-2 rounded-xl border border-border p-4"><p className="font-semibold">{row.action.replaceAll("_"," ")} · {formatMinorKes(row.amount_minor??"0")}</p><p className="break-words text-sm">{row.reason}</p><p className="text-sm text-muted">{row.status==="approved"&&!row.execution?"Historical approval requires execution review":row.status.replaceAll("_"," ")}</p><div className="flex flex-wrap gap-2">
            {row.can_approve&&<Button size="sm" disabled={!hasPermission("billing:write")} onClick={()=>choose({kind:"approve",row})}>{row.status==="pending_second_approval"?"Final review":"Review request"}</Button>}
            {row.can_cancel&&<Button size="sm" variant="ghost" disabled={!hasPermission("billing:write")} onClick={()=>choose({kind:"cancel",row})}>Cancel pending request</Button>}
            {row.can_reopen&&<Button size="sm" variant="secondary" disabled={!hasPermission("billing:write")} onClick={()=>choose({kind:"reopen",row})}>Reopen review</Button>}
          </div></article>)}</div>
          <div className="flex justify-end gap-2"><Button variant="secondary" disabled={!offset||query.isFetching} onClick={()=>setOffset(offset-50)}>Previous page</Button><Button variant="secondary" disabled={count<50||query.isFetching} onClick={()=>setOffset(offset+50)}>Next page</Button></div>
        </>}
      </div>
    </Modal>
  </>;
}
