import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  roleAtLeast,
  type CreateDocumentInput,
  type MoveDocumentInput,
  type PutDocumentMembersInput,
  type UpdateDocumentContentInput,
  type UpdateDocumentInput,
} from '@web-note/shared';
import { and, desc, eq, isNull, max } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import {
  documentMembers,
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

    if (input.isPrivate !== undefined) {
      await this.assertCanManageDocumentAcl(userId, document);
    }

    if (input.folderId !== undefined && input.folderId !== null) {
      await this.assertFolderInWorkspace(input.folderId, document.workspaceId);
    }

    const [updated] = await this.database
      .update(documents)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.folderId !== undefined ? { folderId: input.folderId } : {}),
        ...(input.isPrivate !== undefined
          ? { isPrivate: input.isPrivate }
          : {}),
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

  async listMembers(userId: string, documentId: string) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'read');
    await this.findActiveDocument(documentId);

    return this.database
      .select({
        documentId: documentMembers.documentId,
        userId: documentMembers.userId,
        role: documentMembers.role,
        createdAt: documentMembers.createdAt,
      })
      .from(documentMembers)
      .where(eq(documentMembers.documentId, documentId));
  }

  async putMembers(
    userId: string,
    documentId: string,
    input: PutDocumentMembersInput,
  ) {
    const document = await this.findActiveDocument(documentId);
    await this.assertCanManageDocumentAcl(userId, document);

    return this.database.transaction(async (tx) => {
      await tx
        .delete(documentMembers)
        .where(eq(documentMembers.documentId, documentId));

      if (input.members.length > 0) {
        await tx.insert(documentMembers).values(
          input.members.map((member) => ({
            documentId,
            userId: member.userId,
            role: member.role,
          })),
        );
      }

      await this.audit.record(
        {
          actorId: userId,
          action: 'document.members.update',
          resourceType: 'document',
          resourceId: documentId,
          workspaceId: document.workspaceId,
          metadata: { members: input.members },
        },
        tx,
      );

      return input.members;
    });
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

  async listVersions(userId: string, documentId: string) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'read');
    await this.findActiveDocument(documentId);

    return this.database
      .select({
        version: documentVersions.version,
        title: documentVersions.title,
        createdAt: documentVersions.createdAt,
        createdBy: documentVersions.createdBy,
        restoredFromVersion: documentVersions.restoredFromVersion,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.version));
  }

  async getVersion(userId: string, documentId: string, version: number) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'read');
    await this.findActiveDocument(documentId);

    const snap = await this.findVersion(documentId, version);
    if (!snap) {
      throw new NotFoundException({
        code: 'VERSION_NOT_FOUND',
        message: 'Document version not found',
      });
    }

    return snap;
  }

  async restoreVersion(userId: string, documentId: string, version: number) {
    await this.permissions.requireDocumentAccess(userId, documentId, 'edit');
    const document = await this.findActiveDocument(documentId);

    return this.database.transaction(async (tx) => {
      const snap = await this.findVersion(documentId, version, tx);
      if (!snap) {
        throw new NotFoundException({
          code: 'VERSION_NOT_FOUND',
          message: 'Document version not found',
        });
      }

      await tx
        .update(documentRevisions)
        .set({
          content: snap.content,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(documentRevisions.documentId, documentId));

      await tx
        .update(documents)
        .set({
          title: snap.title,
          status: 'draft',
          updatedAt: new Date(),
        })
        .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)));

      const [row] = await tx
        .select({ maxVersion: max(documentVersions.version) })
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));

      const next = (row?.maxVersion ?? 0) + 1;

      await tx.insert(documentVersions).values({
        documentId,
        version: next,
        content: snap.content,
        title: snap.title,
        createdBy: userId,
        restoredFromVersion: version,
      });

      await this.audit.record(
        {
          actorId: userId,
          action: 'document.restore',
          resourceType: 'document',
          resourceId: documentId,
          workspaceId: document.workspaceId,
          metadata: { version: next, restoredFromVersion: version },
        },
        tx,
      );

      return {
        version: next,
        restoredFromVersion: version,
        status: 'draft' as const,
      };
    });
  }

  private async findVersion(
    documentId: string,
    version: number,
    executor: Pick<Database, 'query'> = this.database,
  ) {
    return executor.query.documentVersions.findFirst({
      where: and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.version, version),
      ),
    });
  }

  private async assertCanManageDocumentAcl(
    userId: string,
    document: { id: string; workspaceId: string; createdBy: string },
  ): Promise<void> {
    if (document.createdBy === userId) {
      return;
    }

    const role = await this.permissions.requireWorkspaceRole(
      userId,
      document.workspaceId,
      'admin',
    );

    if (!roleAtLeast(role, 'admin')) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permission to manage document ACL',
      });
    }
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
