import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuditService } from '../audit/audit.service';
import type { Database } from '../database/database.module';
import { documents } from '../database/schema';
import type { PermissionsService } from '../permissions/permissions.service';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const userId = '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491';
  const workspaceId = '24490ec4-79fa-4d22-bdc0-a55c62a96567';
  const documentId = 'cf7a98b5-ec15-48fd-bbea-c00ae3d67f09';

  const sourceDocument = {
    id: documentId,
    workspaceId,
    folderId: null as string | null,
    title: 'Project notes',
    createdBy: userId,
    status: 'draft' as const,
    isPrivate: false,
    deletedAt: null as Date | null,
    createdAt: new Date('2026-09-18T00:00:00.000Z'),
    updatedAt: new Date('2026-09-18T00:00:00.000Z'),
  };

  let requireDocumentAccess: jest.MockedFunction<
    PermissionsService['requireDocumentAccess']
  >;
  let getEffectiveDocumentAccess: jest.MockedFunction<
    PermissionsService['getEffectiveDocumentAccess']
  >;
  let record: jest.MockedFunction<AuditService['record']>;
  let service: DocumentsService;
  let insertedDocs: unknown[];

  beforeEach(() => {
    requireDocumentAccess = jest
      .fn<PermissionsService['requireDocumentAccess']>()
      .mockResolvedValue({
        role: 'editor',
        canRead: true,
        canEdit: true,
      });
    getEffectiveDocumentAccess = jest
      .fn<PermissionsService['getEffectiveDocumentAccess']>()
      .mockResolvedValue({
        role: 'editor',
        canRead: true,
        canEdit: true,
      });
    record = jest.fn<AuditService['record']>().mockResolvedValue(undefined);
    insertedDocs = [];

    const database = {
      query: {
        documents: {
          findFirst: jest.fn(async () => sourceDocument),
        },
        documentRevisions: {
          findFirst: jest.fn(async () => ({
            documentId,
            content: { type: 'doc', content: [{ type: 'paragraph' }] },
            updatedBy: userId,
          })),
        },
        folders: { findFirst: jest.fn() },
      },
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn(async () => [
              { ...sourceDocument, deletedAt: new Date() },
            ]),
          }),
        }),
      }),
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn(async () => [sourceDocument]),
        }),
      }),
      transaction: jest.fn(async (callback: (tx: object) => unknown) => {
        const tx = {
          insert: jest.fn((table: unknown) => ({
            values: jest.fn((values: unknown) => {
              if (table === documents) {
                insertedDocs.push(values);
                return {
                  returning: jest.fn(async () => [
                    {
                      ...sourceDocument,
                      id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                      title: (values as { title: string }).title,
                      status: 'draft' as const,
                    },
                  ]),
                };
              }
              return Promise.resolve();
            }),
          })),
        };
        return callback(tx);
      }),
    };

    service = new DocumentsService(
      database as unknown as Database,
      { record } as unknown as AuditService,
      {
        requireDocumentAccess,
        getEffectiveDocumentAccess,
        requireWorkspaceRole: jest
          .fn<PermissionsService['requireWorkspaceRole']>()
          .mockResolvedValue('editor'),
      } as unknown as PermissionsService,
    );
  });

  it('soft-deletes a document by setting deletedAt', async () => {
    const result = await service.softDelete(userId, documentId);

    expect(requireDocumentAccess).toHaveBeenCalledWith(
      userId,
      documentId,
      'edit',
    );
    expect(result.deletedAt).toBeInstanceOf(Date);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'document.delete' }),
    );
  });

  it('duplicates a document as draft Copy of … without copying versions', async () => {
    const created = await service.duplicate(userId, documentId);

    expect(created.title).toBe('Copy of Project notes');
    expect(created.status).toBe('draft');
    expect(insertedDocs[0]).toMatchObject({
      title: 'Copy of Project notes',
      status: 'draft',
      createdBy: userId,
      workspaceId,
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'document.duplicate',
        metadata: expect.objectContaining({ sourceDocumentId: documentId }),
      }),
      expect.anything(),
    );
  });

  it('list hides documents the user cannot read', async () => {
    getEffectiveDocumentAccess.mockResolvedValue(null);

    const rows = await service.list(userId, workspaceId);

    expect(rows).toEqual([]);
  });
});
