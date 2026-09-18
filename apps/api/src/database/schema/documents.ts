import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { documentStatusEnum } from './enums';
import { folders } from './folders';
import { users } from './users';
import { workspaces } from './workspaces';

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    folderId: uuid('folder_id').references(() => folders.id, {
      onDelete: 'set null',
    }),
    title: varchar('title', { length: 500 }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    status: documentStatusEnum('status').notNull().default('draft'),
    isPrivate: boolean('is_private').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('documents_workspace_id_idx').on(table.workspaceId),
    index('documents_folder_id_idx').on(table.folderId),
  ],
);
