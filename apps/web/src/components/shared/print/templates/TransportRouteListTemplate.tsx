'use client';

import React from 'react';

interface TransportRouteListTemplateProps {
  routeName: string;
  vehicleRegistration: string;
  driverName: string;
  driverPhone: string;
  attendantName?: string;
  date: string;
  students: Array<{
    name: string;
    admissionNumber: string;
    classStream: string;
    pickupPoint: string;
    dropoffPoint: string;
    parentPhone: string;
  }>;
}

export default function TransportRouteListTemplate({
  routeName,
  vehicleRegistration,
  driverName,
  driverPhone,
  attendantName,
  date,
  students,
}: TransportRouteListTemplateProps) {
  return (
    <div className="flex flex-col gap-6 text-[12px]">
      <div className="text-center">
        <h3 className="font-bold text-lg uppercase underline">Transport Route Manifest</h3>
      </div>

      <section className="grid grid-cols-2 gap-4 border border-gray-800 p-3 bg-gray-50">
        <div>
          <p><strong>Route Name:</strong> {routeName}</p>
          <p><strong>Vehicle Reg:</strong> {vehicleRegistration}</p>
          <p><strong>Date:</strong> {date}</p>
        </div>
        <div>
          <p><strong>Driver:</strong> {driverName} ({driverPhone})</p>
          <p><strong>Attendant:</strong> {attendantName || 'None'}</p>
          <p><strong>Total Students:</strong> {students.length}</p>
        </div>
      </section>

      <section>
        <table className="w-full border-collapse border border-gray-800 text-left">
          <thead className="bg-gray-200">
            <tr>
              <th className="border border-gray-800 p-2">#</th>
              <th className="border border-gray-800 p-2">Student Name</th>
              <th className="border border-gray-800 p-2">Class</th>
              <th className="border border-gray-800 p-2">Pick-up</th>
              <th className="border border-gray-800 p-2">Drop-off</th>
              <th className="border border-gray-800 p-2">Parent Contact</th>
              <th className="border border-gray-800 p-2">Boarded</th>
            </tr>
          </thead>
          <tbody>
            {students.map((stu, idx) => (
              <tr key={idx}>
                <td className="border border-gray-800 p-2 text-center">{idx + 1}</td>
                <td className="border border-gray-800 p-2 font-medium">{stu.name}</td>
                <td className="border border-gray-800 p-2">{stu.classStream}</td>
                <td className="border border-gray-800 p-2">{stu.pickupPoint}</td>
                <td className="border border-gray-800 p-2">{stu.dropoffPoint}</td>
                <td className="border border-gray-800 p-2 font-mono">{stu.parentPhone}</td>
                <td className="border border-gray-800 p-2 text-center">
                  <div className="w-4 h-4 border border-gray-800 mx-auto rounded-sm"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 flex justify-between px-12">
        <div className="flex flex-col items-center">
          <div className="w-48 border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Driver Signature</p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-48 border-b border-gray-800 mb-2"></div>
          <p className="font-bold">Transport Manager</p>
        </div>
      </section>
    </div>
  );
}
