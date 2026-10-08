import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { getPasswordError } from './password-policy';

export function assertPasswordPolicy(password: string): void {
  const error = getPasswordError(password);
  if (error) throw new BadRequestException(error);
}

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService) {}

  async hash(password: string): Promise<string> {
    const saltRounds = Number(this.configService.get<number>('auth.bcryptSaltRounds') ?? 12);
    return bcrypt.hash(password, saltRounds);
  }

  async compare(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
