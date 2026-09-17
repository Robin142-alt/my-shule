import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';

import { ACCESS_TOKEN_TYPE, REFRESH_TOKEN_TYPE } from './auth.constants';
import { AuthAudience, IssuedTokenPair, JwtTokenPayload } from './auth.interfaces';
import { REGULAR_SESSION_TTL_SECONDS } from './session-policy';

interface TokenSubject {
  user_id: string;
  tenant_id: string | null;
  role: string;
  audience: AuthAudience;
  session_id: string;
  session_expires_at?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issueTokenPair(subject: TokenSubject): Promise<IssuedTokenPair> {
    const accessTokenId = randomUUID();
    const refreshTokenId = randomUUID();
    let accessExpiresIn = Number(this.configService.get<number>('auth.accessTokenTtlSeconds') ?? 900);
    let refreshExpiresIn = Number(this.configService.get<number>('auth.refreshTokenTtlSeconds') ?? 2592000);
    if (subject.audience !== 'superadmin') {
      const remaining = subject.session_expires_at
        ? Math.floor(Date.parse(subject.session_expires_at) / 1000) - Math.floor(Date.now() / 1000)
        : REGULAR_SESSION_TTL_SECONDS;
      if (!Number.isFinite(remaining) || remaining <= 0) {
        throw new UnauthorizedException('Session has expired');
      }
      refreshExpiresIn = Math.min(REGULAR_SESSION_TTL_SECONDS, remaining);
      accessExpiresIn = Math.min(accessExpiresIn, 900, refreshExpiresIn);
    }

    const accessPayload: JwtTokenPayload = {
      sub: subject.user_id,
      user_id: subject.user_id,
      tenant_id: subject.tenant_id,
      role: subject.role,
      audience: subject.audience,
      session_id: subject.session_id,
      token_id: accessTokenId,
      type: ACCESS_TOKEN_TYPE,
    };

    const refreshPayload: JwtTokenPayload = {
      ...accessPayload,
      token_id: refreshTokenId,
      type: REFRESH_TOKEN_TYPE,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get<string>('auth.accessTokenSecret'),
      expiresIn: accessExpiresIn,
      issuer: this.configService.get<string>('auth.issuer'),
      audience: this.configService.get<string>('auth.audience'),
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get<string>('auth.refreshTokenSecret'),
      expiresIn: refreshExpiresIn,
      issuer: this.configService.get<string>('auth.issuer'),
      audience: this.configService.get<string>('auth.audience'),
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      access_expires_in: accessExpiresIn,
      refresh_expires_in: refreshExpiresIn,
      access_expires_at: this.asExpiryTimestamp(accessExpiresIn),
      refresh_expires_at: this.asExpiryTimestamp(refreshExpiresIn),
      access_token_id: accessTokenId,
      refresh_token_id: refreshTokenId,
      session_id: subject.session_id,
    };
  }

  async verifyAccessToken(token: string): Promise<JwtTokenPayload> {
    return this.verifyToken(token, ACCESS_TOKEN_TYPE, 'auth.accessTokenSecret');
  }

  async verifyRefreshToken(token: string): Promise<JwtTokenPayload> {
    return this.verifyToken(token, REFRESH_TOKEN_TYPE, 'auth.refreshTokenSecret');
  }

  private async verifyToken(
    token: string,
    expectedType: JwtTokenPayload['type'],
    secretKey: 'auth.accessTokenSecret' | 'auth.refreshTokenSecret',
  ): Promise<JwtTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtTokenPayload>(token, {
        secret: this.configService.get<string>(secretKey),
        issuer: this.configService.get<string>('auth.issuer'),
        audience: this.configService.get<string>('auth.audience'),
      });

      if (payload.type !== expectedType) {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Token validation failed');
    }
  }

  private asExpiryTimestamp(ttlSeconds: number): string {
    return new Date(Date.now() + ttlSeconds * 1000).toISOString();
  }
}
