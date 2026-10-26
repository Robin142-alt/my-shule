import { formatMinorKes,formatActivityDate } from "@/lib/billing/billing-utils";
export type CreditRefundHistoryEntry={id:string;amount_minor:string;reference:string;paid_at:string};
export function creditRefundSummary(refunds:CreditRefundHistoryEntry[]=[]){
  return refunds.map(r=>`Refunded ${formatMinorKes(r.amount_minor)} on ${formatActivityDate(r.paid_at)} · ${r.reference}`).join("; ");
}
export function CreditRefundHistory({refunds=[]}:{refunds?:CreditRefundHistoryEntry[]}) {
  return refunds.length?<ul className="mt-1 space-y-1 text-xs font-normal text-slate-600">{refunds.map(r=><li key={r.id} className="break-words">{creditRefundSummary([r])}</li>)}</ul>:null;
}
