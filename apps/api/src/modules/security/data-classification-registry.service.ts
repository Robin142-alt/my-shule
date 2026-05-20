import { Injectable } from '@nestjs/common';

export type DataClassificationId =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'sensitive_child_data'
  | 'sensitive_health_data'
  | 'sensitive_biometric_data'
  | 'payment_data';

export interface DataClassificationDefinition {
  id: DataClassificationId;
  label: string;
  default_retention: string;
  requires_audit: boolean;
}

export interface ColumnEncryptionPolicy {
  column: string;
  classification: DataClassificationId;
  encryption: 'none' | 'column' | 'vault';
  redaction: 'none' | 'mask' | 'tokenize';
}

export interface ConsentPurpose {
  id: string;
  guardian_required: boolean;
  revocable: boolean;
  evidence_required: boolean;
}

export interface DpiaModulePolicy {
  module: string;
  requires_dpia: boolean;
  review_frequency: 'termly' | 'annual';
}

export interface RetentionSchedule {
  subject: string;
  category: DataClassificationId;
  retention: string;
  raw_payload_days?: number;
}

@Injectable()
export class DataClassificationRegistryService {
  private readonly classifications: DataClassificationDefinition[] = [
    { id: 'public', label: 'Public', default_retention: 'published-policy', requires_audit: false },
    { id: 'internal', label: 'Internal', default_retention: 'operational', requires_audit: false },
    { id: 'confidential', label: 'Confidential', default_retention: 'contract-period', requires_audit: true },
    { id: 'sensitive_child_data', label: 'Sensitive child data', default_retention: 'school-record-policy', requires_audit: true },
    { id: 'sensitive_health_data', label: 'Sensitive health data', default_retention: 'health-policy', requires_audit: true },
    { id: 'sensitive_biometric_data', label: 'Sensitive biometric data', default_retention: 'biometric-consent-period', requires_audit: true },
    { id: 'payment_data', label: 'Payment data', default_retention: 'finance-legal-policy', requires_audit: true },
  ];

  private readonly columnPolicies: ColumnEncryptionPolicy[] = [
    { column: 'students.primary_guardian_phone', classification: 'sensitive_child_data', encryption: 'column', redaction: 'mask' },
    { column: 'students.primary_guardian_email', classification: 'sensitive_child_data', encryption: 'column', redaction: 'mask' },
    { column: 'clinic_health_records.confidential_notes', classification: 'sensitive_health_data', encryption: 'column', redaction: 'tokenize' },
    { column: 'discipline_incidents.counselling_notes', classification: 'sensitive_child_data', encryption: 'column', redaction: 'tokenize' },
    { column: 'biometric_attendance_templates.template_ref', classification: 'sensitive_biometric_data', encryption: 'vault', redaction: 'tokenize' },
    { column: 'mpesa_c2b_payments.payer_name', classification: 'payment_data', encryption: 'column', redaction: 'mask' },
    { column: 'mpesa_c2b_payments.phone_number', classification: 'payment_data', encryption: 'column', redaction: 'mask' },
    { column: 'admission_documents.identity_document_number', classification: 'sensitive_child_data', encryption: 'column', redaction: 'mask' },
    { column: 'student_report_cards.metadata.private_comments', classification: 'sensitive_child_data', encryption: 'vault', redaction: 'tokenize' },
  ];

  private readonly consentPurposes: ConsentPurpose[] = [
    { id: 'parent_portal', guardian_required: true, revocable: true, evidence_required: true },
    { id: 'sms_whatsapp_notifications', guardian_required: true, revocable: true, evidence_required: true },
    { id: 'biometric_attendance', guardian_required: true, revocable: true, evidence_required: true },
    { id: 'medical_processing', guardian_required: true, revocable: false, evidence_required: true },
    { id: 'media_event_publishing', guardian_required: true, revocable: true, evidence_required: true },
    { id: 'third_party_integrations', guardian_required: true, revocable: true, evidence_required: true },
  ];

  private readonly dpiaModules: DpiaModulePolicy[] = [
    { module: 'students', requires_dpia: true, review_frequency: 'annual' },
    { module: 'clinic', requires_dpia: true, review_frequency: 'annual' },
    { module: 'biometrics', requires_dpia: true, review_frequency: 'termly' },
    { module: 'discipline', requires_dpia: true, review_frequency: 'termly' },
    { module: 'exams_report_cards', requires_dpia: true, review_frequency: 'annual' },
    { module: 'payments', requires_dpia: true, review_frequency: 'annual' },
    { module: 'sync_offline', requires_dpia: true, review_frequency: 'termly' },
  ];

  private readonly retentionSchedules: RetentionSchedule[] = [
    { subject: 'payment_records', category: 'payment_data', retention: 'finance-legal-policy' },
    { subject: 'audit_logs', category: 'confidential', retention: 'audit-policy' },
    { subject: 'health_discipline_notes', category: 'sensitive_health_data', retention: 'school-policy-and-legal-review' },
    { subject: 'mpesa_payload_vault', category: 'payment_data', retention: 'minimized-raw-provider-payload', raw_payload_days: 90 },
    { subject: 'report_card_artifacts', category: 'sensitive_child_data', retention: 'immutable-academic-record-policy' },
  ];

  listClassifications(): DataClassificationDefinition[] {
    return [...this.classifications];
  }

  getColumnPolicy(column: string): ColumnEncryptionPolicy | undefined {
    return this.columnPolicies.find((policy) => policy.column === column);
  }

  getConsentPurpose(id: string): ConsentPurpose | undefined {
    return this.consentPurposes.find((purpose) => purpose.id === id);
  }

  getDpiaModule(module: string): DpiaModulePolicy | undefined {
    return this.dpiaModules.find((policy) => policy.module === module);
  }

  getRetentionSchedule(subject: string): RetentionSchedule | undefined {
    return this.retentionSchedules.find((schedule) => schedule.subject === subject);
  }
}
