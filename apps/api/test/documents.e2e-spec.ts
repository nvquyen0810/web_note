import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuditService } from '../src/audit/audit.service';
import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthUser } from '../src/auth/auth.types';
import { DATABASE } from '../src/database/database.module';
import {
  documentRevisions,
  documents,
} from '../src/database/schema';
import { PermissionsService } from '../src/permissions/permissions.service';

const user: AuthUser = {
  id: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
  keycloakSub: 'keycloak-user-id',
  email: 'demo@example.com',
  name: 'Demo User',
};

const workspaceId = '24490ec4-79fa-4d22-bdc0-a55c62a96567';
const folderId = '8e45e222-a3de-4b6d-a64c-334418782ce1';
const documentId = 'cf7a98b5-ec15-48fd-bbea-c00ae3d67f09';

describe('Documents API', () => {
  let app: INestApplication;
  const inserted: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const createdDocument = {
    id: documentId,
    workspaceId,
    folderId,
    title: 'Project notes',
    createdBy: user.id,
    status: 'draft',
    isPrivate: false,
    deletedAt: null,
    createdAt: new Date('2026-09-18T00:00:00.000Z'),
    updatedAt: new Date('2026-09-18T00:00:00.000Z'),
  };

  beforeAll(async () => {
    process.env.KEYCLOAK_URL = 'http://keycloak.test';
    process.env.KEYCLOAK_REALM = 'webnote';

    const tx = {
      insert: jest.fn((table: unknown) => ({
        values: jest.fn((values: Record<string, unknown>) => {
          inserted.push({ table, values });
          return table === documents
            ? {
                returning: jest
                  .fn<() => Promise<(typeof createdDocument)[]>>()
                  .mockResolvedValue([createdDocument]),
              }
            : Promise.resolve();
        }),
      })),
    };
    const database = {
      transaction: jest.fn(
        async (callback: (executor: typeof tx) => unknown) => callback(tx),
      ),
      query: {
        folders: {
          findFirst: jest.fn(async () => ({ id: folderId })),
        },
      },
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE)
      .useValue(database)
      .overrideProvider(PermissionsService)
      .useValue({
        requireWorkspaceRole: jest
          .fn<() => Promise<'editor'>>()
          .mockResolvedValue('editor'),
        getEffectiveDocumentAccess: jest.fn(),
        requireDocumentAccess: jest.fn(),
      })
      .overrideProvider(AuditService)
      .useValue({
        record: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user: AuthUser }>().user = user;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('creates a draft document and its empty Tiptap revision', async () => {
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/documents`)
      .send({ title: 'Project notes', folderId })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: documentId,
          workspaceId,
          folderId,
          title: 'Project notes',
          createdBy: user.id,
          status: 'draft',
        });
      });

    expect(inserted).toContainEqual({
      table: documents,
      values: {
        workspaceId,
        folderId,
        title: 'Project notes',
        createdBy: user.id,
        status: 'draft',
        isPrivate: false,
      },
    });
    expect(inserted).toContainEqual({
      table: documentRevisions,
      values: {
        documentId,
        content: { type: 'doc', content: [] },
        updatedBy: user.id,
      },
    });
  });
});
