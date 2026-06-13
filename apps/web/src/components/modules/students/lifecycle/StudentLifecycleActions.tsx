import React, { useState } from 'react';
import { StudentStatus, enrollStudent, archiveStudent } from '@/lib/students/student-lifecycle.api';
import { ExitStudentDialog } from './ExitStudentDialog';

interface StudentLifecycleActionsProps {
  studentId: string;
  status: StudentStatus;
  onStatusChange?: (newStatus: StudentStatus) => void;
  className?: string;
}

export function StudentLifecycleActions({ studentId, status, onStatusChange, className = '' }: StudentLifecycleActionsProps) {
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await enrollStudent(studentId);
      onStatusChange?.('ENROLLED');
    } catch (err: any) {
      setError(err.message || 'Failed to enroll');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await archiveStudent(studentId);
      onStatusChange?.('ARCHIVED');
    } catch (err: any) {
      setError(err.message || 'Failed to archive');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {error && <span className="text-sm text-red-600 mr-2">{error}</span>}
      
      {(status === 'APPLICANT' || status === 'ACCEPTED') && (
        <button
          onClick={handleEnroll}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Enroll Student'}
        </button>
      )}

      {status === 'ENROLLED' && (
        <button
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Place in Class
        </button>
      )}

      {status === 'ACTIVE' && (
        <>
          <button
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
          >
            Suspend
          </button>
          
          <button
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            Promote
          </button>

          <button
            onClick={() => setIsExitDialogOpen(true)}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            Exit Student
          </button>
        </>
      )}

      {(status === 'TRANSFERRED_OUT' || status === 'GRADUATED' || status === 'WITHDRAWN') && (
        <button
          onClick={handleArchive}
          disabled={isLoading}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Archive Record'}
        </button>
      )}

      <ExitStudentDialog 
        isOpen={isExitDialogOpen}
        studentId={studentId}
        onClose={() => setIsExitDialogOpen(false)}
        onSuccess={() => {
          // Since the dialog can exit with TRANSFERRED_OUT, WITHDRAWN, or GRADUATED,
          // we could fetch the new status or just let the parent refresh.
          onStatusChange?.('TRANSFERRED_OUT'); 
        }}
      />
    </div>
  );
}
