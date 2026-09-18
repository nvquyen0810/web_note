import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateFolderInput,
  MoveFolderInput,
  UpdateFolderInput,
} from '@web-note/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import { folders } from '../database/schema';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class FoldersService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'viewer');

    return this.database
      .select()
      .from(folders)
      .where(
        and(eq(folders.workspaceId, workspaceId), isNull(folders.deletedAt)),
      );
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateFolderInput,
  ) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'editor');

    if (input.parentId) {
      await this.assertFolderInWorkspace(input.parentId, workspaceId);
    }

    const [created] = await this.database
      .insert(folders)
      .values({
        workspaceId,
        name: input.name,
        parentId: input.parentId ?? null,
      })
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'folder.create',
      resourceType: 'folder',
      resourceId: created.id,
      workspaceId,
      metadata: { name: input.name, parentId: input.parentId ?? null },
    });

    return created;
  }

  async update(userId: string, folderId: string, input: UpdateFolderInput) {
    const folder = await this.requireEditableFolder(userId, folderId);

    if (!input.name) {
      return folder;
    }

    const [updated] = await this.database
      .update(folders)
      .set({ name: input.name, updatedAt: new Date() })
      .where(and(eq(folders.id, folderId), isNull(folders.deletedAt)))
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'folder.update',
      resourceType: 'folder',
      resourceId: folderId,
      workspaceId: folder.workspaceId,
      metadata: { name: input.name },
    });

    return updated;
  }

  async move(userId: string, folderId: string, input: MoveFolderInput) {
    const folder = await this.requireEditableFolder(userId, folderId);

    if (input.parentId === folderId) {
      throw new BadRequestException({
        code: 'INVALID_FOLDER_PARENT',
        message: 'A folder cannot be its own parent',
      });
    }

    if (input.parentId) {
      await this.assertFolderInWorkspace(input.parentId, folder.workspaceId);
    }

    const [updated] = await this.database
      .update(folders)
      .set({ parentId: input.parentId, updatedAt: new Date() })
      .where(and(eq(folders.id, folderId), isNull(folders.deletedAt)))
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'folder.move',
      resourceType: 'folder',
      resourceId: folderId,
      workspaceId: folder.workspaceId,
      metadata: { parentId: input.parentId },
    });

    return updated;
  }

  async softDelete(userId: string, folderId: string) {
    const folder = await this.requireEditableFolder(userId, folderId);

    const [updated] = await this.database
      .update(folders)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(folders.id, folderId), isNull(folders.deletedAt)))
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'folder.delete',
      resourceType: 'folder',
      resourceId: folderId,
      workspaceId: folder.workspaceId,
    });

    return updated;
  }

  private async requireEditableFolder(userId: string, folderId: string) {
    const folder = await this.database.query.folders.findFirst({
      where: and(eq(folders.id, folderId), isNull(folders.deletedAt)),
    });

    if (!folder) {
      throw new NotFoundException({
        code: 'FOLDER_NOT_FOUND',
        message: 'Folder not found',
      });
    }

    await this.permissions.requireWorkspaceRole(
      userId,
      folder.workspaceId,
      'editor',
    );

    return folder;
  }

  private async assertFolderInWorkspace(
    folderId: string,
    workspaceId: string,
  ): Promise<void> {
    const folder = await this.database.query.folders.findFirst({
      columns: { id: true },
      where: and(
        eq(folders.id, folderId),
        eq(folders.workspaceId, workspaceId),
        isNull(folders.deletedAt),
      ),
    });

    if (!folder) {
      throw new BadRequestException({
        code: 'FOLDER_NOT_FOUND',
        message: 'Parent folder not found in workspace',
      });
    }
  }
}
