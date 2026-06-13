'use client';

import React from 'react';

interface FeeReceiptTemplateProps {
  receiptNumber: string;
  studentName: string;
  admissionNumber: string;
  classStream: string;
  parentName: string;
  amountPaid: number;
  paymentMethod: string;
  mpesaCode?: string;
  voteHeads: Array<{ name: string; amount: number }>;
  previousBalance: number;
  newBalance: number;
  receivedBy: string;
  dateTime: string;
}

export default function FeeReceiptTemplate({
  receiptNumber,
  studentName,
  admissionNumber,
  classStream,
  parentName,
  amountPaid,
  paymentMethod,
  mpesaCode,
  voteHeads,
  previousBalance,
  newBalance,
  receivedBy,
  dateTime,
}: FeeReceiptTemplateProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-mono">
      <div className="text-center font-bold border-b border-dashed border-gray-400 pb-2 mb-2">
        <p className="text-sm">OFFICIAL FEE RECEIPT</p>
        <p>Receipt No: {receiptNumber}</p>
        <p>{dateTime}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p><strong>Student:</strong> {studentName} ({admissionNumber})</p>
        <p><strong>Class:</strong> {classStream}</p>
        <p><strong>Received From:</strong> {parentName}</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 my-2">
        <div className="flex justify-between mb-1">
          <span>Previous Balance:</span>
          <span>{formatCurrency(previousBalance)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>Amount Paid:</span>
          <span>{formatCurrency(amountPaid)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>New Balance:</span>
          <span className={newBalance > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
            {formatCurrency(newBalance)}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p><strong>Payment Method:</strong> {paymentMethod}</p>
        {mpesaCode && <p><strong>Ref Code:</strong> {mpesaCode}</p>}
      </div>

      {voteHeads.length > 0 && (
        <div className="mt-2">
          <p className="font-bold border-b border-gray-300 mb-1">Allocation:</p>
          {voteHeads.map((vh, i) => (
            <div key={i} className="flex justify-between">
              <span>{vh.name}</span>
              <span>{formatCurrency(vh.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-2 border-t border-gray-800 text-center">
        <p>Received By: {receivedBy}</p>
        <div className="mt-8 border-b border-gray-400 w-3/4 mx-auto"></div>
        <p className="mt-1">Signature / Stamp</p>
      </div>
    </div>
  );
}
