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
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberSchema,
  updateWorkspaceSchema,
  type AddWorkspaceMemberInput,
  type CreateWorkspaceInput,
  type RemoveWorkspaceMemberInput,
  type UpdateWorkspaceInput,
  type UpdateWorkspaceMemberInput,
} from '@web-note/shared';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
@UseGuards(AuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @HttpCode(201)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createWorkspaceSchema))
    body: CreateWorkspaceInput,
  ) {
    return this.workspaces.create(user.id, body);
  }

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.workspaces.listForUser(user.id);
  }

  @Get(':id')
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaces.getById(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema))
    body: UpdateWorkspaceInput,
  ) {
    return this.workspaces.update(user.id, id, body);
  }

  @Get(':id/members')
  listMembers(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workspaces.listMembers(user.id, id);
  }

  @Post(':id/members')
  @HttpCode(201)
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(addWorkspaceMemberSchema))
    body: AddWorkspaceMemberInput,
  ) {
    return this.workspaces.addMember(user.id, id, body);
  }

  @Patch(':id/members')
  updateMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateWorkspaceMemberSchema))
    body: UpdateWorkspaceMemberInput,
  ) {
    return this.workspaces.updateMember(user.id, id, body);
  }

  @Delete(':id/members')
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(removeWorkspaceMemberSchema))
    body: RemoveWorkspaceMemberInput,
  ) {
    return this.workspaces.removeMember(user.id, id, body);
  }
}
