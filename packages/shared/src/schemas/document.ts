import { z } from 'zod';
import { WORKSPACE_ROLES } from '../roles';

export const documentStatusSchema = z.enum(['draft', 'published']);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(500),
  folderId: z.string().uuid().nullable().optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  folderId: z.string().uuid().nullable().optional(),
  isPrivate: z.boolean().optional(),
});

export const moveDocumentSchema = z.object({
  folderId: z.string().uuid().nullable(),
});

export const updateDocumentContentSchema = z.object({
  content: z.record(z.string(), z.unknown()),
  title: z.string().min(1).max(500).optional(),
});

export const putDocumentMembersSchema = z.object({
  members: z.array(
    z.object({
      userId: z.string().uuid(),
      role: z.enum(WORKSPACE_ROLES),
    }),
  ),
});

export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type MoveDocumentInput = z.infer<typeof moveDocumentSchema>;
export type UpdateDocumentContentInput = z.infer<
  typeof updateDocumentContentSchema
>;
export type PutDocumentMembersInput = z.infer<typeof putDocumentMembersSchema>;
