"use client";

import { useState } from "react";

export function ReportSignature({ label, imageUrl }: { label: string; imageUrl?: string }) {
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const source = imageUrl && attempt && !/^(blob:|data:)/.test(imageUrl)
    ? `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}retry=${attempt}`
    : imageUrl;

  // Physical units match drawSignature in the PDF renderer and the HTML print template.
  return <div data-report-signature className="mx-auto text-center" style={{ width: "130pt", maxWidth: "100%", fontFamily: "Arial, Helvetica, sans-serif", color: "#08265f" }}>
    <div data-signature-space style={{ height: "32pt", marginBottom: "4pt" }}>
      {imageUrl && status !== "failed" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={attempt} src={source} alt={label} style={{ display: "block", width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", opacity: status === "loaded" ? 1 : 0 }} onLoad={() => setStatus("loaded")} onError={() => setStatus("failed")} />
      ) : null}
    </div>
    <div style={{ borderTop: "0.6pt solid #08265f" }} />
    <p style={{ marginTop: "5pt", fontSize: "6pt", fontWeight: 700, lineHeight: 1 }}>{label}</p>
    {imageUrl && status === "loading" ? <p role="status" className="mt-1 text-[9px] text-slate-500 print:hidden">Loading signature...</p> : null}
    {imageUrl && status === "failed" ? <p role="alert" className="mt-1 text-[9px] text-warning print:hidden">
      Signature could not load. <button type="button" className="font-bold underline" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Retry {label.toLowerCase()}</button>
    </p> : null}
  </div>;
}
