import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  createFolderSchema,
  moveFolderSchema,
  updateFolderSchema,
  type CreateFolderInput,
  type MoveFolderInput,
  type UpdateFolderInput,
} from '@web-note/shared';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { FoldersService } from './folders.service';

@Controller()
@UseGuards(AuthGuard)
export class FoldersController {
  constructor(private readonly folders: FoldersService) {}

  @Get('workspaces/:workspaceId/folders')
  list(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    return this.folders.list(user.id, workspaceId);
  }

  @Post('workspaces/:workspaceId/folders')
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Body(new ZodValidationPipe(createFolderSchema)) body: CreateFolderInput,
  ) {
    return this.folders.create(user.id, workspaceId, body);
  }

  @Patch('folders/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateFolderSchema)) body: UpdateFolderInput,
  ) {
    return this.folders.update(user.id, id, body);
  }

  @Post('folders/:id/move')
  move(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(moveFolderSchema)) body: MoveFolderInput,
  ) {
    return this.folders.move(user.id, id, body);
  }

  @Delete('folders/:id')
  softDelete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.folders.softDelete(user.id, id);
  }
}
