import {
  bigint,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { documents } from './documents';
import { users } from './users';

export const files = pgTable(
  'files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    storageKey: varchar('storage_key', { length: 1024 }).notNull().unique(),
    mime: varchar('mime', { length: 127 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    uploadedBy: uuid('uploaded_by')
      .notNull()
      .references(() => users.id),
    documentId: uuid('document_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('files_document_id_idx').on(table.documentId)],
);
