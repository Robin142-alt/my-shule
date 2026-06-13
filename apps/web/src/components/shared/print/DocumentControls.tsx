'use client';

import React from 'react';

// You might use an icon library like lucide-react if installed,
// for now, we'll use simple text or generic emojis/icons if needed.

interface DocumentControlsProps {
  onClose?: () => void;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  onExportExcel?: () => void;
  onSendParent?: () => void;
  onSendStaff?: () => void;
  onRegenerate?: () => void;
  showExportExcel?: boolean;
}

export default function DocumentControls({
  onClose,
  onPrint,
  onDownloadPdf,
  onExportExcel,
  onSendParent,
  onSendStaff,
  onRegenerate,
  showExportExcel = false,
}: DocumentControlsProps) {
  
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="w-full bg-white border border-gray-300 rounded-lg shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700 mr-2">Print Controls:</span>
        <button 
          onClick={handlePrint}
          className="px-4 py-2 bg-[#071D49] hover:bg-[#0F2345] text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
          Print
        </button>
        <button 
          onClick={onDownloadPdf}
          className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center gap-2"
        >
          Download PDF
        </button>
        {showExportExcel && (
          <button 
            onClick={onExportExcel}
            className="px-4 py-2 bg-[#059669] hover:bg-[#047857] text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          >
            Export Excel
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={onSendParent}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          Send to Parent
        </button>
        <button 
          onClick={onSendStaff}
          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        >
          Send to Staff
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        <button 
          onClick={onRegenerate}
          className="px-3 py-2 text-sm text-gray-600 hover:text-[#FF7A1A] hover:bg-orange-50 rounded-md transition-colors"
        >
          Regenerate
        </button>
        {onClose && (
          <button 
            onClick={onClose}
            className="px-4 py-2 ml-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 text-sm font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
