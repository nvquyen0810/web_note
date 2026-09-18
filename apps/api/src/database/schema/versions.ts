import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { documents } from './documents';
import type { DocumentContent } from './revisions';
import { users } from './users';

export const documentVersions = pgTable(
  'document_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    content: jsonb('content').$type<DocumentContent>().notNull(),
    title: varchar('title', { length: 500 }).notNull(),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    restoredFromVersion: integer('restored_from_version'),
  },
  (table) => [
    unique('document_versions_document_version_unique').on(
      table.documentId,
      table.version,
    ),
    index('document_versions_document_id_idx').on(table.documentId),
  ],
);
