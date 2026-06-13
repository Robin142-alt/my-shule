import React from 'react';

interface SchoolDetails {
  name: string;
  motto?: string;
  phone?: string;
  email?: string;
  address?: string;
  logoUrl?: string;
}

interface DocumentHeaderProps {
  title: string;
  documentNumber?: string;
  schoolDetails?: SchoolDetails;
}

export default function DocumentHeader({ title, documentNumber, schoolDetails }: DocumentHeaderProps) {
  const currentDate = new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full flex justify-between items-start border-b-2 border-gray-800 pb-4 mb-6">
      {/* Left: School Info */}
      <div className="flex items-center gap-4 w-1/3">
        {schoolDetails?.logoUrl ? (
          <img src={schoolDetails.logoUrl} alt="School Logo" className="w-16 h-16 object-contain" />
        ) : (
          <div className="w-16 h-16 bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500 font-bold">
            LOGO
          </div>
        )}
        <div>
          <h1 className="text-[16px] md:text-[20px] font-bold uppercase text-[#071D49] m-0 leading-tight">
            {schoolDetails?.name || 'MYSHULE SECONDARY SCHOOL'}
          </h1>
          {schoolDetails?.motto && (
            <p className="text-[10px] italic text-gray-600 m-0 mt-1">"{schoolDetails.motto}"</p>
          )}
        </div>
      </div>

      {/* Center: Document Title */}
      <div className="flex flex-col items-center justify-center w-1/3 text-center">
        <h2 className="text-[14px] md:text-[18px] font-bold uppercase underline tracking-wider m-0">
          {title}
        </h2>
      </div>

      {/* Right: Contact & Meta */}
      <div className="flex flex-col items-end w-1/3 text-[10px] text-gray-700 space-y-1">
        <p className="m-0 font-semibold">{schoolDetails?.address || 'P.O. Box 123, Nairobi'}</p>
        <p className="m-0">{schoolDetails?.phone || '0712 345 678'} | {schoolDetails?.email || 'info@school.ac.ke'}</p>
        {documentNumber && (
          <p className="m-0 mt-2 font-mono">
            <span className="font-bold">Doc No:</span> {documentNumber}
          </p>
        )}
        <p className="m-0 font-mono">
          <span className="font-bold">Printed:</span> {currentDate}
        </p>
      </div>
    </div>
  );
}
