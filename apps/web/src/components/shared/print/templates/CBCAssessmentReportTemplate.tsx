'use client';

import React from 'react';

interface CBCAssessmentReportTemplateProps {
  studentDetails: {
    name: string;
    admissionNumber: string;
    grade: string;
    academicYear: string;
    term: string;
    classTeacher: string;
  };
  assessments: Array<{
    learningArea: string;
    strandSubStrand: string;
    competencyLevel: 'EE' | 'ME' | 'AE' | 'BE'; // Exceeding, Meeting, Approaching, Below
    remarks: string;
  }>;
  attendance: {
    present: number;
    absent: number;
  };
  teacherComments: string;
  principalComments: string;
}

export default function CBCAssessmentReportTemplate({
  studentDetails,
  assessments,
  attendance,
  teacherComments,
  principalComments,
}: CBCAssessmentReportTemplateProps) {
  
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'EE': return 'text-green-600 font-bold';
      case 'ME': return 'text-blue-600 font-bold';
      case 'AE': return 'text-orange-500 font-bold';
      case 'BE': return 'text-red-600 font-bold';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col gap-4 text-[12px]">
      {/* Identity Block */}
      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Learner:</strong> {studentDetails.name}</p>
          <p><strong>Assessment No:</strong> {studentDetails.admissionNumber}</p>
          <p><strong>Grade:</strong> {studentDetails.grade}</p>
        </div>
        <div>
          <p><strong>Year/Term:</strong> {studentDetails.academicYear} / {studentDetails.term}</p>
          <p><strong>Class Teacher:</strong> {studentDetails.classTeacher}</p>
          <p><strong>Attendance:</strong> Present {attendance.present} / Absent {attendance.absent}</p>
        </div>
      </section>

      {/* CBC Key */}
      <section className="text-[10px] italic flex justify-center gap-4 bg-gray-100 p-1 border border-gray-300">
        <p><span className="font-bold text-green-600">EE:</span> Exceeding Expectation (4)</p>
        <p><span className="font-bold text-blue-600">ME:</span> Meeting Expectation (3)</p>
        <p><span className="font-bold text-orange-500">AE:</span> Approaching Expectation (2)</p>
        <p><span className="font-bold text-red-600">BE:</span> Below Expectation (1)</p>
      </section>

      {/* Assessment Table */}
      <section>
        <table className="w-full border-collapse border border-gray-800 text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-800 p-2 w-[25%]">Learning Area</th>
              <th className="border border-gray-800 p-2 w-[35%]">Strand / Sub-strand</th>
              <th className="border border-gray-800 p-2 text-center w-[15%]">Level</th>
              <th className="border border-gray-800 p-2 w-[25%]">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {assessments.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-gray-800 p-2 font-medium">{item.learningArea}</td>
                <td className="border border-gray-800 p-2 text-[11px]">{item.strandSubStrand}</td>
                <td className={`border border-gray-800 p-2 text-center ${getLevelColor(item.competencyLevel)}`}>
                  {item.competencyLevel}
                </td>
                <td className="border border-gray-800 p-2 text-[11px] italic">{item.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Comments */}
      <section className="flex flex-col gap-2 mt-2">
        <div className="border border-gray-300 p-2">
          <p className="font-bold mb-1">Class Teacher's Remarks:</p>
          <p className="text-[11px]">{teacherComments}</p>
        </div>
        <div className="border border-gray-300 p-2">
          <p className="font-bold mb-1">Head Teacher's Remarks:</p>
          <p className="text-[11px]">{principalComments}</p>
        </div>
      </section>

      {/* Signatures */}
      <section className="grid grid-cols-2 gap-8 mt-6 w-2/3 mx-auto">
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Class Teacher</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Parent / Guardian</p>
        </div>
      </section>
    </div>
  );
}
