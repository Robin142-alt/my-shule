import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { LegalService } from './legal.service';
import { VerifyAuthorityDto } from './legal.dto';

@Injectable()
export class LegalVerificationService {
  constructor(private readonly legal: LegalService) {}

  async inSchool<T>(schoolId: string, callback: () => Promise<T>) {
    if (typeof schoolId !== 'string' || !schoolId.trim() || schoolId.length > 100) throw new BadRequestException('Choose a valid school.');
    const ctx = this.legal.context.requireStore();
    const status = await this.legal.status();
    const platform = status.can_verify_school_authority;
    if (status.required_documents.some((doc) => doc.kind !== 'dpa')) throw new ForbiddenException('Complete your own agreements first.');
    if (!platform && (!status.can_verify_guardians || schoolId !== ctx.tenant_id)) throw new ForbiddenException('Verified school authority is required.');
    return this.legal.context.run({ ...ctx, tenant_id: schoolId, db_client: undefined }, () =>
      this.legal.database.withRequestTransaction(async () => {
        const actor = await this.legal.database.query('SELECT id,user_type FROM app.legal_identity($1::uuid,true)', [ctx.user_id]);
        if (!actor.rows[0] || (platform && actor.rows[0].user_type !== 'platform_owner')) throw new ForbiddenException();
        if (!platform) {
          const grant = await this.legal.database.query(`SELECT a.id FROM legal_authorities a JOIN tenant_memberships m ON m.tenant_id=a.tenant_id AND m.user_id=a.user_id AND m.status='active'
            WHERE a.tenant_id=$1 AND a.user_id=$2::uuid AND a.kind='school' AND a.revoked_at IS NULL FOR SHARE OF a,m`, [schoolId,ctx.user_id]);
          if (!grant.rows[0]) throw new ForbiddenException('Your verification authority is no longer active.');
        }
        return callback();
      }));
  }

  async candidates(schoolId: string) {
    const status = await this.legal.status();
    return this.inSchool(schoolId, async () => {
      const members = status.can_verify_school_authority ? await this.legal.database.query(`SELECT u.id AS user_id,u.display_name,r.code AS role
        FROM tenant_memberships m JOIN LATERAL app.legal_identity(m.user_id) u ON true
        JOIN roles r ON r.tenant_id=m.tenant_id AND r.id=m.role_id
        WHERE m.tenant_id=$1 AND m.status='active' AND r.code NOT IN ('student','parent') ORDER BY u.display_name`, [schoolId]) : { rows: [] };
      const guardians = await this.legal.database.query(`SELECT g.user_id,g.student_id,g.display_name,s.first_name || ' ' || s.last_name AS student_name
        FROM student_guardians g JOIN students s ON s.tenant_id=g.tenant_id AND s.id=g.student_id AND s.deleted_at IS NULL
        JOIN tenant_memberships m ON m.tenant_id=g.tenant_id AND m.user_id=g.user_id AND m.status='active'
        WHERE g.tenant_id=$1 AND g.status='active' AND g.user_id IS NOT NULL ORDER BY g.display_name`, [schoolId]);
      const authorities = await this.legal.database.query(`SELECT a.id,a.kind,a.user_id,a.student_id,u.display_name,a.verified_at FROM legal_authorities a
        JOIN LATERAL app.legal_identity(a.user_id) u ON true WHERE a.tenant_id=$1 AND a.revoked_at IS NULL`, [schoolId]);
      return { members: members.rows, guardians: guardians.rows, authorities: authorities.rows };
    });
  }

  async verify(dto: VerifyAuthorityDto) {
    const status = await this.legal.status();
    const ctx = this.legal.context.requireStore();
    if (dto.checked !== true || dto.user_id === ctx.user_id) throw new BadRequestException('Authority must be independently verified and deliberately confirmed.');
    if (dto.kind === 'school' && !status.can_verify_school_authority) throw new ForbiddenException('Only the platform owner may verify institutional authority.');
    await this.inSchool(dto.school_id, async () => {
      const member = await this.legal.database.query(`SELECT m.id,r.code FROM tenant_memberships m JOIN roles r ON r.tenant_id=m.tenant_id AND r.id=m.role_id
        JOIN LATERAL app.legal_identity(m.user_id,true) u ON true
        WHERE m.tenant_id=$1 AND m.user_id=$2::uuid AND m.status='active' FOR UPDATE OF m`, [dto.school_id, dto.user_id]);
      if (!member.rows[0] || member.rows[0].code === 'student' || (dto.kind === 'school' && member.rows[0].code === 'parent')) throw new ForbiddenException('An active eligible school membership is required.');
      const studentId = dto.kind === 'guardian' ? dto.student_id : '';
      let guardianId: string | null = null;
      if (dto.kind === 'guardian') {
        const link = await this.legal.database.query(`SELECT id FROM student_guardians WHERE tenant_id=$1 AND user_id=$2::uuid AND student_id=$3 AND status='active' FOR UPDATE`, [dto.school_id, dto.user_id, studentId]);
        if (!link.rows[0]) throw new ForbiddenException('The school must first link this guardian to the student.');
        guardianId = link.rows[0].id;
      }
      const result = await this.legal.database.query(`INSERT INTO legal_authorities(tenant_id,kind,user_id,student_id,guardian_link_id,evidence_reference,verified_by)
        VALUES ($1,$2,$3::uuid,$4,$5::text,$6,$7::uuid) ON CONFLICT DO NOTHING RETURNING id`, [dto.school_id,dto.kind,dto.user_id,studentId,guardianId,dto.evidence_reference.trim(),ctx.user_id]);
      if (result.rows[0]) await this.legal.evidenceEvent(result.rows[0].id, 'legal.authority.verified', { kind: dto.kind, subject_user_id: dto.user_id, student_id: studentId });
    });
    return { success: true };
  }

  async revoke(schoolId: string, id: string, checked: boolean) {
    const status = await this.legal.status();
    if (checked !== true) throw new BadRequestException('Confirm revocation using the checkbox.');
    await this.inSchool(schoolId, async () => {
      const result = await this.legal.database.query(`UPDATE legal_authorities SET revoked_at=NOW(),revoked_by=$3::uuid
        WHERE tenant_id=$1 AND id=$2::uuid AND revoked_at IS NULL AND (kind='guardian' OR $4::boolean) RETURNING id`,
      [schoolId,id,this.legal.context.requireStore().user_id,status.can_verify_school_authority]);
      if (!result.rows[0]) throw new ForbiddenException('Authority is unavailable or cannot be revoked by this account.');
      await this.legal.evidenceEvent(id, 'legal.authority.revoked', {});
    });
    return { success: true };
  }
}
