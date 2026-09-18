import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { WorkspaceRole } from '@web-note/shared';
import type { Database } from '../database/database.module';
import { PermissionsService } from './permissions.service';

type DocumentRecord = {
  id: string;
  workspaceId: string;
  createdBy: string;
  isPrivate: boolean;
  deletedAt: Date | null;
};

type MemberRecord = {
  role: WorkspaceRole;
};

function createService({
  document,
  workspaceMember,
  documentMember,
  workspaceExists = true,
}: {
  document: DocumentRecord;
  workspaceMember?: MemberRecord;
  documentMember?: MemberRecord;
  workspaceExists?: boolean;
}) {
  const database = {
    query: {
      documents: {
        findFirst: jest.fn().mockResolvedValue(document),
      },
      workspaceMembers: {
        findFirst: jest.fn().mockResolvedValue(workspaceMember),
      },
      documentMembers: {
        findFirst: jest.fn().mockResolvedValue(documentMember),
      },
      workspaces: {
        findFirst: jest
          .fn()
          .mockResolvedValue(workspaceExists ? { id: document.workspaceId } : undefined),
      },
    },
  } as unknown as Database;

  return new PermissionsService(database);
}

const publicDocument: DocumentRecord = {
  id: 'document-id',
  workspaceId: 'workspace-id',
  createdBy: 'creator-id',
  isPrivate: false,
  deletedAt: null,
};

describe('PermissionsService.getEffectiveDocumentAccess', () => {
  it('allows a workspace editor to edit a public document', async () => {
    const service = createService({
      document: publicDocument,
      workspaceMember: { role: 'editor' },
    });

    await expect(
      service.getEffectiveDocumentAccess('user-id', publicDocument.id),
    ).resolves.toEqual({
      role: 'editor',
      canRead: true,
      canEdit: true,
    });
  });

  it('allows a workspace viewer to read but not edit a public document', async () => {
    const service = createService({
      document: publicDocument,
      workspaceMember: { role: 'viewer' },
    });

    await expect(
      service.getEffectiveDocumentAccess('user-id', publicDocument.id),
    ).resolves.toEqual({
      role: 'viewer',
      canRead: true,
      canEdit: false,
    });
  });

  it('denies a workspace admin access to an unshared private document', async () => {
    const service = createService({
      document: { ...publicDocument, isPrivate: true },
      workspaceMember: { role: 'admin' },
    });

    await expect(
      service.getEffectiveDocumentAccess('user-id', publicDocument.id),
    ).resolves.toBeNull();
  });

  it('allows a workspace owner to read a private document', async () => {
    const service = createService({
      document: { ...publicDocument, isPrivate: true },
      workspaceMember: { role: 'owner' },
    });

    await expect(
      service.getEffectiveDocumentAccess('user-id', publicDocument.id),
    ).resolves.toEqual({
      role: 'owner',
      canRead: true,
      canEdit: true,
    });
  });

  it('uses a document editor role over a workspace viewer role', async () => {
    const service = createService({
      document: publicDocument,
      workspaceMember: { role: 'viewer' },
      documentMember: { role: 'editor' },
    });

    await expect(
      service.getEffectiveDocumentAccess('user-id', publicDocument.id),
    ).resolves.toEqual({
      role: 'editor',
      canRead: true,
      canEdit: true,
    });
  });
});

describe('PermissionsService.requireWorkspaceRole', () => {
  it('returns the member role when it meets the minimum', async () => {
    const service = createService({
      document: publicDocument,
      workspaceMember: { role: 'editor' },
    });

    await expect(
      service.requireWorkspaceRole('user-id', 'workspace-id', 'viewer'),
    ).resolves.toBe('editor');
  });

  it('throws a structured forbidden error below the minimum role', async () => {
    const service = createService({
      document: publicDocument,
      workspaceMember: { role: 'viewer' },
    });

    const result = service.requireWorkspaceRole(
      'user-id',
      'workspace-id',
      'editor',
    );

    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    await expect(result).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'Insufficient workspace role',
      },
    });
  });

  it('throws a structured not-found error for a missing workspace', async () => {
    const service = createService({
      document: publicDocument,
      workspaceExists: false,
    });

    const result = service.requireWorkspaceRole(
      'user-id',
      'workspace-id',
      'viewer',
    );

    await expect(result).rejects.toBeInstanceOf(NotFoundException);
    await expect(result).rejects.toMatchObject({
      response: {
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      },
    });
  });
});
