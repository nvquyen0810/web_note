import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import type {
  CompleteFileInput,
  PresignFileInput,
} from '@web-note/shared';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { AuditService } from '../audit/audit.service';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import { files } from '../database/schema';
import { PermissionsService } from '../permissions/permissions.service';
import { S3Service } from './s3.service';

const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);
const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class FilesService {
  constructor(
    @Inject(DATABASE) private readonly database: Database,
    private readonly s3: S3Service,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async presign(userId: string, input: PresignFileInput) {
    await this.permissions.requireWorkspaceRole(
      userId,
      input.workspaceId,
      'editor',
    );

    if (!ALLOWED.has(input.mimeType)) {
      throw new BadRequestException({
        code: 'FILE_TYPE_NOT_ALLOWED',
        message: 'Only image uploads are allowed',
      });
    }

    if (input.sizeBytes > MAX_BYTES) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: 'File exceeds the 10MB limit',
      });
    }

    if (input.documentId) {
      await this.permissions.requireDocumentAccess(
        userId,
        input.documentId,
        'edit',
      );
    }

    const safeName = input.filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 180);
    const storageKey = input.documentId
      ? `workspaces/${input.workspaceId}/documents/${input.documentId}/${randomUUID()}-${safeName}`
      : `workspaces/${input.workspaceId}/uploads/${randomUUID()}-${safeName}`;

    const [created] = await this.database
      .insert(files)
      .values({
        storageKey,
        mime: input.mimeType,
        sizeBytes: input.sizeBytes,
        uploadedBy: userId,
        documentId: input.documentId ?? null,
      })
      .returning();

    const uploadUrl = await this.s3.createPresignedPutUrl(
      storageKey,
      input.mimeType,
    );

    await this.audit.record({
      actorId: userId,
      action: 'file.presign',
      resourceType: 'file',
      resourceId: created.id,
      workspaceId: input.workspaceId,
      metadata: {
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        documentId: input.documentId ?? null,
      },
    });

    return {
      fileId: created.id,
      uploadUrl,
      storageKey,
    };
  }

  async complete(userId: string, input: CompleteFileInput) {
    const file = await this.database.query.files.findFirst({
      where: eq(files.id, input.fileId),
    });

    if (!file) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    if (file.uploadedBy !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Only the uploader can complete this file',
      });
    }

    const head = await this.s3.headObject(file.storageKey);
    const contentType = head.contentType?.split(';')[0]?.trim();
    const contentLength = head.contentLength;

    if (!contentType || contentType !== file.mime) {
      throw new BadRequestException({
        code: 'FILE_MIME_MISMATCH',
        message: 'Uploaded object mime type does not match the presign request',
      });
    }

    if (
      contentLength === undefined ||
      contentLength !== file.sizeBytes ||
      contentLength > MAX_BYTES
    ) {
      throw new BadRequestException({
        code: 'FILE_SIZE_MISMATCH',
        message: 'Uploaded object size does not match the presign request',
      });
    }

    return {
      id: file.id,
      // Stable path — never embed short-lived MinIO URLs in document JSON.
      url: `/files/${file.id}/content`,
    };
  }

  async getDownloadUrl(userId: string, fileId: string) {
    const file = await this.requireReadableFile(userId, fileId);
    const url = await this.s3.createPresignedGetUrl(file.storageKey);
    return { id: file.id, url };
  }

  async getContentStream(userId: string, fileId: string) {
    const file = await this.requireReadableFile(userId, fileId);
    const object = await this.s3.getObjectStream(file.storageKey);
    return new StreamableFile(object.body, {
      type: object.contentType ?? file.mime,
      length: object.contentLength ?? file.sizeBytes,
      disposition: 'inline',
    });
  }

  private async requireReadableFile(userId: string, fileId: string) {
    const file = await this.database.query.files.findFirst({
      where: eq(files.id, fileId),
    });

    if (!file) {
      throw new NotFoundException({
        code: 'FILE_NOT_FOUND',
        message: 'File not found',
      });
    }

    if (file.documentId) {
      await this.permissions.requireDocumentAccess(
        userId,
        file.documentId,
        'read',
      );
    } else if (file.uploadedBy !== userId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Insufficient permission to download this file',
      });
    }

    return file;
  }
}
