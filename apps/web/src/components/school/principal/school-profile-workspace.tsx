"use client";
import { useState } from "react";
import { Building2, MapPin, Phone, Mail, Globe, Save } from "lucide-react";
import { toast } from "sonner";
import { Panel } from "./shared";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { updateSchoolProfile } from "./api-client";

type SchoolProfileData = {
  school: {
    name: string;
    motto: string;
    type: string;
    category: string;
    registration_number: string;
    county: string;
    sub_county: string;
    ward: string;
    postal_address: string;
    phone: string;
    email: string;
    website: string;
    established_year: number;
    logo_url: string;
    principal_name: string;
  };
};

export function SchoolProfileWorkspace() {
  const { data, isLoading, refetch } = useSchoolQuery<SchoolProfileData>('/admin-command/principal/school-profile');
  const [isSaving, setIsSaving] = useState(false);

  const school = data?.school;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateSchoolProfile(school);
      await refetch();
      toast.success("School profile updated successfully.");
    } catch {
      toast.error("Failed to update school profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Panel title="School Profile" description="Your school's identity and contact information." icon={Building2}>
        <div className="py-12 text-center text-[#64748B]">Loading school profile…</div>
      </Panel>
    );
  }

  if (!school) {
    return (
      <Panel title="School Profile" description="Your school's identity and contact information." icon={Building2}>
        <div className="py-12 text-center text-[#64748B]">School profile not available. Contact support if this persists.</div>
      </Panel>
    );
  }

  return (
    <Panel
      title="School Profile"
      description="Your school's identity, location, and contact information."
      icon={Building2}
      actions={
        <button disabled={isSaving} onClick={handleSaveProfile} className="inline-flex items-center gap-2 rounded-lg bg-[#071D49] px-4 py-2 text-sm font-black text-white hover:bg-blue-900 transition disabled:opacity-50">
          <Save className="h-4 w-4" />
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Identity */}
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-5">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Identity</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-[#64748B]">School Name</dt><dd className="font-semibold text-[#071D49]">{school.name}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Motto</dt><dd className="font-semibold text-[#071D49]">{school.motto || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Type</dt><dd className="font-semibold text-[#071D49]">{school.type || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Category</dt><dd className="font-semibold text-[#071D49]">{school.category || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Registration No.</dt><dd className="font-semibold text-[#071D49]">{school.registration_number || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Established</dt><dd className="font-semibold text-[#071D49]">{school.established_year || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Principal</dt><dd className="font-semibold text-[#071D49]">{school.principal_name || "—"}</dd></div>
          </dl>
        </div>

        {/* Location & Contact */}
        <div className="rounded-xl border border-[#D8E0EC] bg-[#F8FAFC] p-5">
          <h3 className="text-sm font-bold text-[#071D49] mb-3">Location & Contact</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-[#64748B] flex items-center gap-1"><MapPin className="h-3 w-3" /> County</dt><dd className="font-semibold text-[#071D49]">{school.county || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Sub-County</dt><dd className="font-semibold text-[#071D49]">{school.sub_county || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Ward</dt><dd className="font-semibold text-[#071D49]">{school.ward || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B]">Postal Address</dt><dd className="font-semibold text-[#071D49]">{school.postal_address || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B] flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</dt><dd className="font-semibold text-[#071D49]">{school.phone || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B] flex items-center gap-1"><Mail className="h-3 w-3" /> Email</dt><dd className="font-semibold text-[#071D49]">{school.email || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-[#64748B] flex items-center gap-1"><Globe className="h-3 w-3" /> Website</dt><dd className="font-semibold text-[#071D49]">{school.website || "—"}</dd></div>
          </dl>
        </div>
      </div>
    </Panel>
  );
}
