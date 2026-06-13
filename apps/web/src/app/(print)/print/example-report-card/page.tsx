'use client';

import React from 'react';
import PrintLayout from '@/components/shared/print/PrintLayout';
import ReportCardTemplate from '@/components/shared/print/templates/ReportCardTemplate';

// In a real implementation, you'd fetch the document data based on the params
// This is a sample implementation for preview.

export default function DocumentPrintPage() {
  const schoolDetails = {
    name: 'MYSHULE SECONDARY SCHOOL',
    motto: 'Striving for Excellence',
    phone: '0712 345 678',
    email: 'info@school.ac.ke',
    address: 'P.O. Box 123, Nairobi',
  };

  const footerDetails = {
    printedBy: 'Mary Achieng',
    role: 'Exams Manager',
    pageCount: 1,
    verificationCode: 'MS-RC-8F29K2',
  };

  const studentDetails = {
    name: 'John Otieno',
    admissionNumber: 'ADM-2023-001',
    classStream: 'Form 2 East',
    curriculum: '8-4-4',
    academicYear: '2026',
    term: 'Term 2',
    classTeacher: 'Mr. David Omondi',
  };

  const attendance = { present: 65, absent: 2, late: 1 };

  const subjects = [
    { name: 'Mathematics', cat: 25, exam: 60, total: 85, grade: 'A', comment: 'Excellent' },
    { name: 'English', cat: 20, exam: 55, total: 75, grade: 'B+', comment: 'Good progress' },
    { name: 'Kiswahili', cat: 22, exam: 58, total: 80, grade: 'A-', comment: 'Very good' },
    { name: 'Chemistry', cat: 18, exam: 50, total: 68, grade: 'B', comment: 'Can do better' },
  ];

  const classSummary = {
    totalMarks: 308,
    meanScore: 77,
    position: '4 out of 45',
    grade: 'B+',
  };

  const comments = {
    classTeacher: 'John is a hardworking and disciplined student. He has shown great improvement this term.',
    principal: 'Excellent performance. Keep up the good work and aim even higher next term.',
  };

  return (
    <PrintLayout
      documentTitle="STUDENT REPORT CARD"
      documentNumber="RPT-2026-000123"
      orientation="portrait"
      schoolDetails={schoolDetails}
      footerDetails={footerDetails}
      onClose={() => window.history.back()}
    >
      <ReportCardTemplate
        studentDetails={studentDetails}
        attendance={attendance}
        subjects={subjects}
        classSummary={classSummary}
        comments={comments}
      />
    </PrintLayout>
  );
}
