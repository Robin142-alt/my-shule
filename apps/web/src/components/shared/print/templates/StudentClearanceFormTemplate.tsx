'use client';

import React from 'react';

interface StudentClearanceFormTemplateProps {
  studentName: string;
  admissionNumber: string;
  classStream: string;
  dateOfLeaving: string;
  reasonForLeaving: string;
  clearanceSections: Array<{
    department: string;
    clearedBy: string;
    remarks: string;
    cleared: boolean;
  }>;
  principalApproval: boolean;
}

export default function StudentClearanceFormTemplate({
  studentName,
  admissionNumber,
  classStream,
  dateOfLeaving,
  reasonForLeaving,
  clearanceSections,
  principalApproval,
}: StudentClearanceFormTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-[13px]">
      <div className="text-center">
        <h3 className="font-bold text-lg uppercase underline">Student Clearance Form</h3>
      </div>

      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Student Name:</strong> {studentName}</p>
          <p><strong>Admission No:</strong> {admissionNumber}</p>
          <p><strong>Class/Stream:</strong> {classStream}</p>
        </div>
        <div>
          <p><strong>Date of Leaving:</strong> {dateOfLeaving}</p>
          <p><strong>Reason:</strong> {reasonForLeaving}</p>
        </div>
      </section>

      <section>
        <p className="mb-2 italic">The above named student is required to be cleared by the following departments before the issuance of leaving certificates or refunds.</p>
        <table className="w-full border-collapse border border-gray-800 text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-800 p-2">Department</th>
              <th className="border border-gray-800 p-2">Cleared By</th>
              <th className="border border-gray-800 p-2">Remarks / Fines</th>
              <th className="border border-gray-800 p-2 text-center">Sign / Stamp</th>
            </tr>
          </thead>
          <tbody>
            {clearanceSections.map((sec, idx) => (
              <tr key={idx} className="h-12">
                <td className="border border-gray-800 p-2 font-bold">{sec.department}</td>
                <td className="border border-gray-800 p-2">{sec.clearedBy}</td>
                <td className="border border-gray-800 p-2 text-xs">{sec.remarks}</td>
                <td className="border border-gray-800 p-2 text-center align-bottom">
                  {sec.cleared ? <span className="italic text-gray-500">Cleared</span> : '_________________'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 border border-gray-800 p-4 bg-gray-50">
        <h4 className="font-bold mb-4">Principal's Final Approval</h4>
        <div className="flex justify-between items-end">
          <div>
            <p><strong>Status:</strong> {principalApproval ? 'APPROVED FOR RELEASE' : 'PENDING CLEARANCE'}</p>
          </div>
          <div className="flex flex-col items-center w-48">
            <div className="w-full border-b border-gray-800 mb-2"></div>
            <p className="font-bold">Principal Signature</p>
          </div>
        </div>
      </section>
    </div>
  );
}
