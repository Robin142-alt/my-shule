"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle, Building2, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { useSchoolQuery } from "@/lib/data/school-hooks";

type SchoolProfileData = {
  status: "active" | "degraded" | "setup_required";
  schoolName: string;
  subdomain: string;
  region: string | null;
  registrationStatus: string;
  curriculum: string;
  schoolType: string;
  contactInfo: {
    email: string;
    phone: string;
  };
};

export function PrincipalSchoolProfileWorkspace() {
  const { data, isLoading, error } = useSchoolQuery<SchoolProfileData>('/admin-command/principal/school-profile');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-white/5 rounded-xl border border-white/10" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
            <div className="h-32 bg-white/5 rounded-xl border border-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <h2 className="text-xl font-bold text-red-500">Failed to load School Profile</h2>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Building2 className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-black text-white">{data.schoolName}</h2>
            <p className="text-white/60 mt-1">Tenant ID: {data.subdomain}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {data.registrationStatus}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 border border-white/10">
                {data.schoolType}
              </span>
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 border border-white/10">
                {data.curriculum}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-3">Contact Information</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-white/40" />
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Email Address</p>
                <p className="font-medium text-white">{data.contactInfo.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-white/40" />
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Phone Number</p>
                <p className="font-medium text-white">{data.contactInfo.phone}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4 border-b border-white/10 pb-3">Location & Address</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-white/40" />
              <div>
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Region / County</p>
                <p className="font-medium text-white">{data.region || "Not specified"}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
