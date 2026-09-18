import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthUser } from '../src/auth/auth.types';
import { DATABASE } from '../src/database/database.module';
import { workspaceMembers, workspaces } from '../src/database/schema';

const mockUser: AuthUser = {
  id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
  keycloakSub: 'keycloak-user-id',
  email: 'demo@example.com',
  name: 'Demo User',
};

const workspace = {
  id: '24490ec4-79fa-4d22-bdc0-a55c62a96567',
  name: 'Engineering',
  createdBy: mockUser.id,
  createdAt: new Date('2026-09-18T00:00:00.000Z'),
  updatedAt: new Date('2026-09-18T00:00:00.000Z'),
};

describe('POST /workspaces', () => {
  let app: INestApplication;
  const insertedValues: Array<{ table: unknown; values: unknown }> = [];

  beforeAll(async () => {
    process.env.KEYCLOAK_URL = 'http://keycloak.test';
    process.env.KEYCLOAK_REALM = 'webnote';

    const transaction = jest.fn(async (callback: (tx: object) => unknown) => {
      const tx = {
        insert: jest.fn((table: unknown) => ({
          values: jest.fn((values: unknown) => {
            insertedValues.push({ table, values });
            return table === workspaces
              ? {
                  returning: jest
                    .fn<() => Promise<(typeof workspace)[]>>()
                    .mockResolvedValue([workspace]),
                }
              : Promise.resolve();
          }),
        })),
      };

      return callback(tx);
    });

    const database = {
      transaction,
      insert: jest.fn(() => ({
        values: jest
          .fn<() => Promise<void>>()
          .mockResolvedValue(undefined),
      })),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DATABASE)
      .useValue(database)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
          request.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a workspace with the current user as owner', async () => {
    await request(app.getHttpServer())
      .post('/workspaces')
      .send({ name: workspace.name })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: workspace.id,
          name: workspace.name,
          createdBy: mockUser.id,
        });
      });

    expect(insertedValues).toContainEqual({
      table: workspaceMembers,
      values: {
        workspaceId: workspace.id,
        userId: mockUser.id,
        role: 'owner',
      },
    });
  });
});
