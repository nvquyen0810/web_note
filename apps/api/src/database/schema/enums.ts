import {
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from '@web-note/shared';
import { pgEnum } from 'drizzle-orm/pg-core';

const workspaceRoleValues = WORKSPACE_ROLES satisfies readonly WorkspaceRole[];

export const workspaceRoleEnum = pgEnum(
  'workspace_role',
  workspaceRoleValues,
);

export const documentStatusEnum = pgEnum('document_status', [
  'draft',
  'published',
]);
