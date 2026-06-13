'use client';

import React from 'react';

interface Transaction {
  date: string;
  refNo: string;
  description: string;
  debit: number; // Charges
  credit: number; // Payments
  balance: number;
}

interface FeeStatementTemplateProps {
  studentDetails: {
    name: string;
    admissionNumber: string;
    classStream: string;
    parentName: string;
  };
  openingBalance: number;
  transactions: Transaction[];
  closingBalance: number;
  arrears: {
    '0_30': number;
    '31_60': number;
    '61_90': number;
    '90_plus': number;
  };
  paymentInstructions: string[];
}

export default function FeeStatementTemplate({
  studentDetails,
  openingBalance,
  transactions,
  closingBalance,
  arrears,
  paymentInstructions,
}: FeeStatementTemplateProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
  };

  return (
    <div className="flex flex-col gap-6 text-sm">
      
      {/* Student Details */}
      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Student Name:</strong> {studentDetails.name}</p>
          <p><strong>Admission No:</strong> {studentDetails.admissionNumber}</p>
        </div>
        <div>
          <p><strong>Class/Stream:</strong> {studentDetails.classStream}</p>
          <p><strong>Parent/Guardian:</strong> {studentDetails.parentName}</p>
        </div>
      </section>

      {/* Transactions Table */}
      <section>
        <table className="w-full border-collapse border border-gray-800 text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-800 p-2">Date</th>
              <th className="border border-gray-800 p-2">Ref/Doc No</th>
              <th className="border border-gray-800 p-2">Description</th>
              <th className="border border-gray-800 p-2 text-right">Debit (Charges)</th>
              <th className="border border-gray-800 p-2 text-right">Credit (Payments)</th>
              <th className="border border-gray-800 p-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-800 p-2 italic" colSpan={5}>Balance Brought Forward</td>
              <td className="border border-gray-800 p-2 text-right font-bold">{formatCurrency(openingBalance)}</td>
            </tr>
            {transactions.map((txn, idx) => (
              <tr key={idx}>
                <td className="border border-gray-800 p-2">{txn.date}</td>
                <td className="border border-gray-800 p-2">{txn.refNo}</td>
                <td className="border border-gray-800 p-2">{txn.description}</td>
                <td className="border border-gray-800 p-2 text-right text-red-600">{txn.debit ? formatCurrency(txn.debit) : '-'}</td>
                <td className="border border-gray-800 p-2 text-right text-green-600">{txn.credit ? formatCurrency(txn.credit) : '-'}</td>
                <td className="border border-gray-800 p-2 text-right font-medium">{formatCurrency(txn.balance)}</td>
              </tr>
            ))}
            <tr className="bg-gray-100">
              <td className="border border-gray-800 p-2 font-bold uppercase text-right" colSpan={5}>Current Balance</td>
              <td className="border border-gray-800 p-2 text-right font-bold text-lg">{formatCurrency(closingBalance)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Arrears Aging & Instructions */}
      <div className="grid grid-cols-2 gap-6">
        <section className="border border-gray-300 p-3">
          <p className="font-bold border-b border-gray-300 pb-1 mb-2">Arrears Aging</p>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span>0 - 30 Days:</span>
            <span>{formatCurrency(arrears['0_30'])}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span>31 - 60 Days:</span>
            <span>{formatCurrency(arrears['31_60'])}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-gray-100">
            <span>61 - 90 Days:</span>
            <span>{formatCurrency(arrears['61_90'])}</span>
          </div>
          <div className="flex justify-between py-1 font-bold text-red-600">
            <span>90+ Days:</span>
            <span>{formatCurrency(arrears['90_plus'])}</span>
          </div>
        </section>

        <section className="border border-gray-300 p-3">
          <p className="font-bold border-b border-gray-300 pb-1 mb-2">Payment Instructions</p>
          <ul className="list-disc pl-4 space-y-1 text-xs">
            {paymentInstructions.map((inst, idx) => (
              <li key={idx}>{inst}</li>
            ))}
          </ul>
        </section>
      </div>

      {/* Signatures */}
      <section className="flex justify-end mt-8 pr-12">
        <div className="flex flex-col items-center w-64">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Accountant Signature</p>
        </div>
      </section>
    </div>
  );
}
