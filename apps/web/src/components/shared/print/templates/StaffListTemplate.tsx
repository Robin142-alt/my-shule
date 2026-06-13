'use client';

import React from 'react';

interface StaffListTemplateProps {
  department?: string;
  dateGenerated: string;
  staffRecords: Array<{
    staffNumber: string;
    name: string;
    role: string;
    department: string;
    employmentStatus: string;
  }>;
}

export default function StaffListTemplate({
  department,
  dateGenerated,
  staffRecords,
}: StaffListTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <section className="flex justify-between items-end border-b border-gray-800 pb-2">
        <div>
          <h3 className="font-bold text-base uppercase">Staff List {department && `- ${department}`}</h3>
        </div>
        <div className="text-right text-xs">
          <p><strong>As of:</strong> {dateGenerated}</p>
          <p><strong>Total Count:</strong> {staffRecords.length}</p>
        </div>
      </section>

      <section>
        <table className="w-full border-collapse border border-gray-800 text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-800 p-2">Staff No.</th>
              <th className="border border-gray-800 p-2">Name</th>
              <th className="border border-gray-800 p-2">Role</th>
              <th className="border border-gray-800 p-2">Department</th>
              <th className="border border-gray-800 p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {staffRecords.length > 0 ? (
              staffRecords.map((staff, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-800 p-2 font-mono">{staff.staffNumber}</td>
                  <td className="border border-gray-800 p-2 font-medium">{staff.name}</td>
                  <td className="border border-gray-800 p-2">{staff.role}</td>
                  <td className="border border-gray-800 p-2">{staff.department}</td>
                  <td className="border border-gray-800 p-2">{staff.employmentStatus}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border border-gray-800 p-4 text-center italic text-gray-500">
                  No staff records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8 flex justify-end">
        <div className="flex flex-col items-center w-64">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Authorized Signature</p>
        </div>
      </section>
    </div>
  );
}
