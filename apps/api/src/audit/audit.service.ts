import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, sql } from 'drizzle-orm';
import {
  DATABASE,
  type Database,
} from '../database/database.module';
import { auditLogs } from '../database/schema';

export type AuditRecordInput = {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  workspaceId: string;
  metadata?: Record<string, unknown>;
};

type AuditExecutor = Pick<Database, 'insert'>;

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async record(
    entry: AuditRecordInput,
    executor: AuditExecutor = this.database,
  ): Promise<void> {
    await executor.insert(auditLogs).values(entry);
  }

  async listForWorkspace(
    workspaceId: string,
    options: { limit?: number; offset?: number } = {},
  ) {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
    const offset = Math.max(options.offset ?? 0, 0);

    const rows = await this.database
      .select({
        id: auditLogs.id,
        actorId: auditLogs.actorId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        workspaceId: auditLogs.workspaceId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(eq(auditLogs.workspaceId, workspaceId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const [countRow] = await this.database
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(eq(auditLogs.workspaceId, workspaceId));

    return {
      items: rows,
      total: countRow?.count ?? 0,
      limit,
      offset,
    };
  }
}
