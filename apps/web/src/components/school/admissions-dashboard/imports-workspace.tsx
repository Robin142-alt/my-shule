"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { UploadCloud, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

type ImportedRow = {
  id: string;
  name: string;
  grade: string;
  parentContact: string;
  status: "Valid" | "Invalid";
  error?: string;
};

export function AdmissionsImportsWorkspace({ dataset }: { dataset?: any }) {
  const [isDragging, setIsDragging] = useState(false);
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "validating" | "ready">("idle");

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      simulateUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateUpload(e.target.files[0]);
    }
  };

  const simulateUpload = async (file: File) => {
    setUploadStatus("validating");
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await requestDashboardApi("/admissions/imports", {
        method: "POST",
        body: formData,
      });
      
      if (response && (response as any).rows) {
        setRows((response as any).rows);
      }
      setUploadStatus("ready");
    } catch (e) {
      console.error(e);
      setUploadStatus("idle");
    }
  };

  const handleCommit = () => {
    setRows([]);
    setUploadStatus("idle");
    alert("Valid records imported successfully!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">NEMIS / Ministry Bulk Uploads</h2>
          <p className="text-white/60 text-sm">Upload standard Excel/CSV files to bulk import applicants</p>
        </div>
      </div>

      {uploadStatus === "idle" && (
        <Card 
          className={`border-2 border-dashed p-12 transition-colors ${
            isDragging ? "border-blue-500 bg-blue-500/10" : "border-white/20 bg-white/5"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center">
            <UploadCloud className={`h-16 w-16 mb-4 ${isDragging ? "text-blue-400" : "text-white/40"}`} />
            <h3 className="text-xl font-bold text-white mb-2">Drag and drop your file here</h3>
            <p className="text-white/50 mb-6 max-w-sm">
              We support standard NEMIS exports (.csv, .xlsx) for Form 1 selections.
            </p>
            <div className="relative">
              <input 
                type="file" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                onChange={handleFileSelect}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
              <Button variant="outline" className="pointer-events-none">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </div>
          </div>
        </Card>
      )}

      {uploadStatus === "validating" && (
        <Card className="border border-white/10 bg-white/5 p-12 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
          <h3 className="text-xl font-bold text-white">Validating Rows...</h3>
          <p className="text-white/50">Checking for duplicates and missing fields</p>
        </Card>
      )}

      {uploadStatus === "ready" && (
        <Card className="border border-white/10 bg-white/5 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Validation Results</h3>
            <Button onClick={handleCommit} className="bg-green-600 hover:bg-green-700 text-white gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Commit Valid Records ({rows.filter(r => r.status === "Valid").length})
            </Button>
          </div>

          <Table
            columns={["Name", "Grade", "Contact", "Status", "Remarks"]}
            data={rows}
            renderRow={(r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="p-3 text-sm text-white font-medium">{r.name}</td>
                <td className="p-3 text-sm text-white/70">{r.grade}</td>
                <td className="p-3 text-sm text-white/70">{r.parentContact}</td>
                <td className="p-3 text-sm">
                  {r.status === "Valid" ? (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="h-4 w-4" /> Valid
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400">
                      <AlertTriangle className="h-4 w-4" /> Invalid
                    </span>
                  )}
                </td>
                <td className="p-3 text-sm text-white/50">{r.error || "Ready to import"}</td>
              </tr>
            )}
            emptyState={<></>}
          />
        </Card>
      )}
    </div>
  );
}
