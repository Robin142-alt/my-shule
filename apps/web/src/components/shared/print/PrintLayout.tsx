'use client';

import React, { useEffect } from 'react';
import DocumentHeader from './DocumentHeader';
import DocumentFooter from './DocumentFooter';
import DocumentControls from './DocumentControls';

interface PrintLayoutProps {
  children: React.ReactNode;
  documentTitle: string;
  documentNumber?: string;
  orientation?: 'portrait' | 'landscape' | 'thermal';
  schoolDetails?: {
    name: string;
    motto?: string;
    phone?: string;
    email?: string;
    address?: string;
    logoUrl?: string;
  };
  footerDetails?: {
    printedBy: string;
    role: string;
    pageCount: number;
    verificationCode?: string;
    disclaimer?: string;
  };
  onClose?: () => void;
  hideHeader?: boolean;
  hideFooter?: boolean;
}

export default function PrintLayout({
  children,
  documentTitle,
  documentNumber,
  orientation = 'portrait',
  schoolDetails,
  footerDetails,
  onClose,
  hideHeader = false,
  hideFooter = false,
}: PrintLayoutProps) {
  
  // A helper class to apply specific page size styling in preview mode
  const previewClass = 
    orientation === 'landscape' ? 'max-w-[297mm] min-h-[210mm]' : 
    orientation === 'thermal' ? 'max-w-[80mm]' : 
    'max-w-[210mm] min-h-[297mm]';

  useEffect(() => {
    if (orientation === 'landscape') {
      document.body.classList.add('print-landscape');
    } else if (orientation === 'thermal') {
      document.body.classList.add('print-thermal');
    }
    return () => {
      document.body.classList.remove('print-landscape');
      document.body.classList.remove('print-thermal');
    };
  }, [orientation]);

  return (
    <div className="min-h-screen bg-gray-200 py-8 print:py-0 print:bg-white flex flex-col items-center">
      
      {/* Controls visible only on screen */}
      <div className="w-full max-w-4xl mb-6 no-print flex justify-center">
        <DocumentControls onClose={onClose} />
      </div>

      {/* The actual printable area */}
      <div 
        className={`bg-white shadow-lg print:shadow-none mx-auto print:mx-0 w-full p-[15mm] print:p-0 ${previewClass} relative flex flex-col`}
      >
        {!hideHeader && (
          <DocumentHeader 
            title={documentTitle} 
            documentNumber={documentNumber} 
            schoolDetails={schoolDetails} 
          />
        )}
        
        <main className="flex-grow text-[12px] leading-relaxed">
          {children}
        </main>

        {!hideFooter && footerDetails && (
          <DocumentFooter details={footerDetails} />
        )}
      </div>
    </div>
  );
}
