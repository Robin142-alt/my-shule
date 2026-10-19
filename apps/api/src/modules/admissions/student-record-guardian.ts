import { BadRequestException, ConflictException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { CohortTx } from '../academics/cohort-configuration';
import { AdmissionsService } from './admissions.service';
import { UpdateStudentRecordDto } from './dto/update-student-record.dto';
import { normalizeKenyanPhone } from './admission-input';

export async function updateRecordGuardian(tx: CohortTx, tenant: string, actor: string, student: any, dto: UpdateStudentRecordDto, admissions: AdmissionsService) {
  if (dto.guardian_name === undefined && dto.guardian_phone === undefined && dto.guardian_relationship === undefined) return;
  const query = (sql: string, ...values: unknown[]): Promise<any[]> => tx.$queryRawUnsafe(sql, ...values);
  const name = dto.guardian_name === undefined ? student.guardian_name : dto.guardian_name || null;
  const relationship = dto.guardian_relationship === undefined ? student.guardian_relationship : dto.guardian_relationship || null;
  const phone = dto.guardian_phone === undefined ? student.guardian_phone : dto.guardian_phone ? normalizeKenyanPhone(dto.guardian_phone) : null;
  let [link] = await query(`SELECT * FROM student_guardians WHERE tenant_id=$1 AND student_id::text=$2
    AND (is_primary OR is_primary_contact) AND status='active' ORDER BY created_at LIMIT 1 FOR UPDATE`, tenant, student.id);
  if (link && !name) throw new BadRequestException('Keep the linked guardian name. Use Parents & Guardians to replace a guardian.');
  if (student.guardian_phone && !phone) throw new BadRequestException('Enter a replacement guardian phone, or leave the saved phone unchanged.');
  if (name && !link?.guardian_profile_id) {
    // Never silently attach an existing parent's identity using a matching phone.
    const existing = phone ? await query(`SELECT id FROM guardian_profiles WHERE tenant_id=$1 AND normalized_phone=$2`, tenant, phone) : [];
    if (existing.length) throw new ConflictException('This phone already belongs to a guardian. Link that guardian using Parents & Guardians.');
    const [profile] = await query(`INSERT INTO guardian_profiles (tenant_id,display_name,normalized_phone,status)
      VALUES ($1,$2,NULL,'active') RETURNING id`, tenant, name);
    let guardianId = link?.guardian_id;
    if (!guardianId) {
      const [guardian] = await query(`INSERT INTO parent_guardians (school_id,full_name,relationship_type,status)
        VALUES ($1,$2,$3::"GuardianRelationship",'ACTIVE') RETURNING id`, tenant, name, relationship?.toUpperCase() ?? null);
      guardianId = guardian.id;
    }
    if (link) {
      [link] = await query(`UPDATE student_guardians SET guardian_profile_id=$3::uuid,guardian_id=$4,is_primary=TRUE,is_primary_contact=TRUE,
        updated_at=NOW() WHERE tenant_id=$1 AND id::text=$2 RETURNING *`, tenant, link.id, profile.id, guardianId);
    } else {
      [link] = await query(`INSERT INTO student_guardians (tenant_id,school_id,student_id,guardian_id,guardian_profile_id,display_name,
        relationship,relationship_type,is_primary,is_primary_contact,can_receive_sms,can_access_parent_portal,status)
        VALUES ($1,$1,$2,$3,$4::uuid,$5,$6,$7::"GuardianRelationship",TRUE,TRUE,FALSE,FALSE,'active') RETURNING *`,
      tenant, student.id, guardianId, profile.id, name, relationship, relationship?.toUpperCase() ?? null);
    }
  }
  if (link?.guardian_profile_id) {
    await query(`UPDATE guardian_profiles SET display_name=$3,updated_at=NOW() WHERE tenant_id=$1 AND id=$2::uuid`, tenant, link.guardian_profile_id, name);
    await query(`UPDATE student_guardians SET display_name=$3,updated_at=NOW()
      WHERE tenant_id=$1 AND guardian_profile_id=$2::uuid`, tenant, link.guardian_profile_id, name);
    await query(`UPDATE parent_guardians parent SET full_name=$3,updated_at=NOW() FROM student_guardians link
      WHERE link.tenant_id=$1 AND link.guardian_profile_id=$2::uuid AND parent.school_id=link.tenant_id AND parent.id=link.guardian_id`, tenant, link.guardian_profile_id, name);
    await query(`UPDATE users SET full_name=$3,display_name=$3,updated_at=NOW()
      WHERE tenant_id=$1 AND id=(SELECT user_id FROM guardian_profiles WHERE tenant_id=$1 AND id=$2::uuid)`, tenant, link.guardian_profile_id, name);
    await query(`UPDATE students student SET primary_guardian_name=$3,updated_by_user_id=$4::uuid,updated_at=NOW()
      WHERE student.tenant_id=$1 AND EXISTS (SELECT 1 FROM student_guardians link WHERE link.tenant_id=$1
        AND link.student_id=student.id AND link.guardian_profile_id=$2::uuid AND link.is_primary AND link.status='active')`, tenant, link.guardian_profile_id, name, actor);
    await query(`UPDATE student_guardians SET relationship=$3,relationship_type=$4::"GuardianRelationship",updated_at=NOW()
      WHERE tenant_id=$1 AND id::text=$2`, tenant, link.id, relationship, relationship?.toUpperCase() ?? null);
    // Reuse the governed recovery-contact operation, including OTP invalidation and notification outbox.
    if (phone && phone !== link.normalized_phone) {
      // The legacy phone command compares the student projection, so repair the projection first.
      await query(`UPDATE students SET primary_guardian_phone=$3 WHERE tenant_id=$1 AND id::text=$2`, tenant, student.id, link.normalized_phone ?? null);
      await admissions.changePrimaryGuardianPhone(student.id, { guardian_phone: phone, reason: dto.reason, confirmed: true });
    }
  } else if (phone !== student.guardian_phone) {
    const pepper = process.env.SECURITY_PII_ENCRYPTION_KEY || (process.env.NODE_ENV === 'production' ? '' : 'myshule-test-parent-portal-pepper');
    if (phone && !pepper) throw new BadRequestException('Parent portal security key is not configured.');
    const hash = phone ? createHash('sha256').update(`${phone.replace(/\D/g, '')}:${pepper}`).digest('hex') : null;
    await query(`UPDATE student_portal_access SET guardian_phone_hash=$3,updated_at=NOW() WHERE tenant_id=$1 AND student_id::text=$2`, tenant, student.id, hash);
    await query(`UPDATE users SET phone_number_hash=$3,phone_number_last4=$4,updated_at=NOW()
      WHERE tenant_id=$1 AND id IN (SELECT user_id FROM student_portal_access WHERE tenant_id=$1 AND student_id::text=$2)`, tenant, student.id, hash, phone?.slice(-4) ?? null);
    await query(`UPDATE parent_otp_challenges SET consumed_at=NOW() WHERE tenant_id=$1 AND consumed_at IS NULL
      AND user_id IN (SELECT user_id FROM student_portal_access WHERE tenant_id=$1 AND student_id::text=$2)`, tenant, student.id);
  }
  await query(`UPDATE students SET primary_guardian_name=$3,primary_guardian_phone=$4,
    metadata=COALESCE(metadata,'{}'::jsonb)||jsonb_build_object('guardian_relationship',$5::text)
    WHERE tenant_id=$1 AND id::text=$2`, tenant, student.id, name, phone, relationship);
  await query(`UPDATE admission_applications application SET parent_name=student.primary_guardian_name,guardian_name=student.primary_guardian_name,
    parent_phone=student.primary_guardian_phone,guardian_phone=student.primary_guardian_phone,
    relationship=CASE WHEN student.id::text=$2 THEN $3 ELSE application.relationship END,
    guardian_relationship=CASE WHEN student.id::text=$2 THEN $3 ELSE application.guardian_relationship END,updated_at=NOW()
    FROM students student WHERE application.tenant_id=$1 AND student.tenant_id=$1 AND application.admitted_student_id::text=student.id::text
      AND (student.id::text=$2 OR EXISTS (SELECT 1 FROM student_guardians link WHERE link.tenant_id=$1 AND link.student_id=student.id
        AND link.guardian_profile_id=$4::uuid AND link.is_primary AND link.status='active'))`, tenant, student.id, relationship, link?.guardian_profile_id ?? null);
}
