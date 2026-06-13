'use client';

import React from 'react';

interface StoreIssueTemplateProps {
  issueNoteNumber: string;
  departmentOrRequester: string;
  itemName: string;
  quantityRequested: number;
  quantityIssued: number;
  batchOrExpiry?: string;
  issuedBy: string;
  receivedBy: string;
  approvalReference?: string;
  dateTime: string;
}

export default function StoreIssueTemplate({
  issueNoteNumber,
  departmentOrRequester,
  itemName,
  quantityRequested,
  quantityIssued,
  batchOrExpiry,
  issuedBy,
  receivedBy,
  approvalReference,
  dateTime,
}: StoreIssueTemplateProps) {
  
  return (
    <div className="flex flex-col gap-6 text-sm">
      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Issue Note No:</strong> {issueNoteNumber}</p>
          <p><strong>Requester / Dept:</strong> {departmentOrRequester}</p>
        </div>
        <div>
          <p><strong>Date & Time:</strong> {dateTime}</p>
          {approvalReference && <p><strong>Approval Ref:</strong> {approvalReference}</p>}
        </div>
      </section>

      <section>
        <table className="w-full border-collapse border border-gray-800 text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-800 p-2">Item Name</th>
              <th className="border border-gray-800 p-2 text-center">Qty Requested</th>
              <th className="border border-gray-800 p-2 text-center">Qty Issued</th>
              <th className="border border-gray-800 p-2">Batch / Expiry</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-800 p-2 font-bold">{itemName}</td>
              <td className="border border-gray-800 p-2 text-center">{quantityRequested}</td>
              <td className="border border-gray-800 p-2 text-center font-bold">{quantityIssued}</td>
              <td className="border border-gray-800 p-2 text-xs">{batchOrExpiry || '-'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="grid grid-cols-2 gap-12 mt-12 px-8">
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Issued By: {issuedBy}</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Received By: {receivedBy}</p>
        </div>
      </section>
    </div>
  );
}
