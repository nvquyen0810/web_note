import { InternalServerErrorException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { users } from '../database/schema';
import { UsersService } from './users.service';

function createDatabase(returnedUsers: unknown[]) {
  const returning = jest.fn().mockResolvedValue(returnedUsers as never);
  const onConflictDoUpdate = jest.fn(() => ({ returning }));
  const values = jest.fn(() => ({ onConflictDoUpdate }));
  const insert = jest.fn(() => ({ values }));

  return {
    database: { insert },
    insert,
    values,
    onConflictDoUpdate,
  };
}

describe('UsersService', () => {
  const claims = {
    sub: 'keycloak-user-id',
    email: 'demo@example.com',
    name: 'Demo User',
    picture: 'https://example.com/avatar.png',
  };
  const user = {
    id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
    keycloakSub: claims.sub,
    email: claims.email,
    name: claims.name,
  };

  it('inserts a user from normalized claims', async () => {
    const database = createDatabase([user]);
    const service = new UsersService(database.database as never);

    await expect(service.upsertFromClaims(claims)).resolves.toEqual(user);
    expect(database.insert).toHaveBeenCalledWith(users);
    expect(database.values).toHaveBeenCalledWith({
      keycloakSub: claims.sub,
      email: claims.email,
      name: claims.name,
      avatarUrl: claims.picture,
    });
  });

  it('updates mutable user fields when the Keycloak subject exists', async () => {
    const database = createDatabase([user]);
    const service = new UsersService(database.database as never);

    await service.upsertFromClaims(claims);

    expect(database.onConflictDoUpdate).toHaveBeenCalledWith({
      target: users.keycloakSub,
      set: {
        email: claims.email,
        name: claims.name,
        avatarUrl: claims.picture,
        updatedAt: expect.any(Date),
      },
    });
  });

  it('throws the project error shape when synchronization returns no user', async () => {
    const database = createDatabase([]);
    const service = new UsersService(database.database as never);

    await expect(service.upsertFromClaims(claims)).rejects.toEqual(
      new InternalServerErrorException({
        code: 'USER_SYNC_FAILED',
        message: 'User synchronization failed',
      }),
    );
  });
});
