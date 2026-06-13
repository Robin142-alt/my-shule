import React from 'react';

interface DocumentFooterProps {
  details: {
    printedBy: string;
    role: string;
    pageCount: number;
    verificationCode?: string;
    disclaimer?: string;
  };
}

export default function DocumentFooter({ details }: DocumentFooterProps) {
  return (
    <div className="w-full mt-8 pt-2 border-t border-gray-400 flex flex-col gap-1 text-[9px] text-gray-600 font-mono">
      <div className="flex justify-between items-center">
        <p className="m-0">
          Printed by: <span className="font-semibold">{details.printedBy}</span>, {details.role}
        </p>
        <p className="m-0 font-bold text-gray-800">MyShule School ERP</p>
        <p className="m-0">
          Page <span className="page-number">1</span> of <span className="page-count">{details.pageCount}</span>
        </p>
      </div>
      
      {(details.verificationCode || details.disclaimer) && (
        <div className="flex justify-between items-center mt-1 text-[8px]">
          {details.verificationCode && (
            <p className="m-0">Verification Code: <span className="font-bold">{details.verificationCode}</span></p>
          )}
          {details.disclaimer && (
            <p className="m-0 italic">{details.disclaimer}</p>
          )}
        </div>
      )}
    </div>
  );
}
