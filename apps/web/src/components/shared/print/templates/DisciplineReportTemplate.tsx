'use client';

import React from 'react';

interface DisciplineReportTemplateProps {
  incidentNumber: string;
  studentName: string;
  admissionNumber: string;
  classStream: string;
  incidentDateTime: string;
  incidentType: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  description: string;
  witnesses: string;
  actionTaken: string;
  parentNotified: boolean;
  counsellorReferral: boolean;
  approvalStatus?: string;
  disciplineMasterSignatureLabel: string;
  principalSignatureLabel?: string;
}

export default function DisciplineReportTemplate({
  incidentNumber,
  studentName,
  admissionNumber,
  classStream,
  incidentDateTime,
  incidentType,
  severity,
  description,
  witnesses,
  actionTaken,
  parentNotified,
  counsellorReferral,
  approvalStatus,
  disciplineMasterSignatureLabel = "Discipline Master",
  principalSignatureLabel = "Principal",
}: DisciplineReportTemplateProps) {
  
  return (
    <div className="flex flex-col gap-6 text-sm">
      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Incident No:</strong> {incidentNumber}</p>
          <p><strong>Student Name:</strong> {studentName}</p>
          <p><strong>Admission No:</strong> {admissionNumber}</p>
        </div>
        <div>
          <p><strong>Date & Time:</strong> {incidentDateTime}</p>
          <p><strong>Class/Stream:</strong> {classStream}</p>
          <p><strong>Severity:</strong> <span className={`font-bold ${severity === 'Critical' || severity === 'High' ? 'text-red-600' : 'text-orange-500'}`}>{severity}</span></p>
        </div>
      </section>

      <section className="border border-gray-300 p-4 space-y-4">
        <div>
          <p className="font-bold border-b border-gray-200 mb-1">Incident Type</p>
          <p>{incidentType}</p>
        </div>
        <div>
          <p className="font-bold border-b border-gray-200 mb-1">Description</p>
          <p className="whitespace-pre-wrap">{description}</p>
        </div>
        <div>
          <p className="font-bold border-b border-gray-200 mb-1">Witnesses</p>
          <p>{witnesses || 'None'}</p>
        </div>
        <div>
          <p className="font-bold border-b border-gray-200 mb-1">Action Taken</p>
          <p>{actionTaken}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <p><strong>Parent Notified:</strong> {parentNotified ? 'Yes' : 'No'}</p>
          <p><strong>Counsellor Referral:</strong> {counsellorReferral ? 'Yes' : 'No'}</p>
          {approvalStatus && (
            <p className="col-span-2 mt-2"><strong>Approval Status (Suspension/Expulsion):</strong> <span className="uppercase font-bold">{approvalStatus}</span></p>
          )}
        </div>
      </section>

      <section className="flex justify-between mt-12 px-8">
        <div className="flex flex-col items-center w-48">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold text-center">{disciplineMasterSignatureLabel}</p>
        </div>
        {principalSignatureLabel && (
          <div className="flex flex-col items-center w-48">
            <div className="w-full border-b border-gray-800 mb-2"></div>
            <p className="font-bold text-center">{principalSignatureLabel}</p>
          </div>
        )}
      </section>
    </div>
  );
}
