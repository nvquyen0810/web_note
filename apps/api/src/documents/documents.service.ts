import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateDocumentInput,
  MoveDocumentInput,
  UpdateDocumentContentInput,
  UpdateDocumentInput,
} from '@web-note/shared';
import { and, eq, isNull, max } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import {
  documentRevisions,
  documentVersions,
  documents,
  folders,
  type DocumentContent,
} from '../database/schema';
import { PermissionsService } from '../permissions/permissions.service';

const EMPTY_DOC: DocumentContent = { type: 'doc', content: [] };

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'viewer');

    const rows = await this.database
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.workspaceId, workspaceId),
          isNull(documents.deletedAt),
        ),
      );

    const visible = [];
    for (const row of rows) {
      const access = await this.permissions.getEffectiveDocumentAccess(
        userId,
        row.id,
      );
      if (access?.canRead) {
        visible.push(row);
      }
    }
    return visible;
  }

  async create(
    userId: string,
    workspaceId: string,
    input: CreateDocumentInput,
  ) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'editor');

    const folderId = input.folderId === undefined ? null : input.folderId;
    if (folderId) {
      await this.assertFolderInWorkspace(folderId, workspaceId);
    }

    return this.database.transaction(async (tx) => {
      const [created] = await tx
        .insert(documents)
        .values({
          workspaceId,
          folderId,
          title: input.title,
          createdBy: userId,
          status: 'draft',
          isPrivate: false,
        })
        .returning();

      await tx.insert(documentRevisions).values({
        documentId: created.id,
        content: EMPTY_DOC,
        updatedBy: userId,
      });

      await this.audit.record(
        {
          actorId: userId,
          action: 'document.create',
          resourceType: 'document',
          resourceId: created.id,
          workspaceId,
          metadata: { title: input.title, folderId },
        },
        tx,
      );

      return created;
    });
  }

  async get(userId: string, documentId: string) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'read');

    const document = await this.findActiveDocument(documentId);
    const revision = await this.database.query.documentRevisions.findFirst({
      where: eq(documentRevisions.documentId, documentId),
    });

    return {
      ...document,
      content: revision?.content ?? EMPTY_DOC,
    };
  }

  async update(
    userId: string,
    documentId: string,
    input: UpdateDocumentInput,
  ) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);

    if (input.folderId !== undefined && input.folderId !== null) {
      await this.assertFolderInWorkspace(input.folderId, document.workspaceId);
    }

    const [updated] = await this.database
      .update(documents)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'document.update',
      resourceType: 'document',
      resourceId: documentId,
      workspaceId: document.workspaceId,
      metadata: input,
    });

    return updated;
  }

  async softDelete(userId: string, documentId: string) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);

    const [updated] = await this.database
      .update(documents)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'document.delete',
      resourceType: 'document',
      resourceId: documentId,
      workspaceId: document.workspaceId,
    });

    return updated;
  }

  async move(userId: string, documentId: string, input: MoveDocumentInput) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);

    if (input.folderId) {
      await this.assertFolderInWorkspace(input.folderId, document.workspaceId);
    }

    const [updated] = await this.database
      .update(documents)
      .set({ folderId: input.folderId, updatedAt: new Date() })
      .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
      .returning();

    await this.audit.record({
      actorId: userId,
      action: 'document.move',
      resourceType: 'document',
      resourceId: documentId,
      workspaceId: document.workspaceId,
      metadata: { folderId: input.folderId },
    });

    return updated;
  }

  async duplicate(userId: string, documentId: string) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);
    const revision = await this.database.query.documentRevisions.findFirst({
      where: eq(documentRevisions.documentId, documentId),
    });

    const content = structuredClone(revision?.content ?? EMPTY_DOC);
    const title = `Copy of ${document.title}`.slice(0, 500);

    return this.database.transaction(async (tx) => {
      const [created] = await tx
        .insert(documents)
        .values({
          workspaceId: document.workspaceId,
          folderId: document.folderId,
          title,
          createdBy: userId,
          status: 'draft',
          isPrivate: document.isPrivate,
        })
        .returning();

      await tx.insert(documentRevisions).values({
        documentId: created.id,
        content,
        updatedBy: userId,
      });

      await this.audit.record(
        {
          actorId: userId,
          action: 'document.duplicate',
          resourceType: 'document',
          resourceId: created.id,
          workspaceId: document.workspaceId,
          metadata: { sourceDocumentId: documentId, title },
        },
        tx,
      );

      return created;
    });
  }

  async updateContent(
    userId: string,
    documentId: string,
    input: UpdateDocumentContentInput,
  ) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);

    const [revision] = await this.database
      .update(documentRevisions)
      .set({
        content: input.content as DocumentContent,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(documentRevisions.documentId, documentId))
      .returning();

    if (!revision) {
      throw new NotFoundException({
        code: 'REVISION_NOT_FOUND',
        message: 'Document revision not found',
      });
    }

    let updatedDocument = document;
    if (input.title !== undefined) {
      const [next] = await this.database
        .update(documents)
        .set({ title: input.title, updatedAt: new Date() })
        .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
        .returning();
      updatedDocument = next ?? document;
    } else {
      await this.database
        .update(documents)
        .set({ updatedAt: new Date() })
        .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)));
    }

    return {
      ...updatedDocument,
      content: revision.content,
    };
  }

  async publish(userId: string, documentId: string) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);

    return this.database.transaction(async (tx) => {
      const revision = await tx.query.documentRevisions.findFirst({
        where: eq(documentRevisions.documentId, documentId),
      });

      if (!revision) {
        throw new NotFoundException({
          code: 'REVISION_NOT_FOUND',
          message: 'Document revision not found',
        });
      }

      const [row] = await tx
        .select({ maxVersion: max(documentVersions.version) })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      const next = (row?.maxVersion ?? 0) + 1;

      await tx.insert(documentVersions).values({
        documentId,
        version: next,
        content: revision.content,
        title: document.title,
        createdBy: userId,
      });

      await tx
        .update(documents)
        .set({ status: 'published', updatedAt: new Date() })
        .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)));

      await this.audit.record(
        {
          actorId: userId,
          action: 'document.publish',
          resourceType: 'document',
          resourceId: documentId,
          workspaceId: document.workspaceId,
          metadata: { version: next },
        },
        tx,
      );

      return { version: next };
    });
  }

  private async findActiveDocument(documentId: string) {
    const document = await this.database.query.documents.findFirst({
      where: and(eq(documents.id, documentId), isNull(documents.deletedAt)),
    });

    if (!document) {
      throw new NotFoundException({
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found',
      });
    }

    return document;
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
        message: 'Folder not found in workspace',
      });
    }
  }
}
