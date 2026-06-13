'use client';

import React from 'react';

interface BoardingDormAllocationTemplateProps {
  dormName: string;
  boardingMaster: string;
  term: string;
  academicYear: string;
  dateGenerated: string;
  allocations: Array<{
    cubeOrBedNumber: string;
    studentName: string;
    admissionNumber: string;
    classStream: string;
    medicalConditions?: string;
  }>;
}

export default function BoardingDormAllocationTemplate({
  dormName,
  boardingMaster,
  term,
  academicYear,
  dateGenerated,
  allocations,
}: BoardingDormAllocationTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-[12px]">
      <section className="flex justify-between items-end border-b border-gray-800 pb-2">
        <div>
          <h3 className="font-bold text-base uppercase">Dormitory Allocation Roster</h3>
          <p className="text-sm"><strong>Dorm:</strong> {dormName}</p>
        </div>
        <div className="text-right text-xs">
          <p><strong>Term:</strong> {term} - {academicYear}</p>
          <p><strong>Dorm Master/Mistress:</strong> {boardingMaster}</p>
          <p><strong>Date:</strong> {dateGenerated}</p>
        </div>
      </section>

      <section>
        <table className="w-full border-collapse border border-gray-800 text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-800 p-2 w-[15%] text-center">Bed / Cube No.</th>
              <th className="border border-gray-800 p-2 w-[35%]">Student Name</th>
              <th className="border border-gray-800 p-2 w-[15%]">Adm No.</th>
              <th className="border border-gray-800 p-2 w-[15%]">Class</th>
              <th className="border border-gray-800 p-2 w-[20%]">Medical/Notes</th>
            </tr>
          </thead>
          <tbody>
            {allocations.length > 0 ? (
              allocations.map((alloc, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-800 p-2 text-center font-bold">{alloc.cubeOrBedNumber}</td>
                  <td className="border border-gray-800 p-2 font-medium">{alloc.studentName}</td>
                  <td className="border border-gray-800 p-2">{alloc.admissionNumber}</td>
                  <td className="border border-gray-800 p-2">{alloc.classStream}</td>
                  <td className="border border-gray-800 p-2 text-[10px] text-red-600 italic">
                    {alloc.medicalConditions || ''}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border border-gray-800 p-4 text-center italic text-gray-500">
                  No students currently allocated to this dorm.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <p className="text-[10px] italic">Note: Any unauthorized changing of beds/cubes is a disciplinary offense.</p>
      </section>
    </div>
  );
}
