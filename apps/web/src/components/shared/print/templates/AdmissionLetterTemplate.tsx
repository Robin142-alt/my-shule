'use client';

import React from 'react';

interface AdmissionLetterTemplateProps {
  date: string;
  studentName: string;
  admissionNumber: string;
  classAdmittedTo: string;
  academicYear: string;
  parentName: string;
  reportingDate: string;
  reportingTime: string;
  principalName: string;
}

export default function AdmissionLetterTemplate({
  date,
  studentName,
  admissionNumber,
  classAdmittedTo,
  academicYear,
  parentName,
  reportingDate,
  reportingTime,
  principalName,
}: AdmissionLetterTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-[14px] leading-relaxed">
      <div className="text-right">
        <p><strong>Date:</strong> {date}</p>
      </div>
      
      <div>
        <p>To: <strong>{parentName}</strong></p>
        <p>Re: Admission of <strong>{studentName}</strong></p>
      </div>

      <h3 className="text-center font-bold text-lg underline uppercase my-4">
        Letter of Admission
      </h3>

      <div className="space-y-4">
        <p>
          I am pleased to inform you that <strong>{studentName}</strong> has been offered a place at our school 
          in <strong>{classAdmittedTo}</strong> for the academic year <strong>{academicYear}</strong>. 
          The student's official admission number is <strong>{admissionNumber}</strong>.
        </p>

        <p>
          Please ensure that the student reports to the school on <strong>{reportingDate}</strong> by <strong>{reportingTime}</strong>. 
          All required admission requirements, fees, and documentation must be presented on or before this date.
        </p>

        <p>
          We look forward to welcoming you and your child to our school community.
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
