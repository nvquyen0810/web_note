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

@Injectable()
export class AuditService {
  constructor(@Inject(DATABASE) private readonly database: Database) {}

  async record(entry: AuditRecordInput): Promise<void> {
    await this.database.insert(auditLogs).values(entry);
  }
}
