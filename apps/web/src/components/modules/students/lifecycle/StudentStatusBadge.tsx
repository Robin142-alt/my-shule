import React from 'react';
import { StudentStatus } from '@/lib/students/student-lifecycle.api';

interface StudentStatusBadgeProps {
  status: StudentStatus;
  className?: string;
}

export function StudentStatusBadge({ status, className = '' }: StudentStatusBadgeProps) {
  const getBadgeStyle = (status: StudentStatus) => {
    switch (status) {
      case 'APPLICANT':
      case 'ACCEPTED':
        return 'bg-blue-100 text-info border-info-border';
      case 'ENROLLED':
      case 'ACTIVE':
        return 'bg-green-100 text-success border-success-border';
      case 'SUSPENDED':
        return 'bg-red-100 text-danger border-danger-border';
      case 'ON_LEAVE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'TRANSFERRED_OUT':
      case 'WITHDRAWN':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'GRADUATED':
      case 'ALUMNI':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLabel = (status: StudentStatus) => {
    return status.replace('_', ' ');
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status
      )} ${className}`}
    >
      {getLabel(status)}
    </span>
  );
}
