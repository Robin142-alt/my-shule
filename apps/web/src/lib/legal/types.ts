export type LegalDocument = { id: string; kind: string; title: string; version: string; generation: number; sha256: string; effectiveDate: string; effectiveDateStatus: string };
export type LegalStatus = {
  user_id: string; school_id: string | null; school_name: string | null; display_name: string; ready: boolean;
  required_documents: LegalDocument[]; documents: LegalDocument[];
  blockers: { code: string; message: string }[];
  school_accepted: boolean; school_authority_verified: boolean; guardian_required: boolean;
  dpa_active: boolean;
  incorporated_documents: { id: string; title: string; version: string; sha256: string; content: string }[];
  guardian_children: { student_id: string; name: string; verified: boolean; authorised: boolean }[];
  can_verify_school_authority: boolean; can_verify_guardians: boolean;
  verification_schools?: { id: string; name: string }[];
  statements: { school: string; guardian: string };
  receipts: { id: string; document_id: string; version: string; content_hash: string; scope: string; subject_id: string; accepted_at: string }[];
};
