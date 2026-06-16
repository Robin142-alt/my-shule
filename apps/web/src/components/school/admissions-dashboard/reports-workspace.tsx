"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, Printer, Users, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function AdmissionsReportsWorkspace({ dataset }: { dataset?: any }) {
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const handleDownload = async (type: string) => {
    setIsGenerating(type);
    try {
      await requestDashboardApi('/admissions/reports', {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
      // Optionally handle the download file response here
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Admissions Reports</h2>
          <p className="text-white/60 text-sm">Analytics and exportable data for the current admission cycle</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-white/10 bg-white/5 p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Users className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/70">Total Applications</div>
            <div className="text-2xl font-black text-white">452</div>
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-6 flex items-center gap-4">
          <div className="p-3 bg-purple-500/10 rounded-xl">
            <UserPlus className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/70">Pending Interviews</div>
            <div className="text-2xl font-black text-white">128</div>
          </div>
        </Card>
        <Card className="border border-white/10 bg-white/5 p-6 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-xl">
            <UserCheck className="h-6 w-6 text-green-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white/70">Fully Enrolled</div>
            <div className="text-2xl font-black text-white">84</div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-6">Standard Reports</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-white/50" />
                <div>
                  <div className="text-sm font-medium text-white">Master Applicants List</div>
                  <div className="text-xs text-white/50">PDF format, sorted by grade</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDownload("Master List PDF")} disabled={isGenerating === "Master List PDF"}>
                {isGenerating === "Master List PDF" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-green-400/50" />
                <div>
                  <div className="text-sm font-medium text-white">Interview Schedule</div>
                  <div className="text-xs text-white/50">Excel format, includes contact info</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDownload("Interview Schedule Excel")} disabled={isGenerating === "Interview Schedule Excel"}>
                {isGenerating === "Interview Schedule Excel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3">
                <Printer className="h-5 w-5 text-purple-400/50" />
                <div>
                  <div className="text-sm font-medium text-white">Admission Letters (Bulk)</div>
                  <div className="text-xs text-white/50">Print-ready PDF for accepted students</div>
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => handleDownload("Admission Letters Print")} disabled={isGenerating === "Admission Letters Print"}>
                {isGenerating === "Admission Letters Print" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="border border-white/10 bg-white/5 p-6 flex flex-col">
          <h3 className="text-lg font-bold text-white mb-6">Demographic Summary</h3>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-sm space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70">Form 1 Entries</span>
                  <span className="text-white font-medium">65%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: "65%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70">Form 2 Transfers</span>
                  <span className="text-white font-medium">25%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: "25%" }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70">Other Grades</span>
                  <span className="text-white font-medium">10%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "10%" }}></div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
