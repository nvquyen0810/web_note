import type { Database } from '../database/database.module';
import { auditLogs } from '../database/schema';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  it('inserts an audit log record', async () => {
    const values = jest.fn().mockResolvedValue(undefined);
    const insert = jest.fn().mockReturnValue({ values });
    const service = new AuditService({ insert } as unknown as Database);
    const entry = {
      actorId: 'actor-id',
      action: 'document.publish',
      resourceType: 'document',
      resourceId: 'document-id',
      workspaceId: 'workspace-id',
      metadata: { version: 1 },
    };

    await service.record(entry);

    expect(insert).toHaveBeenCalledWith(auditLogs);
    expect(values).toHaveBeenCalledWith(entry);
  });
});
