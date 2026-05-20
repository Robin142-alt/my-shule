export class BreachResponseReportExportDto {
  report_id!: string;
  tenant_id!: string;
  incident_number!: string;
  severity!: string;
  status!: string;
  detected_at!: string;
  contained_at!: string | null;
  reported_to_odpc_at!: string | null;
  affected_categories!: string[];
  evidence_export!: Record<string, unknown>;
  exported_at!: string;
}
