import type { ModuleCode } from '../module-access/module-access.constants';

export type PrincipalInsightSeverity = 'normal' | 'warning' | 'critical';

export type PrincipalInsightWidget = {
  id: string;
  title: string;
  value: number | string;
  unit?: string;
  status: PrincipalInsightSeverity;
  description?: string;
  trend?: 'up' | 'down' | 'flat';
};

export type PrincipalInsightAlert = {
  id: string;
  module_code: string;
  title: string;
  message: string;
  severity: Exclude<PrincipalInsightSeverity, 'normal'>;
  action_hint?: string;
};

export type PrincipalInsightSection = {
  id: string;
  module_code: string;
  title: string;
  category: string;
  permission_required?: string;
  confidentiality?: 'summary_only' | 'restricted' | 'standard';
  widgets: PrincipalInsightWidget[];
  alerts: PrincipalInsightAlert[];
  drilldowns: string[];
  reports: string[];
};

export type PrincipalOverviewPanel = {
  total_students: number;
  total_teachers: number;
  total_support_staff: number;
  student_gender_distribution: Record<string, number>;
  active_classes_streams: number;
  student_attendance_today: number;
  teacher_attendance_today: number;
  parent_engagement_rate: number;
  school_population_trends: Array<{ label: string; value: number }>;
  active_users_online: number;
};

export type PrincipalExecutiveDashboard = {
  tenant_id: string;
  generated_at: string;
  enabled_modules: string[];
  overview: PrincipalOverviewPanel;
  sections: PrincipalInsightSection[];
  alerts: PrincipalInsightAlert[];
  notifications: PrincipalInsightAlert[];
  realtime_channels: string[];
  report_exports: string[];
  cache: {
    ttl_seconds: number;
    key: string;
  };
};

export type PrincipalInsightProviderConfig = {
  module_code: ModuleCode;
  id: string;
  title: string;
  category: string;
  permission_required?: string;
  confidentiality?: 'summary_only' | 'restricted' | 'standard';
  widgets: Array<{
    id: string;
    title: string;
    metric_key: string;
    unit?: string;
    description?: string;
  }>;
  drilldowns: string[];
  reports: string[];
};
