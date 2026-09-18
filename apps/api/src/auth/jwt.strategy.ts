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
    if (!isKeycloakClaims(payload)) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token is missing required user claims',
      });
    }

    return this.usersService.upsertFromClaims(payload);
  }
}

function isKeycloakClaims(payload: unknown): payload is KeycloakClaims {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const claims = payload as Record<string, unknown>;
  return (
    typeof claims.sub === 'string' &&
    typeof claims.email === 'string' &&
    typeof claims.name === 'string' &&
    (claims.picture === undefined || typeof claims.picture === 'string')
  );
}
