
export class TenantOptionDto {
  id!: string;
  name!: string;
  county!: string;
  transportEnabled?: boolean;
}

export class NotificationItemDto {
  id!: string;
  title!: string;
  timeLabel!: string;
  severity!: 'critical' | 'warning' | 'ok';
  href!: string;
  isRead?: boolean;
}

export class AlertItemDto {
  id!: string;
  title!: string;
  description!: string;
  severity!: 'critical' | 'warning' | 'ok';
  href!: string;
  actionLabel!: string;
  metricLabel!: string;
  metricValue!: string;
}

export class KpiCardDto {
  id!: string;
  label!: string;
  value!: string;
  helper!: string;
  trendValue!: string;
  trendDirection!: 'up' | 'down';
  href!: string;
  sparkline!: number[];
  masked?: boolean;
}

export class CollectionMixDto {
  label!: string;
  value!: number;
}

export class FinanceWidgetDataDto {
  collectionsToday!: string;
  outstandingInvoices!: string;
  failedPayments!: string;
  trendLabel!: string;
  collectionMix!: CollectionMixDto[];
}

export class DemographicsMixDto {
  label!: string;
  value!: number;
}

export class StudentsWidgetDataDto {
  totalStudents!: string;
  absentToday!: string;
  newEnrollments!: string;
  trendLabel!: string;
  demographics!: DemographicsMixDto[];
}

export class SubjectPerformanceDto {
  subject!: string;
  value!: number;
}

export class AcademicsWidgetDataDto {
  nextExam!: string;
  gradingQueue!: string;
  performanceTrend!: string;
  subjects!: SubjectPerformanceDto[];
}

export class ContextChartPointDto {
  label!: string;
  value!: number;
}

export class ContextSectionDto {
  id!: string;
  title!: string;
  description!: string;
  points!: ContextChartPointDto[];
  footer!: string;
}

export class ActivityItemDto {
  id!: string;
  title!: string;
  detail!: string;
  actor!: string;
  href!: string;
  timeLabel!: string;
  category!: 'payment' | 'student' | 'communication';
}

export class QuickActionItemDto {
  id!: string;
  label!: string;
  description!: string;
  href!: string;
  roles!: string[];
  offlineAllowed!: boolean;
  sensitive?: boolean;
}

export class CapabilityItemDto {
  id!: string;
  label!: string;
  description!: string;
  href!: string;
  roles!: string[];
  status!: 'critical' | 'warning' | 'ok';
  category!: string;
}

export class SyncIndicatorDto {
  state!: 'synced' | 'pending' | 'failed';
  label!: string;
  pendingCount!: number;
  failedCount!: number;
  lastSyncedAt!: string;
}

export class DashboardSummaryDto {
  widgets!: any[];
  tenantId!: string;
  role!: string;
}

export interface ActionButtonDto {
  id: string;
  label: string;
  action: string;
  state: 'ACTIVE' | 'DEGRADED' | 'FAILED' | 'LOCKED';
}

export class DashboardLayoutDto {
  tenantId!: string;
  role!: string;
  widgets!: any[];
  buttons!: ActionButtonDto[];
}
