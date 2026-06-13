'use client';

import React from 'react';

interface SuspensionExpulsionLetterTemplateProps {
  date: string;
  parentName: string;
  parentAddress?: string;
  studentName: string;
  admissionNumber: string;
  classStream: string;
  actionType: 'Suspension' | 'Expulsion';
  effectiveDate: string;
  returnDate?: string; // For suspension
  reason: string;
  principalName: string;
}

export default function SuspensionExpulsionLetterTemplate({
  date,
  parentName,
  parentAddress,
  studentName,
  admissionNumber,
  classStream,
  actionType,
  effectiveDate,
  returnDate,
  reason,
  principalName,
}: SuspensionExpulsionLetterTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-[14px] leading-relaxed">
      <div className="text-right">
        <p><strong>Date:</strong> {date}</p>
      </div>
      
      <div>
        <p>To: <strong>{parentName}</strong></p>
        {parentAddress && <p>{parentAddress}</p>}
      </div>

      <h3 className="text-center font-bold text-lg underline uppercase my-4">
        Notice of {actionType}
      </h3>

      <div className="space-y-4">
        <p>Dear Parent/Guardian,</p>
        
        <p>
          This letter is to formally notify you of the <strong>{actionType.toLowerCase()}</strong> of your child, <strong>{studentName}</strong> (Adm No: {admissionNumber}, Class: {classStream}), effective <strong>{effectiveDate}</strong>.
        </p>

        <p>
          This disciplinary action has been taken due to the following reason(s):
        </p>
        
        <div className="border-l-4 border-gray-800 pl-4 py-2 my-2 bg-gray-50 italic">
          {reason}
        </div>

        {actionType === 'Suspension' && returnDate && (
          <p>
            The suspension period will last until <strong>{returnDate}</strong>. You are required to accompany the student on the reporting date for a disciplinary meeting with the administration.
          </p>
        )}

        {actionType === 'Expulsion' && (
          <p>
            Due to the severity of the offense and in accordance with the school's disciplinary policy, the Board of Management has decided to terminate the student's admission. Please visit the school office to process the official clearance.
          </p>
        )}

        <p>
          We expect strict adherence to the school's code of conduct and hope you will assist us in guiding the student.
        </p>
      </div>

      <div className="mt-12 space-y-2">
        <p>Yours sincerely,</p>
        <div className="w-48 border-b border-gray-800 my-8"></div>
        <p><strong>{principalName}</strong></p>
        <p>Principal</p>
      </div>
    </div>
  );
}
