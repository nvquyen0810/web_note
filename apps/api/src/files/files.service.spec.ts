import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PresignFileInput } from '@web-note/shared';
import type { AuditService } from '../audit/audit.service';
import type { Database } from '../database/database.module';
import type { PermissionsService } from '../permissions/permissions.service';
import { FilesService } from './files.service';
import type { S3Service } from './s3.service';

describe('FilesService', () => {
  const userId = '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491';
  const workspaceId = '24490ec4-79fa-4d22-bdc0-a55c62a96567';
  let service: FilesService;
  let createPresignedPutUrl: jest.MockedFunction<S3Service['createPresignedPutUrl']>;

  beforeEach(() => {
    createPresignedPutUrl = jest
      .fn<S3Service['createPresignedPutUrl']>()
      .mockResolvedValue('https://minio.test/upload');

    service = new FilesService(
      {
        insert: jest.fn().mockReturnValue({
          values: jest.fn().mockReturnValue({
            returning: jest.fn(async () => [
              {
                id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
                storageKey: 'key',
              },
            ]),
          }),
        }),
        query: { files: { findFirst: jest.fn() } },
      } as unknown as Database,
      {
        createPresignedPutUrl,
        createPresignedGetUrl: jest.fn(),
        getObjectStream: jest.fn(),
        headObject: jest.fn(),
      } as unknown as S3Service,
      {
        requireWorkspaceRole: jest
          .fn<PermissionsService['requireWorkspaceRole']>()
          .mockResolvedValue('editor'),
        requireDocumentAccess: jest.fn(),
        getEffectiveDocumentAccess: jest.fn(),
      } as unknown as PermissionsService,
      { record: jest.fn() } as unknown as AuditService,
    );
  });

  it('rejects application/pdf on presign', async () => {
    const input: PresignFileInput = {
      filename: 'notes.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      workspaceId,
    };

    await expect(service.presign(userId, input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.presign(userId, input)).rejects.toMatchObject({
      response: {
        code: 'FILE_TYPE_NOT_ALLOWED',
      },
    });
    expect(createPresignedPutUrl).not.toHaveBeenCalled();
  });
});
