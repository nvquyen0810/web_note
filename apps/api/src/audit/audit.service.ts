import { Inject, Injectable } from '@nestjs/common';
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
}
