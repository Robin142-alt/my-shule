"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { LearnerPicker } from "@/components/common/learner-picker";
import type { LearnerLookupItem } from "@/lib/students/student-lookup";
import { usePermissions } from "@/components/providers/permission-context";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { formatMinorKes } from "@/lib/billing/billing-utils";

export function PaymentCorrectionRequest({id,amount,kind,tenantSlug,label,subjectType}:{id:string;amount:string;
  kind:"move_payment"|"post_after_mismatch"|"write_off";tenantSlug?:string|null;label:string;subjectType?:"manual_fee_payment"|"payment_intent"}) {
  const tenant=useOptionalSchoolTenantId(),client=useQueryClient(),{hasPermission}=usePermissions();
  const [open,setOpen]=useState(false),[learner,setLearner]=useState<LearnerLookupItem|null>(null);
  const [reason,setReason]=useState(""),[value,setValue]=useState(""),[confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const locked=useRef(false),requestKey=useRef(""),writeOff=kind==="write_off";
  const chosenAmount=writeOff&&/^\d{1,16}(\.\d{1,2})?$/.test(value)?(()=>{const [whole,fraction=""]=value.split(".");return (BigInt(whole)*BigInt(100)+BigInt(fraction.padEnd(2,"0"))).toString();})():writeOff?"0":amount;
  const valid=confirmed&&reason.trim().length>=5&&(writeOff?BigInt(chosenAmount)>BigInt(0)&&BigInt(chosenAmount)<=BigInt(amount):!!learner);
  async function submit(){
    if(!tenant||!valid||locked.current||!hasPermission("billing:write"))return;
    locked.current=true;setBusy(true);setError("");
    try{
      requestKey.current ||= crypto.randomUUID();
      await requestDashboardApi("/payments/mpesa/reconciliation/approval-requests",{tenantId:tenant,method:"POST",body:{
        request_key:requestKey.current,action:kind,subject_type:writeOff?"invoice":subjectType??"collection_payment",subject_id:id,amount_minor:chosenAmount,currency_code:"KES",
        reason:reason.trim(),...(!writeOff?{target_student_id:learner!.id}:{})}});
      setOpen(false);setNotice("Requested. Two independent reviews, including final Principal approval, are required in Financial correction reviews.");
      await client.invalidateQueries({queryKey:["school",tenant]});
    }catch(cause){setError(cause instanceof Error?cause.message:"The request could not be saved. Review its current status and retry.");}
    finally{locked.current=false;setBusy(false);}
  }
  return <div className="space-y-2"><Button size="sm" variant="ghost" disabled={!hasPermission("billing:write")} onClick={()=>{
    requestKey.current="";setOpen(true);setReason("");setLearner(null);setValue("");setConfirmed(false);setError("");setNotice("");}}>{label}</Button>
    {notice&&<p role="status" className="max-w-sm text-sm">{notice}</p>}
    <Modal open={open} title={label} onClose={()=>{if(!busy)setOpen(false);}} footer={<><Button variant="secondary" disabled={busy} onClick={()=>setOpen(false)}>Cancel</Button><Button disabled={busy||!valid} onClick={()=>void submit()}>{busy?"Saving…":"Request review"}</Button></>}>
      <div className="space-y-4">{error&&<p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm">{error}</p>}
        <p className="text-sm">{writeOff?`Outstanding invoice balance: ${formatMinorKes(amount)}. The approved amount reduces this invoice without recording a payment.`:
          `${formatMinorKes(amount)} will be allocated to the selected learner after approval. Original receipts and correction history remain available.`}</p>
        {writeOff?<label className="block text-sm">Write-off amount (KES)<input className="input-base mt-1 w-full" inputMode="decimal" value={value} disabled={busy} onChange={e=>setValue(e.target.value)}/></label>:
          <LearnerPicker label="Correct learner" tenantSlug={tenantSlug??tenant??""} value={learner} onChange={setLearner}/>}
        <label className="block text-sm">Reason<textarea className="input-base mt-1 w-full" value={reason} disabled={busy} maxLength={1000} onChange={e=>setReason(e.target.value)}/></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I checked the original evidence and the intended financial correction.</label>
        <p className="text-sm text-muted">This request does not send money.</p>
      </div>
    </Modal></div>;
}
