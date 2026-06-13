'use client';

import React from 'react';

interface VisitorPassTemplateProps {
  visitorName: string;
  identifier?: string; // ID or phone
  purpose: string;
  hostPerson: string;
  timeIn: string;
  passNumber: string;
  securityOfficer: string;
}

export default function VisitorPassTemplate({
  visitorName,
  identifier,
  purpose,
  hostPerson,
  timeIn,
  passNumber,
  securityOfficer,
}: VisitorPassTemplateProps) {
  
  return (
    <div className="flex flex-col gap-3 text-xs font-mono max-w-[80mm] border border-black p-3 bg-white">
      <div className="text-center font-bold border-b-2 border-black pb-2 mb-1">
        <p className="text-sm">VISITOR PASS</p>
        <p className="text-xl my-1">{passNumber}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p><strong>Name:</strong> {visitorName}</p>
        {identifier && <p><strong>ID/Phone:</strong> {identifier}</p>}
        <p><strong>Visiting:</strong> {hostPerson}</p>
        <p><strong>Purpose:</strong> {purpose}</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 my-1 space-y-1">
        <p><strong>Time In:</strong> {timeIn}</p>
        <p className="text-gray-400 mt-2"><strong>Time Out:</strong> ....................</p>
      </div>

      <div className="mt-2 text-center text-[10px]">
        <p>Security: {securityOfficer}</p>
        <p className="italic mt-1 text-[8px] text-gray-500">Please wear this pass visibly.</p>
      </div>
    </div>
  );
}
