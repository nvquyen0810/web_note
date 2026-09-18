import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { workspaces } from './workspaces';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorId: uuid('actor_id')
      .notNull()
      .references(() => users.id),
    action: varchar('action', { length: 255 }).notNull(),
    resourceType: varchar('resource_type', { length: 100 }).notNull(),
    resourceId: uuid('resource_id').notNull(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_logs_workspace_created_at_idx').on(
      table.workspaceId,
      table.createdAt,
    ),
  ],
);
