import React, { useState } from 'react';
import { StudentStatus, exitStudent } from '@/lib/students/student-lifecycle.api';

interface ExitStudentDialogProps {
  studentId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExitStudentDialog({ studentId, isOpen, onClose, onSuccess }: ExitStudentDialogProps) {
  const [exitReason, setExitReason] = useState('');
  const [exitStatus, setExitStatus] = useState<StudentStatus>('TRANSFERRED_OUT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // In a full implementation, we'd also trigger initiateClearance() here to check if the student is cleared.
      await exitStudent(studentId, { exitReason, exitStatus });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while exiting the student.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Exit Student</h2>
        
        <form onSubmit={handleSubmit}>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Exit Status</label>
            <select 
              value={exitStatus}
              onChange={(e) => setExitStatus(e.target.value as StudentStatus)}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              required
            >
              <option value="TRANSFERRED_OUT">Transferred Out</option>
              <option value="WITHDRAWN">Withdrawn</option>
              <option value="GRADUATED">Graduated</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Exit</label>
            <textarea 
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Provide a reason..."
              required
            />
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {isSubmitting ? 'Processing...' : 'Confirm Exit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
