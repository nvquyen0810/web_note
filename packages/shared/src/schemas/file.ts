import { z } from 'zod';

export const presignFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(127),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  documentId: z.string().uuid().optional(),
  workspaceId: z.string().uuid(),
});

export const completeFileSchema = z.object({
  fileId: z.string().uuid(),
});

export type PresignFileInput = z.infer<typeof presignFileSchema>;
export type CompleteFileInput = z.infer<typeof completeFileSchema>;
