/** DPA activation is a reviewed release artifact, never a browser or environment toggle. */
export interface IncorporatedLegalDocument {
  id: string; title: string; version: string; sha256: string; content: string;
}
export interface DpaReleaseApproval {
  approvedBy: string; approvedAt: string; evidenceReference: string;
  providerLegalIdentity: string; kenyanServingCopyEvidence: string;
  productionRegister: IncorporatedLegalDocument; retentionSchedule: IncorporatedLegalDocument;
}
// Draft registers are under docs/legal. They are not approved contractual schedules.
export const DPA_RELEASE: { documentId: string; approval: DpaReleaseApproval | null } = {
  documentId: 'dpa-2.0', approval: null,
};
export function isDpaActive() {
  const approval = DPA_RELEASE.approval;
  if (!approval) return false;
  return [approval.approvedBy, approval.evidenceReference, approval.providerLegalIdentity, approval.kenyanServingCopyEvidence].every((value) => typeof value === 'string' && value.trim().length >= 8)
    && Number.isFinite(Date.parse(approval.approvedAt))
    && [approval.productionRegister, approval.retentionSchedule].every((document) => document && document.id && document.title && document.version && /^[a-f0-9]{64}$/.test(document.sha256) && document.content.trim().length > 100);
}
