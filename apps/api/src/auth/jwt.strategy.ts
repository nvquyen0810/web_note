import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthUser, KeycloakClaims } from './auth.types';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const realm = process.env.KEYCLOAK_REALM;

    if (!keycloakUrl || !realm) {
      throw new Error('KEYCLOAK_URL and KEYCLOAK_REALM are required');
    }

    const issuer = `${keycloakUrl.replace(/\/$/, '')}/realms/${realm}`;

    super({
      algorithms: ['RS256'],
      issuer,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
        rateLimit: true,
      }),
    });
  }

  async validate(payload: unknown): Promise<AuthUser> {
    const claims = normalizeKeycloakClaims(payload);

    if (!claims) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token is missing required user claims',
      });
    }

    return this.usersService.upsertFromClaims(claims);
  }
}

function normalizeKeycloakClaims(payload: unknown): KeycloakClaims | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const claims = payload as Record<string, unknown>;
  const sub = readString(claims.sub);
  const preferredUsername = readString(claims.preferred_username);
  const directEmail = readString(claims.email);
  const email =
    directEmail ??
    (preferredUsername && isEmailShaped(preferredUsername)
      ? preferredUsername
      : undefined);
  const givenName = readString(claims.given_name);
  const familyName = readString(claims.family_name);
  const fullName = [givenName, familyName].filter(Boolean).join(' ');
  const name =
    readString(claims.name) || fullName || preferredUsername;

  if (!sub || !email || !name) {
    return null;
  }

  const picture = readString(claims.picture);
  return {
    sub,
    email,
    name,
    ...(picture ? { picture } : {}),
  };
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  return value.trim() || undefined;
}

function isEmailShaped(value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value);
}
