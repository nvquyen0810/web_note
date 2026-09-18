import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AuditService } from '../audit/audit.service';
import type { Database } from '../database/database.module';
import type { PermissionsService } from '../permissions/permissions.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService member safeguards', () => {
  const workspaceId = '24490ec4-79fa-4d22-bdc0-a55c62a96567';
  const actorId = '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491';
  const targetUserId = '8b3c0f2e-1a2b-4c5d-9e8f-0123456789ab';

  let requireWorkspaceRole: jest.MockedFunction<
    PermissionsService['requireWorkspaceRole']
  >;
  let service: WorkspacesService;
  let selectResult: Array<{ userId: string }>;
  let findFirstResult: { role: string } | undefined;

  beforeEach(() => {
    requireWorkspaceRole = jest.fn();
    selectResult = [{ userId: actorId }];
    findFirstResult = { role: 'owner' };

    const database = {
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(async () => selectResult),
        })),
      })),
      query: {
        workspaceMembers: {
          findFirst: jest.fn(async () => findFirstResult),
        },
      },
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(),
    };

    service = new WorkspacesService(
      database as unknown as Database,
      { record: jest.fn() } as unknown as AuditService,
      {
        requireWorkspaceRole,
      } as unknown as PermissionsService,
    );
  });

  it('rejects member mutations when the actor cannot manage members', async () => {
    requireWorkspaceRole.mockRejectedValue(
      new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient workspace role',
      }),
    );

    await expect(
      service.addMember(actorId, workspaceId, {
        userId: targetUserId,
        role: 'editor',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects demoting the last owner', async () => {
    requireWorkspaceRole.mockResolvedValue('owner');
    findFirstResult = { role: 'owner' };
    selectResult = [{ userId: actorId }];

    await expect(
      service.updateMember(actorId, workspaceId, {
        userId: actorId,
        role: 'admin',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'LAST_OWNER',
      },
    });
    await expect(
      service.updateMember(actorId, workspaceId, {
        userId: actorId,
        role: 'admin',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects removing the last owner', async () => {
    requireWorkspaceRole.mockResolvedValue('owner');
    findFirstResult = { role: 'owner' };
    selectResult = [{ userId: actorId }];

    await expect(
      service.removeMember(actorId, workspaceId, { userId: actorId }),
    ).rejects.toMatchObject({
      response: {
        code: 'LAST_OWNER',
      },
    });
  });

  it('rejects assigning owner when the actor is only an admin', async () => {
    requireWorkspaceRole
      .mockResolvedValueOnce('admin')
      .mockResolvedValueOnce('admin');

    const insert = jest.fn();
    (
      service as unknown as { database: { insert: typeof insert } }
    ).database.insert = insert;

    await expect(
      service.addMember(actorId, workspaceId, {
        userId: targetUserId,
        role: 'owner',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'FORBIDDEN',
        message: 'Only owners can assign the owner role',
      },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it('maps duplicate membership inserts to MEMBER_ALREADY_EXISTS', async () => {
    requireWorkspaceRole.mockResolvedValue('owner');
    const returning = jest
      .fn<() => Promise<never>>()
      .mockRejectedValue({ code: '23505' } as never);
    const values = jest.fn().mockReturnValue({ returning });
    const insert = jest.fn().mockReturnValue({ values });
    (
      service as unknown as { database: { insert: typeof insert } }
    ).database.insert = insert;

    await expect(
      service.addMember(actorId, workspaceId, {
        userId: targetUserId,
        role: 'editor',
      }),
    ).rejects.toMatchObject({
      response: {
        code: 'MEMBER_ALREADY_EXISTS',
      },
    });
  });
});
