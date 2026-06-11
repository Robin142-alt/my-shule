export type NotificationType = 
  | 'BOARDING_REQUEST'
  | 'TRANSPORT_REQUEST'
  | 'COUNSELLING_REFERRAL'
  | 'PROCUREMENT_REQUEST'
  | 'PROCUREMENT_APPROVAL_REQUIRED'
  | 'LAB_REQUEST'
  | 'ASSET_REQUEST'
  | 'EXAM_SUBMITTED'
  | 'DEAN_APPROVAL_GRANTED'
  | 'DISCIPLINE_CASE_ESCALATED'
  | 'FEE_PAYMENT_COMPLETED'
  | string;

export function resolveNotificationLink(type: NotificationType, recordId: string | undefined): string {
  if (!recordId) return '#';

  switch (type) {
    case 'BOARDING_REQUEST':
      return `/dashboard/boarding/requests/${recordId}`;
    case 'TRANSPORT_REQUEST':
      return `/dashboard/transport/requests/${recordId}`;
    case 'COUNSELLING_REFERRAL':
      return `/dashboard/counselling/referrals/${recordId}`;
    case 'PROCUREMENT_REQUEST':
      return `/dashboard/procurement/requests/${recordId}`;
    case 'PROCUREMENT_APPROVAL_REQUIRED':
      return `/dashboard/procurement/approvals/${recordId}`;
    case 'LAB_REQUEST':
      return `/dashboard/lab/requests/${recordId}`;
    case 'ASSET_REQUEST':
      return `/dashboard/asset/requests/${recordId}`;
    case 'EXAM_SUBMITTED':
      return `/dashboard/exams/review/${recordId}`;
    case 'DEAN_APPROVAL_GRANTED':
      return `/dashboard/exams/approved/${recordId}`;
    case 'DISCIPLINE_CASE_ESCALATED':
      return `/dashboard/discipline/cases/${recordId}`;
    case 'FEE_PAYMENT_COMPLETED':
      return `/dashboard/finance/transactions/${recordId}`;
    default:
      return '#';
  }
}

export function resolveTaskLink(module: string | undefined, recordId: string | undefined): string {
  if (!module || !recordId) return '#';

  switch (module) {
    case 'boarding':
      return `/dashboard/boarding/tasks/${recordId}`;
    case 'transport':
      return `/dashboard/transport/tasks/${recordId}`;
    case 'counselling':
      return `/dashboard/counselling/tasks/${recordId}`;
    case 'procurement':
      return `/dashboard/procurement/tasks/${recordId}`;
    case 'lab':
      return `/dashboard/lab/tasks/${recordId}`;
    case 'asset':
      return `/dashboard/asset/tasks/${recordId}`;
    default:
      return `/dashboard/${module}/tasks/${recordId}`;
  }
}
