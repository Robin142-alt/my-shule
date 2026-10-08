"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ReportSignature } from "@/components/report-cards/report-signature";
import { inspectSignatureUpload, type SignatureUploadPreview } from "@/lib/report-cards/signature-upload";

export function SignatureUploadButton({ available, currentImageUrl, disabled, label, className, onUpload }: {
  available: boolean;
  currentImageUrl?: string;
  disabled?: boolean;
  label: string;
  className: string;
  onUpload: (file: File) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SignatureUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const selection = useRef(0);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  useEffect(() => () => { selection.current += 1; }, []);

  function close() {
    if (saving) return;
    selection.current += 1;
    setOpen(false);
    setPreview(null);
    setError(null);
    setChecking(false);
  }

  async function choose(file?: File) {
    if (!file) return;
    const current = ++selection.current;
    setPreview(null);
    setError(null);
    setChecking(true);
    try {
      const selected = await inspectSignatureUpload(file);
      if (current !== selection.current) { URL.revokeObjectURL(selected.url); return; }
      setPreview(selected);
    } catch (caught) {
      if (current === selection.current) setError(caught instanceof Error ? caught.message : "The signature could not be checked.");
    } finally {
      if (current === selection.current) setChecking(false);
    }
  }

  async function save() {
    if (!preview || saving || checking || disabled) return;
    setSaving(true);
    setError(null);
    try {
      await onUpload(preview.file);
      setOpen(false);
      setPreview(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signature upload failed. Please retry.");
    } finally { setSaving(false); }
  }

  return <>
    <button type="button" disabled={disabled || saving} onClick={() => setOpen(true)} className={className}>
      <Upload className="h-4 w-4" /> {available ? "Replace signature" : "Upload signature"}
    </button>
    <Modal open={open} title={label} mobileFullScreen onClose={close} footer={<>
      <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
      <button type="button" disabled={!preview || saving || checking || disabled} onClick={() => void save()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{saving ? "Uploading..." : "Use signature"}
      </button>
    </>}>
      <div className="space-y-4 text-sm text-slate-700">
        <label className="block font-semibold">Choose signature image
          <input type="file" accept="image/png,image/jpeg" disabled={saving} className="mt-2 block min-h-11 w-full min-w-0 text-sm" onChange={event => { void choose(event.currentTarget.files?.[0]); }} />
        </label>
        <p className="text-xs text-slate-500">PNG or JPEG, at most 2 MB.</p>
        {checking ? <p role="status">Checking image size and shape...</p> : null}
        {error ? <p role="alert" className="rounded-lg bg-danger-soft p-3 text-danger">{error}</p> : null}
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-foreground">
          <p className="mb-4 font-semibold">Report-card preview</p>
          <ReportSignature key={preview?.url ?? currentImageUrl ?? "blank"} label={label} imageUrl={preview?.url ?? currentImageUrl} />
        </div>
        <details>
          <summary className="cursor-pointer py-3 font-semibold">Image requirements</summary>
          <ul className="list-disc space-y-1 pl-5">
            <li>Landscape: 300–1600 pixels wide, 80–600 pixels high, and 2–6 times wider than tall. Recommended: 600 × 200.</li>
            <li>Use clear, dark ink on a plain white or transparent background. Avoid shadows and ruled paper.</li>
            <li>Crop closely around the whole signature with a small margin. Keep the writing upright.</li>
          </ul>
        </details>
        <p className="text-xs text-slate-500">After replacing a signature, regenerate existing reports to include the new image.</p>
      </div>
    </Modal>
  </>;
}
