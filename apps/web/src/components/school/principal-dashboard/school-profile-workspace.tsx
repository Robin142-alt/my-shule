"use client";

import { AlertCircle, Building2, CheckCircle2, Loader2, Save, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Card } from "@/components/ui/card";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type SchoolProfileData = {
  status: "active" | "degraded" | "setup_required";
  schoolName: string;
  subdomain: string;
  motto: string;
  county: string;
  subCounty: string;
  ward: string;
  address: string;
  website: string;
  registrationStatus: string;
  curriculum: string;
  schoolType: string;
  logoUrl?: string | null;
  contactInfo: { email: string; phone: string };
};

type SchoolProfileForm = {
  schoolName: string;
  motto: string;
  curriculum: string;
  schoolType: string;
  email: string;
  phone: string;
  county: string;
  subCounty: string;
  ward: string;
  address: string;
  website: string;
};

const emptyForm: SchoolProfileForm = {
  schoolName: "",
  motto: "",
  curriculum: "",
  schoolType: "",
  email: "",
  phone: "",
  county: "",
  subCounty: "",
  ward: "",
  address: "",
  website: "",
};

const fieldClass = "mt-1 w-full rounded-lg border border-white/15 bg-[#071D49] px-3 py-2.5 text-sm font-semibold text-white outline-none transition focus:border-cyan-300";

export function PrincipalSchoolProfileWorkspace() {
  const { data, isLoading, error, refetch } = useSchoolQuery<SchoolProfileData>("/admin-command/principal/school-profile");
  const [form, setForm] = useState<SchoolProfileForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [failedLogoUrl, setFailedLogoUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (!data || isDirtyRef.current) return;
    setForm({
      schoolName: data.schoolName ?? "",
      motto: data.motto ?? "",
      curriculum: data.curriculum ?? "",
      schoolType: data.schoolType ?? "",
      email: data.contactInfo?.email ?? "",
      phone: data.contactInfo?.phone ?? "",
      county: data.county ?? "",
      subCounty: data.subCounty ?? "",
      ward: data.ward ?? "",
      address: data.address ?? "",
      website: data.website ?? "",
    });
  }, [data]);

  const updateField = (field: keyof SchoolProfileForm, value: string) => {
    isDirtyRef.current = true;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      await requestDashboardApi("/admin-command/principal/school-profile", {
        method: "POST",
        body: form,
      });
      isDirtyRef.current = false;
      await refetch();
      setSuccessMessage("School profile saved. The updated identity and contacts are now available to this school.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "School profile could not be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setActionError(null);
    setSuccessMessage(null);
    const body = new FormData();
    body.append("logo", file);
    try {
      const uploaded = await requestDashboardApi<{ url: string }>("/admin-command/principal/school-profile/logo", { method: "POST", body });
      await refetch();
      const verification = await fetch(uploaded.url, { cache: "no-store", credentials: "include" });
      if (!verification.ok || !verification.headers.get("content-type")?.startsWith("image/")) {
        throw new Error("The logo was saved but could not be displayed. Try uploading it again.");
      }
      setFailedLogoUrl(null);
      setSuccessMessage("School logo uploaded.");
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "School logo could not be uploaded.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (isLoading) {
    return <Card className="border-white/10 bg-white/5 p-8 text-center font-bold text-white/70">Loading school profile...</Card>;
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6 text-red-100">
        <div className="flex items-center gap-3"><AlertCircle className="h-6 w-6" /><h2 className="text-xl font-bold">Failed to load School Profile</h2></div>
        <p className="mt-2 text-sm font-semibold">Retry this workspace before continuing school activation.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <Card className="border border-white/10 bg-white/5 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {data.logoUrl && failedLogoUrl !== data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.logoUrl} alt={`${data.schoolName} logo`} onError={() => setFailedLogoUrl(data.logoUrl ?? null)} className="h-20 w-20 shrink-0 rounded-lg border border-white/15 bg-white object-contain" />
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5"><Building2 className="h-10 w-10 text-cyan-200" /></div>
            )}
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black">{data.schoolName}</h2>
              <p className="mt-1 text-sm font-semibold text-white/60">School tenant: {data.subdomain}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-100">
                <CheckCircle2 className="h-3.5 w-3.5" /> {data.status === "active" ? "Profile complete" : "Profile setup required"}
              </span>
            </div>
          </div>
          <div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading || isSaving} className="inline-flex items-center gap-2 rounded-lg border border-cyan-200/30 bg-cyan-200/10 px-4 py-2 text-sm font-black text-cyan-100 disabled:opacity-50">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {isUploading ? "Uploading..." : "Upload logo"}
            </button>
          </div>
        </div>
      </Card>

      {actionError ? <div role="alert" className="rounded-lg border border-red-300/30 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100">{actionError}</div> : null}
      {data.logoUrl && failedLogoUrl === data.logoUrl ? <div role="alert" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">The saved logo could not be displayed. Upload the logo again to repair the school branding.</div> : null}
      {successMessage ? <div role="status" className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100">{successMessage}</div> : null}

      <Card className="border border-white/10 bg-white/5 p-5 text-white">
        <h3 className="text-lg font-black">School identity</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">School name<input required minLength={2} value={form.schoolName} onChange={(event) => updateField("schoolName", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">Motto<input value={form.motto} onChange={(event) => updateField("motto", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">Curriculum<select value={form.curriculum} onChange={(event) => updateField("curriculum", event.target.value)} className={fieldClass}><option value="">Select curriculum</option><option>CBC</option><option>8-4-4</option><option>CBC & 8-4-4</option><option>Cambridge</option><option>Hybrid</option></select></label>
          <label className="text-sm font-bold">School type<select value={form.schoolType} onChange={(event) => updateField("schoolType", event.target.value)} className={fieldClass}><option value="">Select school type</option><option>Day</option><option>Boarding</option><option>Mixed Day & Boarding</option><option>Boys Boarding</option><option>Girls Boarding</option><option>Primary</option><option>Junior School</option><option>Senior School</option></select></label>
        </div>
      </Card>

      <Card className="border border-white/10 bg-white/5 p-5 text-white">
        <h3 className="text-lg font-black">Contacts and location</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm font-bold">School email<input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">Phone number<input type="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">County<input value={form.county} onChange={(event) => updateField("county", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">Sub-county<input value={form.subCounty} onChange={(event) => updateField("subCounty", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">Ward<input value={form.ward} onChange={(event) => updateField("ward", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold">Website<input type="url" placeholder="https://school.example" value={form.website} onChange={(event) => updateField("website", event.target.value)} className={fieldClass} /></label>
          <label className="text-sm font-bold md:col-span-2">Postal/physical address<textarea required rows={3} value={form.address} onChange={(event) => updateField("address", event.target.value)} className={fieldClass} /></label>
        </div>
      </Card>

      <div className="flex justify-end">
        <button type="submit" disabled={isSaving || isUploading} className="inline-flex min-w-40 items-center justify-center gap-2 rounded-lg bg-cyan-300 px-5 py-3 text-sm font-black text-[#071D49] disabled:opacity-50">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {isSaving ? "Saving..." : "Save school profile"}
        </button>
      </div>
    </form>
  );
}
