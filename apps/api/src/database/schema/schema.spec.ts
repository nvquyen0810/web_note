import { getTableName } from 'drizzle-orm';
import {
  auditLogs,
  documentMembers,
  documentRevisions,
  documentStatusEnum,
  documentVersions,
  documents,
  files,
  folders,
  users,
  workspaceMembers,
  workspaceRoleEnum,
  workspaces,
} from './index';

describe('database schema', () => {
  it('exports every MVP table', () => {
    expect(
      [
        users,
        workspaces,
        workspaceMembers,
        folders,
        documents,
        documentRevisions,
        documentVersions,
        documentMembers,
        files,
        auditLogs,
      ].map(getTableName),
    ).toEqual([
      'users',
      'workspaces',
      'workspace_members',
      'folders',
      'documents',
      'document_revisions',
      'document_versions',
      'document_members',
      'files',
      'audit_logs',
    ]);
  });

  it('uses the shared workspace roles and supported document statuses', () => {
    expect(workspaceRoleEnum.enumValues).toEqual([
      'owner',
      'admin',
      'editor',
      'viewer',
    ]);
    expect(documentStatusEnum.enumValues).toEqual(['draft', 'published']);
  });
});
