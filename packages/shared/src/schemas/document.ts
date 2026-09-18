import { z } from 'zod';

export const documentStatusSchema = z.enum(['draft', 'published']);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  folderId: z.string().uuid().nullable().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const moveDocumentSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export const updateDocumentContentSchema = z.object({
  content: z.record(z.string(), z.unknown()),
  title: z.string().min(1).max(500).optional(),
});

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type MoveDocumentInput = z.infer<typeof moveDocumentSchema>;
export type UpdateDocumentContentInput = z.infer<typeof updateDocumentContentSchema>;