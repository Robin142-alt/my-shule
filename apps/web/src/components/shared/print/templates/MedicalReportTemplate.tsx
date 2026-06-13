'use client';

import React from 'react';

interface MedicalReportTemplateProps {
  visitNumber: string;
  studentName: string;
  admissionNumber: string;
  classStream: string;
  visitDateTime: string;
  symptoms: string;
  vitals: string;
  treatmentGiven: string;
  medicineIssued: string;
  dosage: string;
  nurseNotes: string;
  parentNotified: boolean;
  referredToHospital: boolean;
  nurseSignatureLabel: string;
}

export default function MedicalReportTemplate({
  visitNumber,
  studentName,
  admissionNumber,
  classStream,
  visitDateTime,
  symptoms,
  vitals,
  treatmentGiven,
  medicineIssued,
  dosage,
  nurseNotes,
  parentNotified,
  referredToHospital,
  nurseSignatureLabel = "Nurse / Medical Officer",
}: MedicalReportTemplateProps) {
  
  return (
    <div className="flex flex-col gap-4 text-sm">
      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Visit No:</strong> {visitNumber}</p>
          <p><strong>Student Name:</strong> {studentName}</p>
          <p><strong>Admission No:</strong> {admissionNumber}</p>
        </div>
        <div>
          <p><strong>Date & Time:</strong> {visitDateTime}</p>
          <p><strong>Class/Stream:</strong> {classStream}</p>
        </div>
      </section>

      <section className="border border-gray-300 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold border-b border-gray-200 mb-1">Symptoms</p>
            <p className="whitespace-pre-wrap">{symptoms}</p>
          </div>
          <div>
            <p className="font-bold border-b border-gray-200 mb-1">Temperature / Vitals</p>
            <p>{vitals}</p>
          </div>
        </div>

        <div>
          <p className="font-bold border-b border-gray-200 mb-1">Treatment Given</p>
          <p>{treatmentGiven}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="font-bold border-b border-gray-200 mb-1">Medicine Issued</p>
            <p>{medicineIssued || 'None'}</p>
          </div>
          <div>
            <p className="font-bold border-b border-gray-200 mb-1">Dosage</p>
            <p>{dosage || '-'}</p>
          </div>
        </div>

        <div>
          <p className="font-bold border-b border-gray-200 mb-1">Nurse Notes</p>
          <p className="whitespace-pre-wrap italic">{nurseNotes}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <p><strong>Parent Notified:</strong> {parentNotified ? 'Yes' : 'No'}</p>
          <p><strong>Referred to Hospital:</strong> {referredToHospital ? 'Yes' : 'No'}</p>
        </div>
      </section>

      <section className="flex justify-start mt-8">
        <div className="flex flex-col items-center w-64">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold text-center">{nurseSignatureLabel}</p>
        </div>
      </section>
    </div>
  );
}
