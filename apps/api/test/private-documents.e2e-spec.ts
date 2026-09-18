import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuditService } from '../src/audit/audit.service';
import { AuthGuard } from '../src/auth/auth.guard';
import type { AuthUser } from '../src/auth/auth.types';
import { DATABASE } from '../src/database/database.module';
import { PermissionsService } from '../src/permissions/permissions.service';

const adminUser: AuthUser = {
  id: '11111111-1111-1111-1111-111111111111',
  keycloakSub: 'admin-sub',
  email: 'admin@example.com',
  name: 'Admin User',
};

const editorUser: AuthUser = {
  id: '22222222-2222-2222-2222-222222222222',
  keycloakSub: 'editor-sub',
  email: 'editor@example.com',
  name: 'Editor User',
};

const workspaceId = '24490ec4-79fa-4d22-bdc0-a55c62a96567';
const privateDocId = 'cf7a98b5-ec15-48fd-bbea-c00ae3d67f09';
const publicDocId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

describe('Private document visibility', () => {
  let app: INestApplication;
  let currentUser: AuthUser = adminUser;

  beforeAll(async () => {
    process.env.KEYCLOAK_URL = 'http://keycloak.test';
    process.env.KEYCLOAK_REALM = 'webnote';

    const privateDoc = {
      id: privateDocId,
      workspaceId,
      folderId: null,
      title: 'Secret',
      createdBy: editorUser.id,
      status: 'draft',
      isPrivate: true,
      deletedAt: null,
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
      updatedAt: new Date('2026-09-18T00:00:00.000Z'),
    };
    const publicDoc = {
      ...privateDoc,
      id: publicDocId,
      title: 'Open',
      isPrivate: false,
    };

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE)
      .useValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn(async () => [privateDoc, publicDoc]),
          }),
        }),
        query: {},
        transaction: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })
      .overrideProvider(PermissionsService)
      .useValue({
        requireWorkspaceRole: jest.fn(async () => 'admin'),
        getEffectiveDocumentAccess: jest.fn(
          async (userId: string, documentId: string) => {
            if (documentId === publicDocId) {
              return { role: 'admin', canRead: true, canEdit: true };
            }
            // Private doc: only creator (editor) can read — not workspace admin
            if (documentId === privateDocId && userId === editorUser.id) {
              return { role: 'editor', canRead: true, canEdit: true };
            }
            return null;
          },
        ),
        requireDocumentAccess: jest.fn(),
      })
      .overrideProvider(AuditService)
      .useValue({ record: jest.fn(), listForWorkspace: jest.fn() })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest<{ user: AuthUser }>().user =
            currentUser;
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  it('hides a private editor document from workspace admin', async () => {
    currentUser = adminUser;

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/documents`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({ id: publicDocId, isPrivate: false }),
    ]);
    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: privateDocId }),
      ]),
    );
  });

  it('shows the private document to its creator', async () => {
    currentUser = editorUser;

    const response = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/documents`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: privateDocId, isPrivate: true }),
        expect.objectContaining({ id: publicDocId, isPrivate: false }),
      ]),
    );
  });
});
