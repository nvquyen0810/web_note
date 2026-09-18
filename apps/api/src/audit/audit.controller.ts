import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { PermissionsService } from '../permissions/permissions.service';
import { AuditService } from './audit.service';

@Controller('workspaces/:workspaceId/audit-logs')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId', ParseUUIDPipe) workspaceId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    await this.permissions.requireWorkspaceRole(user.id, workspaceId, 'admin');
    return this.audit.listForWorkspace(workspaceId, { limit, offset });
  }
}
