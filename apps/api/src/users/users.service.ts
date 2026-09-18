import { Inject, Injectable } from '@nestjs/common';
import type { AuthUser, KeycloakClaims } from '../auth/auth.types';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import { users } from '../database/schema';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async upsertFromClaims(claims: KeycloakClaims): Promise<AuthUser> {
    const [user] = await this.database
      .insert(users)
      .values({
        keycloakSub: claims.sub,
        email: claims.email,
        name: claims.name,
        avatarUrl: claims.picture ?? null,
      })
      .onConflictDoUpdate({
        target: users.keycloakSub,
        set: {
          email: claims.email,
          name: claims.name,
          avatarUrl: claims.picture ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({
        id: users.id,
        keycloakSub: users.keycloakSub,
        email: users.email,
        name: users.name,
      });

    if (user) {
      return user;
    }

    throw new Error('User sync did not return a user');
  }
}
