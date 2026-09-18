import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  createDocumentSchema,
  moveDocumentSchema,
  putDocumentMembersSchema,
  updateDocumentContentSchema,
  updateDocumentSchema,
  type CreateDocumentInput,
  type MoveDocumentInput,
  type PutDocumentMembersInput,
  type UpdateDocumentContentInput,
  type UpdateDocumentInput,
} from '@web-note/shared';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { DocumentsService } from './documents.service';

@Controller()
@UseGuards(AuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('workspaces/:workspaceId/documents')
  list(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.documents.list(user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/documents')
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(createDocumentSchema))
    body: CreateDocumentInput,
  ) {
    return this.documents.create(user.id, workspaceId, body);
  }

  @Get('documents/:id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.get(user.id, id);
  }

  @Patch('documents/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDocumentSchema))
    body: UpdateDocumentInput,
  ) {
    return this.documents.update(user.id, id, body);
  }

  @Delete('documents/:id')
  softDelete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.softDelete(user.id, id);
  }

  @Post('documents/:id/duplicate')
  @HttpCode(201)
  duplicate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.duplicate(user.id, id);
  }

  @Post('documents/:id/move')
  move(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moveDocumentSchema)) body: MoveDocumentInput,
  ) {
    return this.documents.move(user.id, id, body);
  }

  @Patch('documents/:id/content')
  updateContent(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDocumentContentSchema))
    body: UpdateDocumentContentInput,
  ) {
    return this.documents.updateContent(user.id, id, body);
  }

  @Post('documents/:id/publish')
  publish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.publish(user.id, id);
  }

  @Get('documents/:id/versions')
  listVersions(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.listVersions(user.id, id);
  }

  @Get('documents/:id/versions/:version')
  getVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.documents.getVersion(user.id, id, version);
  }

  @Post('documents/:id/versions/:version/restore')
  restoreVersion(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.documents.restoreVersion(user.id, id, version);
  }

  @Get('documents/:id/members')
  listMembers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.documents.listMembers(user.id, id);
  }

  @Put('documents/:id/members')
  putMembers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(putDocumentMembersSchema))
    body: PutDocumentMembersInput,
  ) {
    return this.documents.putMembers(user.id, id, body);
  }
}
