import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuditService } from '../audit/audit.service';
import type { Database } from '../database/database.module';
import {
  documentRevisions,
  documentVersions,
  documents,
} from '../database/schema';
import type { PermissionsService } from '../permissions/permissions.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService publish + autosave', () => {
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
  }>;
  let service: DocumentsService;
  let record: jest.MockedFunction<AuditService['record']>;

  beforeEach(() => {
    documentState = {
      id: documentId,
      workspaceId,
      folderId: null,
      title: 'Project notes',
      createdBy: userId,
      status: 'draft',
      isPrivate: false,
      deletedAt: null,
      createdAt: new Date('2026-09-18T00:00:00.000Z'),
      updatedAt: new Date('2026-09-18T00:00:00.000Z'),
    };
    revisionContent = { type: 'doc', content: [] };
    versions = [];
    record = jest.fn<AuditService['record']>().mockResolvedValue(undefined);

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
      jest.fn(() => ({
        from: jest.fn((table: unknown) => ({
          where: jest.fn(async () => {
            if (table === documentVersions) {
              const maxVersion =
                versions.length === 0
                  ? null
                  : Math.max(...versions.map((row) => row.version));
              return [{ maxVersion }];
            }
            return [];
          }),
        })),
      }));

    const makeInsert = () =>
      jest.fn((table: unknown) => ({
        values: jest.fn((values: Record<string, unknown>) => {
          if (table === documentVersions) {
            versions.push(values as (typeof versions)[number]);
          }
          return {
            returning: jest.fn(async () => [values]),
          };
        }),
      }));

    const database = {
      query: {
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
        folders: { findFirst: jest.fn() },
      },
      update: makeUpdate(),
      select: makeSelect(),
      insert: makeInsert(),
      transaction: jest.fn(async (callback: (tx: object) => unknown) => {
        const tx = {
          query: database.query,
          update: makeUpdate(),
          select: makeSelect(),
          insert: makeInsert(),
        };
        return callback(tx);
      }),
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
  });

  it('publish creates version 1 and does not run on autosave', async () => {
    await service.updateContent(userId, documentId, {
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      title: 'Updated title',
    });

    expect(versions).toHaveLength(0);
    expect(revisionContent).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
    expect(documentState.title).toBe('Updated title');
    expect(documentState.status).toBe('draft');

    const published = await service.publish(userId, documentId);

    expect(published).toEqual({ version: 1 });
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      documentId,
      version: 1,
      title: 'Updated title',
      createdBy: userId,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    });
    expect(documentState.status).toBe('published');
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document.publish',
        metadata: { version: 1 },
      }),
      expect.anything(),
    );
  });
});
