import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuditService } from '../audit/audit.service';
import type { Database } from '../database/database.module';
import {
  documentRevisions,
  documentVersions,
  documents,
} from '../database/schema';
import type { PermissionsService } from '../permissions/permissions.service';
import { DocumentsService } from '../documents/documents.service';

describe('DocumentsService restore version', () => {
  const userId = '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491';
  const documentId = 'cf7a98b5-ec15-48fd-bbea-c00ae3d67f09';
  const workspaceId = '24490ec4-79fa-4d22-bdc0-a55c62a96567';

  let documentState: {
    id: string;
    workspaceId: string;
    folderId: string | null;
    title: string;
    createdBy: string;
    status: 'draft' | 'published';
    isPrivate: boolean;
    deletedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  let revisionContent: Record<string, unknown>;
  let versions: Array<{
    documentId: string;
    version: number;
    content: Record<string, unknown>;
    title: string;
    createdBy: string;
    restoredFromVersion: number | null;
    createdAt: Date;
  }>;
  let lookupVersion: number | null;
  let service: DocumentsService;
  let record: jest.MockedFunction<AuditService['record']>;

  beforeEach(() => {
    documentState = {
      id: documentId,
      workspaceId,
      folderId: null,
      title: 'v2 title',
      createdBy: userId,
      status: 'published',
      isPrivate: false,
      deletedAt: null,
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
      updatedAt: new Date('2026-09-18T00:00:00.000Z'),
    };
    revisionContent = {
      type: 'doc',
      content: [{ type: 'paragraph', text: 'v2' }],
    };
    versions = [
      {
        documentId,
        version: 1,
        content: { type: 'doc', content: [{ type: 'paragraph', text: 'v1' }] },
        title: 'v1 title',
        createdBy: userId,
        restoredFromVersion: null,
        createdAt: new Date('2026-09-18T01:00:00.000Z'),
      },
      {
        documentId,
        version: 2,
        content: { type: 'doc', content: [{ type: 'paragraph', text: 'v2' }] },
        title: 'v2 title',
        createdBy: userId,
        restoredFromVersion: null,
        createdAt: new Date('2026-09-18T02:00:00.000Z'),
      },
    ];
    lookupVersion = null;
    record = jest.fn<AuditService['record']>().mockResolvedValue(undefined);

    const findVersionRow = () =>
      versions.find((row) => row.version === lookupVersion);

    const makeUpdate = () =>
      jest.fn((table: unknown) => ({
        set: jest.fn((values: Record<string, unknown>) => {
          const apply = () => {
            if (table === documents) {
              Object.assign(documentState, values);
              return [{ ...documentState }];
            }
            if (table === documentRevisions) {
              if (values.content) {
                revisionContent = values.content as Record<string, unknown>;
              }
              return [
                {
                  documentId,
                  content: revisionContent,
                  updatedBy: userId,
                  updatedAt: new Date(),
                },
              ];
            }
            return [];
          };

          const where = jest.fn(() => {
            const rows = apply();
            return Object.assign(Promise.resolve(rows), {
              returning: jest.fn(async () => rows),
            });
          });

          return { where };
        }),
      }));

    const makeSelect = () =>
      jest.fn((fields?: Record<string, unknown>) => ({
        from: jest.fn((table: unknown) => {
          const where = jest.fn(() => {
            if (fields && 'maxVersion' in (fields as object)) {
              return Promise.resolve([
                {
                  maxVersion:
                    versions.length === 0
                      ? null
                      : Math.max(...versions.map((row) => row.version)),
                },
              ]);
            }

            const rows =
              table === documentVersions
                ? [...versions].sort((a, b) => b.version - a.version)
                : [];

            return Object.assign(Promise.resolve(rows), {
              orderBy: jest.fn(async () => rows),
            });
          });

          return {
            where,
            orderBy: jest.fn(async () =>
              table === documentVersions
                ? [...versions].sort((a, b) => b.version - a.version)
                : [],
            ),
          };
        }),
      }));

    const makeInsert = () =>
      jest.fn((table: unknown) => ({
        values: jest.fn((values: Record<string, unknown>) => {
          if (table === documentVersions) {
            versions.push({
              documentId: values.documentId as string,
              version: values.version as number,
              content: values.content as Record<string, unknown>,
              title: values.title as string,
              createdBy: values.createdBy as string,
              restoredFromVersion:
                (values.restoredFromVersion as number | null | undefined) ??
                null,
              createdAt: new Date(),
            });
          }
          return {
            returning: jest.fn(async () => [values]),
          };
        }),
      }));

    const query = {
      documents: {
        findFirst: jest.fn(async () =>
          documentState.deletedAt ? undefined : { ...documentState },
        ),
      },
      documentRevisions: {
        findFirst: jest.fn(async () => ({
          documentId,
          content: revisionContent,
          updatedBy: userId,
          updatedAt: new Date(),
        })),
      },
      documentVersions: {
        findFirst: jest.fn(async () => findVersionRow()),
      },
      folders: { findFirst: jest.fn() },
    };

    const database = {
      query,
      update: makeUpdate(),
      select: makeSelect(),
      insert: makeInsert(),
      transaction: jest.fn(async (callback: (tx: object) => unknown) =>
        callback({
          query,
          update: makeUpdate(),
          select: makeSelect(),
          insert: makeInsert(),
        }),
      ),
    };

    service = new DocumentsService(
      database as unknown as Database,
      { record } as unknown as AuditService,
      {
        requireDocumentAccess: jest
          .fn<PermissionsService['requireDocumentAccess']>()
          .mockResolvedValue({
            role: 'editor',
            canRead: true,
            canEdit: true,
          }),
      } as unknown as PermissionsService,
    );

    // Capture version lookups for the opaque drizzle `where` clause.
    const originalRestore = service.restoreVersion.bind(service);
    service.restoreVersion = async (actorId, docId, version) => {
      lookupVersion = version;
      return originalRestore(actorId, docId, version);
    };
  });

  it('restore v1 after v2 publish creates v3 linked to 1 and sets draft', async () => {
    const result = await service.restoreVersion(userId, documentId, 1);

    expect(result).toMatchObject({
      version: 3,
      restoredFromVersion: 1,
      status: 'draft',
    });
    expect(documentState.status).toBe('draft');
    expect(documentState.title).toBe('v1 title');
    expect(revisionContent).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', text: 'v1' }],
    });
    expect(versions).toHaveLength(3);
    expect(versions[2]).toMatchObject({
      version: 3,
      restoredFromVersion: 1,
      title: 'v1 title',
      content: { type: 'doc', content: [{ type: 'paragraph', text: 'v1' }] },
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document.restore',
        metadata: { version: 3, restoredFromVersion: 1 },
      }),
      expect.anything(),
    );
  });
});
