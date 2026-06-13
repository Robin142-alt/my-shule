import { Metadata } from 'next';
import { ApprovalWorkspace } from '@/components/workflows/approvals/ApprovalWorkspace';

export const metadata: Metadata = {
  title: 'Approvals | MyShule',
  description: 'Manage system approvals governed by AGP.',
};

export default function ApprovalsPage() {
  return (
    <div className="h-[calc(100vh-4rem)] p-4 md:p-6 lg:p-8">
      <ApprovalWorkspace />
    </div>
  );
}
