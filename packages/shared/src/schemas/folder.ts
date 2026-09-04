import { z } from 'zod';

export const createFolderSchema = z.object({
  name: z.string().min(1).max(200),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateFolderSchema = z.object({
  name: z.string().min(1).max(200).optional(),
});

export const moveFolderSchema = z.object({
  parentId: z.string().uuid().nullable(),
});

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type MoveFolderInput = z.infer<typeof moveFolderSchema>;
