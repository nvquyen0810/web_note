import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canEditContent,
  roleAtLeast,
  type WorkspaceRole,
} from '@web-note/shared';
import { and, eq, isNull } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import {
  documentMembers,
  documents,
  workspaceMembers,
  workspaces,
} from '../database/schema';

export type EffectiveDocumentAccess = {
  role: WorkspaceRole;
  canRead: boolean;
  canEdit: boolean;
};

@Injectable()
export class PermissionsService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async getEffectiveDocumentAccess(
    userId: string,
    documentId: string,
  ): Promise<EffectiveDocumentAccess | null> {
    const document = await this.database.query.documents.findFirst({
      columns: {
        workspaceId: true,
        createdBy: true,
        isPrivate: true,
      },
      where: and(eq(documents.id, documentId), isNull(documents.deletedAt)),
    });

    if (!document) {
      return null;
    }

    const [workspaceMember, documentMember] = await Promise.all([
      this.database.query.workspaceMembers.findFirst({
        columns: { role: true },
        where: and(
          eq(workspaceMembers.workspaceId, document.workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      }),
      this.database.query.documentMembers.findFirst({
        columns: { role: true },
        where: and(
          eq(documentMembers.documentId, documentId),
          eq(documentMembers.userId, userId),
        ),
      }),
    ]);

    if (document.isPrivate) {
      const isCreator = document.createdBy === userId;
      const isWorkspaceOwner = workspaceMember?.role === 'owner';

      if (!isCreator && !documentMember && !isWorkspaceOwner) {
        return null;
      }
    } else if (!workspaceMember && !documentMember) {
      return null;
    }

    const role = documentMember?.role ?? workspaceMember?.role;

    if (!role) {
      return null;
    }

    return {
      role,
      canRead: true,
      canEdit: canEditContent(role),
    };
  }

  async requireWorkspaceRole(
    userId: string,
    workspaceId: string,
    minimum: WorkspaceRole,
  ): Promise<WorkspaceRole> {
    const [workspace, member] = await Promise.all([
      this.database.query.workspaces.findFirst({
        columns: { id: true },
        where: eq(workspaces.id, workspaceId),
      }),
      this.database.query.workspaceMembers.findFirst({
        columns: { role: true },
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      }),
    ]);

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    if (!member || !roleAtLeast(member.role, minimum)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient workspace role',
      });
    }

    return member.role;
  }

  async requireDocumentAccess(
    userId: string,
    documentId: string,
    mode: 'read' | 'edit' = 'read',
  ): Promise<EffectiveDocumentAccess> {
    const access = await this.getEffectiveDocumentAccess(userId, documentId);

    if (!access || (mode === 'edit' && !access.canEdit)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message:
          mode === 'edit'
            ? 'Insufficient permission to edit document'
            : 'Insufficient permission to read document',
      });
    }

    return access;
  }
}
