import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  canManageMembers,
  type AddWorkspaceMemberInput,
  type CreateWorkspaceInput,
  type RemoveWorkspaceMemberInput,
  type UpdateWorkspaceInput,
  type UpdateWorkspaceMemberInput,
  type WorkspaceRole,
} from '@web-note/shared';
import { and, eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import { workspaceMembers, workspaces } from '../database/schema';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
  ) {}

  async create(userId: string, input: CreateWorkspaceInput) {
    return this.database.transaction(async (tx) => {
      const [created] = await tx
        .insert(workspaces)
        .values({
          name: input.name,
          createdBy: userId,
        })
        .returning();

      await tx.insert(workspaceMembers).values({
        workspaceId: created.id,
        userId,
        role: 'owner',
      });

      await this.audit.record(
        {
          actorId: userId,
          action: 'workspace.create',
          resourceType: 'workspace',
          resourceId: created.id,
          workspaceId: created.id,
        },
        tx,
      );

      return created;
    });
  }

  async listForUser(userId: string) {
    return this.database
      .select({
        id: workspaces.id,
        name: workspaces.name,
        createdBy: workspaces.createdBy,
        createdAt: workspaces.createdAt,
        updatedAt: workspaces.updatedAt,
        role: workspaceMembers.role,
      })
      .from(workspaces)
      .innerJoin(
        workspaceMembers,
        eq(workspaceMembers.workspaceId, workspaces.id),
      )
      .where(eq(workspaceMembers.userId, userId));
  }

  async getById(userId: string, workspaceId: string) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'viewer');

    const workspace = await this.database.query.workspaces.findFirst({
      where: eq(workspaces.id, workspaceId),
    });

    if (!workspace) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    return workspace;
  }

  async update(
    userId: string,
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'admin');

    const [updated] = await this.database
      .update(workspaces)
      .set({
        name: input.name,
        updatedAt: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))
      .returning();

    if (!updated) {
      throw new NotFoundException({
        code: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace not found',
      });
    }

    await this.audit.record({
      actorId: userId,
      action: 'workspace.update',
      resourceType: 'workspace',
      resourceId: workspaceId,
      workspaceId,
      metadata: { name: input.name },
    });

    return updated;
  }

  async listMembers(userId: string, workspaceId: string) {
    await this.permissions.requireWorkspaceRole(userId, workspaceId, 'viewer');

    return this.database
      .select({
        id: workspaceMembers.id,
        workspaceId: workspaceMembers.workspaceId,
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        createdAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async addMember(
    actorId: string,
    workspaceId: string,
    input: AddWorkspaceMemberInput,
  ) {
    await this.assertCanManageMembers(actorId, workspaceId);

    if (input.role === 'owner') {
      await this.assertCanAssignOwner(actorId, workspaceId);
    }

    try {
      const [member] = await this.database
        .insert(workspaceMembers)
        .values({
          workspaceId,
          userId: input.userId,
          role: input.role,
        })
        .returning();

      await this.audit.record({
        actorId,
        action: 'workspace.member.add',
        resourceType: 'workspace',
        resourceId: workspaceId,
        workspaceId,
        metadata: { userId: input.userId, role: input.role },
      });

      return member;
    } catch (error) {
      this.rethrowMemberWriteError(error);
    }
  }

  async updateMember(
    actorId: string,
    workspaceId: string,
    input: UpdateWorkspaceMemberInput,
  ) {
    await this.assertCanManageMembers(actorId, workspaceId);

    const existing = await this.findMember(workspaceId, input.userId);

    if (!existing) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Workspace member not found',
      });
    }

    if (existing.role === 'owner' && input.role !== 'owner') {
      await this.assertNotLastOwner(workspaceId, input.userId);
    }

    if (input.role === 'owner') {
      await this.assertCanAssignOwner(actorId, workspaceId);
    }

    const [updated] = await this.database
      .update(workspaceMembers)
      .set({ role: input.role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, input.userId),
        ),
      )
      .returning();

    await this.audit.record({
      actorId,
      action: 'workspace.member.update',
      resourceType: 'workspace',
      resourceId: workspaceId,
      workspaceId,
      metadata: { userId: input.userId, role: input.role },
    });

    return updated;
  }

  async removeMember(
    actorId: string,
    workspaceId: string,
    input: RemoveWorkspaceMemberInput,
  ) {
    await this.assertCanManageMembers(actorId, workspaceId);

    const existing = await this.findMember(workspaceId, input.userId);

    if (!existing) {
      throw new NotFoundException({
        code: 'MEMBER_NOT_FOUND',
        message: 'Workspace member not found',
      });
    }

    if (existing.role === 'owner') {
      await this.assertNotLastOwner(workspaceId, input.userId);
    }

    await this.database
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, input.userId),
        ),
      );

    await this.audit.record({
      actorId,
      action: 'workspace.member.remove',
      resourceType: 'workspace',
      resourceId: workspaceId,
      workspaceId,
      metadata: { userId: input.userId },
    });

    return { ok: true as const };
  }

  private async assertCanManageMembers(
    actorId: string,
    workspaceId: string,
  ): Promise<WorkspaceRole> {
    const role = await this.permissions.requireWorkspaceRole(
      actorId,
      workspaceId,
      'admin',
    );

    if (!canManageMembers(role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient workspace role',
      });
    }

    return role;
  }

  private async assertCanAssignOwner(
    actorId: string,
    workspaceId: string,
  ): Promise<void> {
    const role = await this.permissions.requireWorkspaceRole(
      actorId,
      workspaceId,
      'owner',
    );

    if (role !== 'owner') {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only owners can assign the owner role',
      });
    }
  }

  private async findMember(workspaceId: string, userId: string) {
    return this.database.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    });
  }

  private async assertNotLastOwner(
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const owners = await this.database
      .select({ userId: workspaceMembers.userId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.role, 'owner'),
        ),
      );

    if (owners.length <= 1 && owners.some((owner) => owner.userId === userId)) {
      throw new BadRequestException({
        code: 'LAST_OWNER',
        message: 'Cannot remove or demote the last workspace owner',
      });
    }
  }

  private rethrowMemberWriteError(error: unknown): never {
    const code =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code: unknown }).code === 'string'
        ? (error as { code: string }).code
        : undefined;

    if (code === '23505') {
      throw new BadRequestException({
        code: 'MEMBER_ALREADY_EXISTS',
        message: 'User is already a member of this workspace',
      });
    }

    if (code === '23503') {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    throw error;
  }
}
