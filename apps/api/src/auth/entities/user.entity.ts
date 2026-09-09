import { BaseEntity } from '../../database/entities/base.entity';

export class UserEntity extends BaseEntity {
  email!: string;
  password_hash!: string;
  password_changed_at?: Date | string | null;
  display_name!: string;
  status!: string;
  email_verified_at!: Date | string | null;
  mfa_enabled!: boolean;
  mfa_verified_at!: Date | string | null;
}

