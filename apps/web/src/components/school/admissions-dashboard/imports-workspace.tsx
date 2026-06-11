"use client";

import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function AdmissionsImportsWorkspace({ dataset }: { dataset?: any }) {
  return (
    <div className="space-y-6">
      <Card className="border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <h2 className="text-xl font-bold text-white">Imports & Bulk Uploads</h2>
        </div>
        <div className="mt-4">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-lg font-semibold text-white">CSV/Excel uploader for bulk admissions data.</p>
            <p className="mt-2 text-sm text-white/60">This specialized UI layout is currently in scaffolding phase.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
