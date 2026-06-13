'use client';

import React from 'react';

interface LibrarySlipTemplateProps {
  slipNumber: string;
  userName: string;
  userIdentifier: string; // admission number or staff number
  bookTitle: string;
  bookBarcode: string;
  issueDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount?: number;
  librarianName: string;
}

export default function LibrarySlipTemplate({
  slipNumber,
  userName,
  userIdentifier,
  bookTitle,
  bookBarcode,
  issueDate,
  dueDate,
  returnDate,
  fineAmount,
  librarianName,
}: LibrarySlipTemplateProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4 text-xs font-mono">
      <div className="text-center font-bold border-b border-dashed border-gray-400 pb-2 mb-2">
        <p className="text-sm">LIBRARY ISSUE / RETURN SLIP</p>
        <p>Slip No: {slipNumber}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p><strong>Borrower:</strong> {userName}</p>
        <p><strong>ID/Adm No:</strong> {userIdentifier}</p>
      </div>

      <div className="border-t border-b border-dashed border-gray-400 py-2 my-2 space-y-1">
        <p><strong>Book Title:</strong> {bookTitle}</p>
        <p><strong>Acc/Barcode:</strong> {bookBarcode}</p>
      </div>

      <div className="flex flex-col gap-1">
        <p><strong>Date Issued:</strong> {issueDate}</p>
        <p><strong>Due Date:</strong> {dueDate}</p>
        {returnDate && <p><strong>Returned On:</strong> {returnDate}</p>}
        {fineAmount !== undefined && fineAmount > 0 && (
          <p className="text-red-600 font-bold mt-1"><strong>Fine Amount:</strong> {formatCurrency(fineAmount)}</p>
        )}
      </div>

      <div className="mt-6 pt-2 border-t border-gray-800 text-center">
        <p>Librarian: {librarianName}</p>
        <div className="mt-8 border-b border-gray-400 w-3/4 mx-auto"></div>
        <p className="mt-1">Signature / Stamp</p>
      </div>
    </div>
  );
}
