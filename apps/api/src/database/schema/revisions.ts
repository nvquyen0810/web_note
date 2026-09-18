import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { documents } from './documents';
import { users } from './users';

export type DocumentContent = Record<string, unknown>;

export const documentRevisions = pgTable('document_revisions', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<DocumentContent>().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedBy: uuid('updated_by')
    .notNull()
    .references(() => users.id),
});
