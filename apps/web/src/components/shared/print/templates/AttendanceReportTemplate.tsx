'use client';

import React from 'react';

interface AttendanceReportTemplateProps {
  reportTitle: string; // e.g. "Daily Class Register", "Weekly Attendance Summary"
  classStream: string;
  dateRange: string;
  markedBy: string;
  records: Array<{
    date: string;
    studentName: string;
    admissionNumber: string;
    status: 'Present' | 'Absent' | 'Late' | 'Excused';
    timeMarked: string;
    notes?: string;
  }>;
}

export default function AttendanceReportTemplate({
  reportTitle,
  classStream,
  dateRange,
  markedBy,
  records,
}: AttendanceReportTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-sm">
      <section className="flex justify-between items-center border-b border-gray-800 pb-2">
        <h3 className="font-bold text-base uppercase">{reportTitle}</h3>
        <div className="text-right text-xs">
          <p><strong>Class/Stream:</strong> {classStream}</p>
          <p><strong>Date:</strong> {dateRange}</p>
        </div>
      </section>

      <section>
        <table className="w-full border-collapse border border-gray-800 text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-800 p-2">Date</th>
              <th className="border border-gray-800 p-2">Student Name</th>
              <th className="border border-gray-800 p-2">Adm No</th>
              <th className="border border-gray-800 p-2">Status</th>
              <th className="border border-gray-800 p-2">Time Marked</th>
              <th className="border border-gray-800 p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 ? (
              records.map((rec, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-800 p-2">{rec.date}</td>
                  <td className="border border-gray-800 p-2 font-medium">{rec.studentName}</td>
                  <td className="border border-gray-800 p-2">{rec.admissionNumber}</td>
                  <td className={`border border-gray-800 p-2 font-bold ${rec.status === 'Absent' ? 'text-red-600' : rec.status === 'Late' ? 'text-orange-600' : 'text-green-600'}`}>
                    {rec.status}
                  </td>
                  <td className="border border-gray-800 p-2">{rec.timeMarked}</td>
                  <td className="border border-gray-800 p-2 text-xs">{rec.notes || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="border border-gray-800 p-4 text-center italic text-gray-500">
                  No attendance records found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8 text-sm">
        <p><strong>Marked by:</strong> {markedBy}</p>
      </section>
    </div>
  );
}
