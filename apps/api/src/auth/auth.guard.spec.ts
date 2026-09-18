import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  const guard = new AuthGuard();
  const user = {
    id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
    keycloakSub: 'keycloak-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
  };

  it('rethrows HttpException errors from the strategy', () => {
    const error = new InternalServerErrorException({
      code: 'USER_SYNC_FAILED',
      message: 'User synchronization failed',
    });

    expect(() => guard.handleRequest(error, null)).toThrow(error);
  });

  it('rethrows UnauthorizedException from invalid token claims', () => {
    const error = new UnauthorizedException({
      code: 'INVALID_TOKEN',
      message: 'Token is missing required user claims',
    });

    expect(() => guard.handleRequest(error, null)).toThrow(error);
  });

  it('returns the authenticated user when present', () => {
    expect(guard.handleRequest(null, user)).toEqual(user);
  });

  it('maps a missing user to UnauthorizedException', () => {
    expect(() => guard.handleRequest(null, null)).toThrow(
      new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      }),
    );
  });

  it('maps a false user to UnauthorizedException', () => {
    expect(() => guard.handleRequest(null, false)).toThrow(
      new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Authentication is required',
      }),
    );
  });
});
