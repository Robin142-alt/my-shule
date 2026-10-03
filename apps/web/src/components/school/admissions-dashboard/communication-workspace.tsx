"use client";
import { useState } from "react";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
type Message = { id: string; recipient_phone: string; message_preview: string; status: string; created_at: string };
export function CommunicationWorkspace() {
  const query = useSchoolQuery<Message[]>("/communication/sms?limit=50", { staleTime: 30_000, retry: 1 });
  const send = useSchoolMutation<{ status: string }, { recipientPhone: string; message: string }>("/communication/sms", "POST", { queueNetworkFailures: false });
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  return <section className="rounded-2xl border border-border bg-white p-4">
    <h2 className="text-xl font-black">Communication</h2><p className="mt-1 text-sm text-muted">Send an admission update and check its delivery status.</p>
    <form className="my-4 grid gap-3" onSubmit={async e => {
      e.preventDefault(); setFeedback("");
      try { const result = await send.mutateAsync({ recipientPhone: phone, message }); setFeedback(`Message status: ${result.status}. Check the delivery list below.`); setMessage(""); }
      catch { /* Keep entered text and the request error for retry. */ }
    }}>
      <label className="grid gap-1 text-sm font-semibold">Recipient phone<input type="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="0712345678" className="min-h-11 rounded-xl border p-3" /></label>
      <label className="grid gap-1 text-sm font-semibold">Admission message<textarea required maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} rows={3} className="rounded-xl border p-3" /></label>
      <button disabled={send.isPending} className="min-h-11 rounded-xl bg-primary px-4 font-bold text-white sm:justify-self-start">{send.isPending ? "Queueing…" : "Send SMS"}</button>
    </form>
    {feedback ? <p role="status" className="my-3 rounded-xl bg-success-soft p-3">{feedback}</p> : null}
    {send.isError ? <p role="alert" className="my-3 rounded-xl bg-danger-soft p-3 text-danger">{send.error.message}</p> : null}
    {query.isError ? <p role="alert">Delivery records could not be loaded. {query.error.message} <button className="underline" onClick={() => void query.refetch()}>Retry</button></p> : query.isLoading ? <p role="status">Loading message history…</p> : null}
    {!query.isLoading && !query.isError && !query.data?.length ? <p>No admission messages yet. Send an update using the form above.</p> : null}
    <ul className="divide-y divide-border">{query.data?.map(row => <li key={row.id} className="py-3"><p className="text-sm font-bold">{row.recipient_phone} · {row.status} · {new Date(row.created_at).toLocaleDateString()}</p><p className="break-words text-sm text-muted">{row.message_preview}</p></li>)}</ul>
  </section>;
}
