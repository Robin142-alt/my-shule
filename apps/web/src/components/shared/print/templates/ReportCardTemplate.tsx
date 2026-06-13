'use client';

import React from 'react';

interface ReportCardTemplateProps {
  studentDetails: {
    name: string;
    admissionNumber: string;
    classStream: string;
    curriculum: string;
    academicYear: string;
    term: string;
    classTeacher: string;
  };
  attendance: {
    present: number;
    absent: number;
    late: number;
  };
  subjects: Array<{
    name: string;
    cat: number;
    exam: number;
    total: number;
    grade: string;
    comment: string;
  }>;
  classSummary: {
    totalMarks: number;
    meanScore: number;
    position?: string;
    grade: string;
  };
  comments: {
    classTeacher: string;
    principal: string;
  };
}

export default function ReportCardTemplate({
  studentDetails,
  attendance,
  subjects,
  classSummary,
  comments,
}: ReportCardTemplateProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Student Identity Block */}
      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Student Name:</strong> {studentDetails.name}</p>
          <p><strong>Admission No:</strong> {studentDetails.admissionNumber}</p>
          <p><strong>Class/Stream:</strong> {studentDetails.classStream}</p>
          <p><strong>Curriculum:</strong> {studentDetails.curriculum}</p>
        </div>
        <div>
          <p><strong>Academic Year:</strong> {studentDetails.academicYear}</p>
          <p><strong>Term:</strong> {studentDetails.term}</p>
          <p><strong>Class Teacher:</strong> {studentDetails.classTeacher}</p>
        </div>
      </section>

      {/* Attendance Summary */}
      <section className="flex justify-between items-center border border-gray-300 p-2 text-sm">
        <p><strong>Attendance:</strong></p>
        <p>Present: <span className="font-bold">{attendance.present}</span> days</p>
        <p>Absent: <span className="font-bold">{attendance.absent}</span> days</p>
        <p>Late: <span className="font-bold">{attendance.late}</span> days</p>
      </section>

      {/* Subject Performance Table */}
      <section>
        <table className="w-full border-collapse border border-gray-800 text-sm text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-800 p-2 w-[30%]">Subject</th>
              <th className="border border-gray-800 p-2 text-center w-[10%]">CAT</th>
              <th className="border border-gray-800 p-2 text-center w-[10%]">Exam</th>
              <th className="border border-gray-800 p-2 text-center w-[10%]">Total</th>
              <th className="border border-gray-800 p-2 text-center w-[10%]">Grade</th>
              <th className="border border-gray-800 p-2 w-[30%]">Teacher Comment</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, idx) => (
              <tr key={idx}>
                <td className="border border-gray-800 p-2 font-medium">{sub.name}</td>
                <td className="border border-gray-800 p-2 text-center">{sub.cat}</td>
                <td className="border border-gray-800 p-2 text-center">{sub.exam}</td>
                <td className="border border-gray-800 p-2 text-center font-bold">{sub.total}</td>
                <td className="border border-gray-800 p-2 text-center">{sub.grade}</td>
                <td className="border border-gray-800 p-2 text-xs">{sub.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Class Summary */}
      <section className="flex justify-between items-center border border-gray-800 p-3 bg-gray-100 text-sm">
        <p><strong>Total Marks:</strong> {classSummary.totalMarks}</p>
        <p><strong>Mean Score:</strong> {classSummary.meanScore}</p>
        {classSummary.position && <p><strong>Position:</strong> {classSummary.position}</p>}
        <p><strong>Overall Grade:</strong> <span className="text-lg font-bold">{classSummary.grade}</span></p>
      </section>

      {/* Teacher Comments */}
      <section className="flex flex-col gap-4 mt-2">
        <div className="border border-gray-300 p-3 min-h-[60px]">
          <p className="font-bold mb-1">Class Teacher's Comment:</p>
          <p className="italic text-sm">{comments.classTeacher}</p>
        </div>
        <div className="border border-gray-300 p-3 min-h-[60px]">
          <p className="font-bold mb-1">Principal's Comment:</p>
          <p className="italic text-sm">{comments.principal}</p>
        </div>
      </section>

      {/* Signatures */}
      <section className="grid grid-cols-3 gap-8 mt-8">
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Class Teacher</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Principal</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-full border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Parent / Guardian</p>
        </div>
      </section>
    </div>
  );
}
