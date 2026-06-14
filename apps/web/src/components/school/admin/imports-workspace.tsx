"use client";

import { useState } from "react";
import { UploadCloud, FileSpreadsheet, AlertCircle, CheckCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchoolMutation } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

export function ImportsWorkspace() {
  const [activeTab, setActiveTab] = useState<"students" | "staff" | "exams">("students");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      await requestDashboardApi(`/admin-command/bulk-import-${activeTab}`, {
        method: "POST",
        body: formData,
      });
      
      setStatus("success");
      setFile(null);
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  };

  const getTemplateUrl = () => {
    switch (activeTab) {
      case "students": return "/templates/students_import_template.csv";
      case "staff": return "/templates/staff_import_template.csv";
      case "exams": return "/templates/exams_import_template.csv";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Data Migration & Imports</h2>
          <p className="text-sm text-slate-500 mt-1">Bulk upload records via CSV or Excel to quickly populate the system.</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-slate-200 pb-0">
        <button
          onClick={() => { setActiveTab("students"); setStatus("idle"); setFile(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "students" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Students
        </button>
        <button
          onClick={() => { setActiveTab("staff"); setStatus("idle"); setFile(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "staff" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Staff
        </button>
        <button
          onClick={() => { setActiveTab("exams"); setStatus("idle"); setFile(null); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${
            activeTab === "exams" ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Exams
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4 border border-slate-200 bg-slate-50/50">
            <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Download Template
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              To ensure data is mapped correctly, please use our standardized CSV template for {activeTab}.
            </p>
            <Button variant="outline" className="w-full text-xs h-8 gap-2" onClick={() => alert("Downloading " + getTemplateUrl())}>
              <Download className="w-3 h-3" /> Download {activeTab} template
            </Button>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="p-8 border border-slate-200">
            <div className="max-w-md mx-auto text-center space-y-6">
              
              {status === "idle" || status === "error" ? (
                <>
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <UploadCloud className="w-8 h-8 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-slate-900 mb-1">Upload {activeTab} file</h3>
                    <p className="text-sm text-slate-500">Drag and drop your CSV or Excel file here, or click to browse.</p>
                  </div>
                  
                  <div className="flex justify-center">
                    <label className="cursor-pointer bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                      Select File
                      <input 
                        type="file" 
                        className="hidden" 
                        accept=".csv, .xlsx, .xls"
                        onChange={e => {
                          if (e.target.files?.[0]) {
                            setFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {file && (
                    <div className="p-3 bg-slate-50 rounded-md border border-slate-200 text-sm flex items-center justify-between">
                      <span className="text-slate-700 truncate max-w-[200px]">{file.name}</span>
                      <Button size="sm" onClick={handleUpload}>Upload Now</Button>
                    </div>
                  )}

                  {status === "error" && (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-md text-sm flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Upload failed. Please check the file format and try again.
                    </div>
                  )}
                </>
              ) : status === "uploading" ? (
                <div className="py-12 space-y-4">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-slate-500 font-medium animate-pulse">Processing {file?.name}...</p>
                </div>
              ) : (
                <div className="py-8 space-y-4">
                  <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="font-medium text-slate-900">Upload Successful</h3>
                  <p className="text-sm text-slate-500">The data has been queued for processing. You will be notified once the import is complete.</p>
                  <Button variant="outline" onClick={() => { setStatus("idle"); setFile(null); }}>
                    Upload Another
                  </Button>
                </div>
              )}

            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

