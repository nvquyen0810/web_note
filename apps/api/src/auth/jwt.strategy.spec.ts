import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const user = {
    id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
    keycloakSub: 'keycloak-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
  };

  beforeEach(() => {
    process.env.KEYCLOAK_URL = 'http://keycloak.test';
    process.env.KEYCLOAK_REALM = 'webnote';
  });

  it('maps standard access-token claims and upserts the user', async () => {
    const upsertFromClaims = jest.fn().mockResolvedValue(user as never);
    const strategy = new JwtStrategy({ upsertFromClaims } as unknown as UsersService);

    await expect(
      strategy.validate({
        sub: user.keycloakSub,
        email: user.email,
        name: user.name,
        picture: 'https://example.com/avatar.png',
      }),
    ).resolves.toEqual(user);
    expect(upsertFromClaims).toHaveBeenCalledWith({
      sub: user.keycloakSub,
      email: user.email,
      name: user.name,
      picture: 'https://example.com/avatar.png',
    });
  });

  it('falls back to an email-shaped username and given/family names', async () => {
    const upsertFromClaims = jest.fn().mockResolvedValue(user as never);
    const strategy = new JwtStrategy({ upsertFromClaims } as unknown as UsersService);

    await strategy.validate({
      sub: user.keycloakSub,
      preferred_username: user.email,
      given_name: 'Demo',
      family_name: 'User',
    });

    expect(upsertFromClaims).toHaveBeenCalledWith({
      sub: user.keycloakSub,
      email: user.email,
      name: 'Demo User',
    });
  });

  it('uses the preferred username as the name when no display name is present', async () => {
    const upsertFromClaims = jest.fn().mockResolvedValue(user as never);
    const strategy = new JwtStrategy({ upsertFromClaims } as unknown as UsersService);

    await strategy.validate({
      sub: user.keycloakSub,
      email: user.email,
      preferred_username: 'demo',
    });

    expect(upsertFromClaims).toHaveBeenCalledWith({
      sub: user.keycloakSub,
      email: user.email,
      name: 'demo',
    });
  });

  it('rejects claims without a usable email', async () => {
    const upsertFromClaims = jest.fn();
    const strategy = new JwtStrategy({ upsertFromClaims } as unknown as UsersService);

    await expect(
      strategy.validate({
        sub: user.keycloakSub,
        preferred_username: 'not-an-email',
        name: user.name,
      }),
    ).rejects.toEqual(
      new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'Token is missing required user claims',
      }),
    );
    expect(upsertFromClaims).not.toHaveBeenCalled();
  });
});
