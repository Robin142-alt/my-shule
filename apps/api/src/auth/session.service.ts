import { createHash } from 'node:crypto';

import {
  ConflictException,
  Injectable,
  Optional,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../infrastructure/redis/redis.service';
import { AUTH_SESSION_PREFIX } from './auth.constants';
import {
  AuthSessionRecord,
  AuthenticatedPrincipal,
  IssuedTokenPair,
} from './auth.interfaces';
import { regularSessionExpiresAt } from './session-policy';

const AUTH_USER_SESSION_PREFIX = 'auth:user-sessions';
const AUTH_REFRESH_ROTATION_PREFIX = 'auth:refresh-rotation';

interface CreateSessionInput extends AuthenticatedPrincipal {
  email_verified_at: string | null;
  mfa_assured_at?: string | null;
  refresh_token_id: string;
  refresh_expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

export interface SafeSessionRecord {
  user_id: string;
  tenant_id: string | null;
  role: string;
  audience: AuthSessionRecord['audience'];
  permissions: string[];
  session_id: string;
  is_authenticated: boolean;
  mfa_assured_at: string | null;
  created_at: string;
  updated_at: string;
  refresh_expires_at: string;
  ip_address: string | null;
  user_agent: string | null;
  device_label: string;
  suspicious: boolean;
}

interface RefreshRotationReplay {
  client_fingerprint: string;
  expires_at: number;
  role: string;
  token_pair: IssuedTokenPair;
}

export interface RefreshTokenRotationResult {
  session: AuthSessionRecord;
  token_pair: IssuedTokenPair;
  replayed: boolean;
}

@Injectable()
export class SessionService {
  private readonly fallbackSessions = new Map<string, AuthSessionRecord>();
  private readonly fallbackUserSessions = new Map<string, Set<string>>();
  private readonly fallbackRefreshRotations = new Map<string, RefreshRotationReplay>();

  constructor(
    private readonly redisService: RedisService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  async createSession(input: CreateSessionInput): Promise<AuthSessionRecord> {
    this.assertSessionStoreAvailable(input.audience);
    const now = new Date().toISOString();
    const session: AuthSessionRecord = {
      user_id: input.user_id,
      tenant_id: input.tenant_id,
      role: input.role,
      audience: input.audience,
      permissions: input.permissions,
      session_id: input.session_id,
      is_authenticated: true,
      email_verified_at: input.email_verified_at,
      mfa_assured_at: input.mfa_assured_at ?? null,
      refresh_token_id: input.refresh_token_id,
      created_at: now,
      updated_at: now,
      refresh_expires_at: input.refresh_expires_at,
      ip_address: input.ip_address,
      user_agent: input.user_agent,
    };

    await this.persistSession(session);
    return session;
  }

  async getSession(sessionId: string, audience?: AuthSessionRecord['audience']): Promise<AuthSessionRecord | null> {
    this.assertSessionStoreAvailable(audience);
    if (this.redisService.isDegraded()) {
      return this.getFallbackSession(sessionId);
    }

    const rawSession = await this.redisService.getClient().get(this.getSessionKey(sessionId));

    if (!rawSession) {
      return null;
    }

    const session = JSON.parse(rawSession) as AuthSessionRecord;
    if (session.audience !== 'superadmin' && Date.parse(regularSessionExpiresAt(session)) <= Date.now()) {
      return null;
    }
    return session;
  }

  async invalidateSession(sessionId: string): Promise<void> {
    if (this.redisService.isDegraded()) {
      this.invalidateFallbackSession(sessionId);
      return;
    }

    const redis = this.redisService.getClient();
    const session = await this.getSession(sessionId);

    await redis.del(this.getSessionKey(sessionId));

    if (session) {
      await redis.srem(this.getUserSessionKey(session.user_id), sessionId);
    }
  }

  async invalidateUserSessions(userId: string): Promise<void> {
    if (this.redisService.isDegraded()) {
      for (const sessionId of this.fallbackUserSessions.get(userId) ?? []) {
        this.fallbackSessions.delete(sessionId);
      }
      this.fallbackUserSessions.delete(userId);
      return;
    }

    const redis = this.redisService.getClient();
    const sessionIds = await redis.smembers(this.getUserSessionKey(userId));

    for (const sessionId of sessionIds) {
      await redis.del(this.getSessionKey(sessionId));
    }

    await redis.del(this.getUserSessionKey(userId));
  }

  async invalidateRegularUserSessions(userId: string): Promise<void> {
    this.assertSessionStoreAvailable('school');
    for (const session of await this.listUserSessions(userId)) {
      if (session.audience !== 'superadmin') await this.invalidateSession(session.session_id);
    }
  }

  async listUserSessions(userId: string): Promise<SafeSessionRecord[]> {
    if (this.redisService.isDegraded()) {
      const sessions = Array.from(this.fallbackUserSessions.get(userId) ?? [])
        .map((sessionId) => this.getFallbackSession(sessionId))
        .filter((session): session is AuthSessionRecord => Boolean(session));

      return sessions
        .map((session) => this.toSafeSessionRecord(session))
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
    }

    const redis = this.redisService.getClient();
    const sessionIds = await redis.smembers(this.getUserSessionKey(userId));
    const sessions: SafeSessionRecord[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);

      if (!session) {
        await redis.srem(this.getUserSessionKey(userId), sessionId);
        continue;
      }

      sessions.push(this.toSafeSessionRecord(session));
    }

    return sessions.sort((left, right) =>
      right.updated_at.localeCompare(left.updated_at),
    );
  }

  async rotateRefreshToken(input: {
    session_id: string;
    current_refresh_token_id: string;
    next_token_pair: IssuedTokenPair;
    role: string;
    permissions: string[];
    email_verified_at: string | null;
    ip_address: string | null;
    user_agent: string | null;
  }): Promise<RefreshTokenRotationResult> {
    const rotationKey = this.getRefreshRotationKey(
      input.session_id,
      input.current_refresh_token_id,
    );
    const clientFingerprint = this.getClientFingerprint(
      input.ip_address,
      input.user_agent,
    );

    if (this.redisService.isDegraded()) {
      this.pruneFallbackRefreshRotations();
      const currentSession = this.getFallbackSession(input.session_id);

      if (!currentSession) {
        throw new UnauthorizedException('Session has expired');
      }

      if (currentSession.refresh_token_id !== input.current_refresh_token_id) {
        const replay = this.readFallbackRotationReplay(
          rotationKey,
          clientFingerprint,
          currentSession,
        );

        if (replay) {
          if (replay.role !== input.role) {
            throw new ConflictException('Session role changed during a concurrent token rotation');
          }

          return {
            session: currentSession,
            token_pair: replay.token_pair,
            replayed: true,
          };
        }

        this.invalidateFallbackSession(input.session_id);
        throw new UnauthorizedException('Refresh token reuse detected');
      }

      const nextSession = this.buildRotatedSession(currentSession, input);

      this.persistFallbackSession(nextSession);
      this.fallbackRefreshRotations.set(
        rotationKey,
        this.buildRotationReplay(input.next_token_pair, clientFingerprint, input.role),
      );
      return {
        session: nextSession,
        token_pair: input.next_token_pair,
        replayed: false,
      };
    }

    const redis = this.redisService.getClient();
    const sessionKey = this.getSessionKey(input.session_id);

    // WATCH is connection-scoped. Regular-user requests share the Redis client,
    // so compare-and-set in Lua keeps rotation atomic across requests/replicas.
    const initialSession = await this.getSession(input.session_id);
    if (!initialSession) throw new UnauthorizedException('Session has expired');
    if (initialSession.audience !== 'superadmin') {
      return this.rotateRegularSession(input, rotationKey, clientFingerprint);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await redis.watch(sessionKey);

      const rawSession = await redis.get(sessionKey);

      if (!rawSession) {
        await redis.unwatch();
        throw new UnauthorizedException('Session has expired');
      }

      const currentSession = JSON.parse(rawSession) as AuthSessionRecord;

      if (currentSession.refresh_token_id !== input.current_refresh_token_id) {
        await redis.unwatch();
        const replay = await this.readRedisRotationReplay(
          rotationKey,
          clientFingerprint,
          currentSession,
        );

        if (replay) {
          if (replay.role !== input.role) {
            throw new ConflictException('Session role changed during a concurrent token rotation');
          }

          return {
            session: currentSession,
            token_pair: replay.token_pair,
            replayed: true,
          };
        }

        await this.invalidateSession(input.session_id);
        throw new UnauthorizedException('Refresh token reuse detected');
      }

      const nextSession = this.buildRotatedSession(currentSession, input);
      const rotationReplay = this.buildRotationReplay(
        input.next_token_pair,
        clientFingerprint,
        input.role,
      );

      const ttlSeconds = this.getSessionTtlSeconds(nextSession.refresh_expires_at);
      const result = await redis
        .multi()
        .set(sessionKey, JSON.stringify(nextSession), 'EX', ttlSeconds)
        .set(
          rotationKey,
          JSON.stringify(rotationReplay),
          'EX',
          this.getRefreshRotationGraceSeconds(),
        )
        .exec();

      if (result) {
        return {
          session: nextSession,
          token_pair: input.next_token_pair,
          replayed: false,
        };
      }
    }

    throw new ConflictException('Session rotation failed due to a concurrent update');
  }

  toPrincipal(session: AuthSessionRecord): AuthenticatedPrincipal {
    return {
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      role: session.role,
      audience: session.audience,
      permissions: session.permissions,
      session_id: session.session_id,
      is_authenticated: session.is_authenticated,
    };
  }

  private async persistSession(session: AuthSessionRecord): Promise<void> {
    if (this.redisService.isDegraded()) {
      this.persistFallbackSession(session);
      return;
    }

    const ttlSeconds = this.getSessionTtlSeconds(session.refresh_expires_at);
    const redis = this.redisService.getClient();
    if (session.audience !== 'superadmin') {
      const result = await redis.multi()
        .set(this.getSessionKey(session.session_id), JSON.stringify(session), 'EX', ttlSeconds)
        .sadd(this.getUserSessionKey(session.user_id), session.session_id)
        .exec();
      if (!result || result.some(([error]) => error)) {
        await redis.del(this.getSessionKey(session.session_id));
        throw new ServiceUnavailableException('Authentication session could not be persisted');
      }
      return;
    }
    await redis.set(this.getSessionKey(session.session_id), JSON.stringify(session), 'EX', ttlSeconds);
    await redis.sadd(this.getUserSessionKey(session.user_id), session.session_id);
  }

  private toSafeSessionRecord(session: AuthSessionRecord): SafeSessionRecord {
    return {
      user_id: session.user_id,
      tenant_id: session.tenant_id,
      role: session.role,
      audience: session.audience,
      permissions: session.permissions,
      session_id: session.session_id,
      is_authenticated: session.is_authenticated,
      mfa_assured_at: session.mfa_assured_at ?? null,
      created_at: session.created_at,
      updated_at: session.updated_at,
      refresh_expires_at: session.refresh_expires_at,
      ip_address: session.ip_address,
      user_agent: session.user_agent,
      device_label: this.getDeviceLabel(session.user_agent),
      suspicious: false,
    };
  }

  private getDeviceLabel(userAgent: string | null): string {
    if (!userAgent) {
      return 'Unknown device';
    }

    if (/firefox/i.test(userAgent)) {
      return 'Firefox browser';
    }

    if (/edg/i.test(userAgent)) {
      return 'Edge browser';
    }

    if (/chrome/i.test(userAgent)) {
      return 'Chrome browser';
    }

    if (/safari/i.test(userAgent)) {
      return 'Safari browser';
    }

    return 'Browser session';
  }

  private getSessionTtlSeconds(refreshExpiresAt: string): number {
    const millisecondsUntilExpiry = new Date(refreshExpiresAt).getTime() - Date.now();
    return Math.max(1, Math.ceil(millisecondsUntilExpiry / 1000));
  }

  private getSessionKey(sessionId: string): string {
    return `${AUTH_SESSION_PREFIX}:${sessionId}`;
  }

  private async rotateRegularSession(
    input: Parameters<SessionService['rotateRefreshToken']>[0],
    rotationKey: string,
    clientFingerprint: string,
  ): Promise<RefreshTokenRotationResult> {
    const redis = this.redisService.getClient();
    const sessionKey = this.getSessionKey(input.session_id);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const raw = await redis.get(sessionKey);
      if (!raw) throw new UnauthorizedException('Session has expired');
      const session = JSON.parse(raw) as AuthSessionRecord;
      if (Date.parse(regularSessionExpiresAt(session)) <= Date.now()) {
        throw new UnauthorizedException('Session has expired');
      }
      if (session.refresh_token_id !== input.current_refresh_token_id) {
        const replay = await this.readRedisRotationReplay(rotationKey, clientFingerprint, session);
        if (replay) {
          if (replay.role !== input.role) throw new ConflictException('Session role changed during a concurrent token rotation');
          return { session, token_pair: replay.token_pair, replayed: true };
        }
        // Delete only the version whose reuse was checked, never resurrect it.
        const removed = await redis.eval(
          "if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end redis.call('DEL', KEYS[1]) return 1",
          1, sessionKey, raw,
        );
        if (!removed) continue;
        await redis.srem(this.getUserSessionKey(session.user_id), session.session_id);
        throw new UnauthorizedException('Refresh token reuse detected');
      }
      const nextSession = this.buildRotatedSession(session, input);
      const replay = this.buildRotationReplay(input.next_token_pair, clientFingerprint, input.role);
      const written = await redis.eval(
        `if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
         redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3])
         redis.call('SET', KEYS[2], ARGV[4], 'EX', ARGV[5])
         return 1`,
        2, sessionKey, rotationKey, raw, JSON.stringify(nextSession),
        this.getSessionTtlSeconds(nextSession.refresh_expires_at), JSON.stringify(replay),
        this.getRefreshRotationGraceSeconds(),
      );
      if (written) return { session: nextSession, token_pair: input.next_token_pair, replayed: false };
    }
    throw new ConflictException('Session rotation failed due to a concurrent update');
  }

  private assertSessionStoreAvailable(audience?: AuthSessionRecord['audience']) {
    if (audience && audience !== 'superadmin' && process.env.NODE_ENV === 'production' && this.redisService.isDegraded()) {
      throw new ServiceUnavailableException('Authentication service is temporarily unavailable');
    }
  }

  private getRefreshRotationKey(sessionId: string, tokenId: string): string {
    return `${AUTH_REFRESH_ROTATION_PREFIX}:${sessionId}:${tokenId}`;
  }

  private getUserSessionKey(userId: string): string {
    return `${AUTH_USER_SESSION_PREFIX}:${userId}`;
  }

  private buildRotatedSession(
    currentSession: AuthSessionRecord,
    input: {
      next_token_pair: IssuedTokenPair;
      role: string;
      permissions: string[];
      email_verified_at: string | null;
      ip_address: string | null;
      user_agent: string | null;
    },
  ): AuthSessionRecord {
    return {
      ...currentSession,
      role: input.role,
      permissions: input.permissions,
      email_verified_at: input.email_verified_at,
      refresh_token_id: input.next_token_pair.refresh_token_id,
      refresh_expires_at: currentSession.audience === 'superadmin'
        ? input.next_token_pair.refresh_expires_at
        : new Date(Math.min(Date.parse(regularSessionExpiresAt(currentSession)), Date.parse(input.next_token_pair.refresh_expires_at))).toISOString(),
      ip_address: input.ip_address ?? currentSession.ip_address,
      user_agent: input.user_agent ?? currentSession.user_agent,
      updated_at: new Date().toISOString(),
    };
  }

  private buildRotationReplay(
    tokenPair: IssuedTokenPair,
    clientFingerprint: string,
    role: string,
  ): RefreshRotationReplay {
    return {
      client_fingerprint: clientFingerprint,
      expires_at: Date.now() + this.getRefreshRotationGraceSeconds() * 1000,
      role,
      token_pair: tokenPair,
    };
  }

  private async readRedisRotationReplay(
    rotationKey: string,
    clientFingerprint: string,
    currentSession: AuthSessionRecord,
  ): Promise<RefreshRotationReplay | null> {
    const rawReplay = await this.redisService.getClient().get(rotationKey);

    if (!rawReplay) {
      return null;
    }

    const replay = JSON.parse(rawReplay) as RefreshRotationReplay;
    return this.isValidRotationReplay(replay, clientFingerprint, currentSession)
      ? replay
      : null;
  }

  private readFallbackRotationReplay(
    rotationKey: string,
    clientFingerprint: string,
    currentSession: AuthSessionRecord,
  ): RefreshRotationReplay | null {
    const replay = this.fallbackRefreshRotations.get(rotationKey);

    if (!replay) {
      return null;
    }

    if (!this.isValidRotationReplay(replay, clientFingerprint, currentSession)) {
      this.fallbackRefreshRotations.delete(rotationKey);
      return null;
    }

    return replay;
  }

  private isValidRotationReplay(
    replay: RefreshRotationReplay,
    clientFingerprint: string,
    currentSession: AuthSessionRecord,
  ): boolean {
    return (
      replay.expires_at > Date.now() &&
      replay.client_fingerprint === clientFingerprint &&
      replay.token_pair.session_id === currentSession.session_id &&
      replay.token_pair.refresh_token_id === currentSession.refresh_token_id
    );
  }

  private getClientFingerprint(
    ipAddress: string | null,
    userAgent: string | null,
  ): string {
    return createHash('sha256')
      .update(`${ipAddress?.trim() ?? ''}\n${userAgent?.trim().toLowerCase() ?? ''}`)
      .digest('hex');
  }

  private getRefreshRotationGraceSeconds(): number {
    const configured = Number(
      this.configService?.get<number>('auth.refreshTokenRotationGraceSeconds') ?? 30,
    );

    if (!Number.isFinite(configured)) {
      return 30;
    }

    return Math.min(120, Math.max(1, Math.floor(configured)));
  }

  private getFallbackSession(sessionId: string): AuthSessionRecord | null {
    const session = this.fallbackSessions.get(sessionId);

    if (!session) {
      return null;
    }

    const expiresAt = session.audience === 'superadmin' ? session.refresh_expires_at : regularSessionExpiresAt(session);
    if (new Date(expiresAt).getTime() <= Date.now()) {
      this.invalidateFallbackSession(sessionId);
      return null;
    }

    return session;
  }

  private persistFallbackSession(session: AuthSessionRecord): void {
    this.fallbackSessions.set(session.session_id, session);

    const userSessions = this.fallbackUserSessions.get(session.user_id) ?? new Set<string>();
    userSessions.add(session.session_id);
    this.fallbackUserSessions.set(session.user_id, userSessions);
  }

  private invalidateFallbackSession(sessionId: string): void {
    const session = this.fallbackSessions.get(sessionId);
    this.fallbackSessions.delete(sessionId);
    const rotationPrefix = `${AUTH_REFRESH_ROTATION_PREFIX}:${sessionId}:`;

    for (const rotationKey of this.fallbackRefreshRotations.keys()) {
      if (rotationKey.startsWith(rotationPrefix)) {
        this.fallbackRefreshRotations.delete(rotationKey);
      }
    }

    if (!session) {
      return;
    }

    const userSessions = this.fallbackUserSessions.get(session.user_id);
    userSessions?.delete(sessionId);

    if (userSessions?.size === 0) {
      this.fallbackUserSessions.delete(session.user_id);
    }
  }

  private pruneFallbackRefreshRotations(): void {
    const now = Date.now();

    for (const [rotationKey, replay] of this.fallbackRefreshRotations) {
      if (replay.expires_at <= now) {
        this.fallbackRefreshRotations.delete(rotationKey);
      }
    }
  }
}
