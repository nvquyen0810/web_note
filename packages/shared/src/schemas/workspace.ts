import { z } from 'zod';
import { WORKSPACE_ROLES } from '../roles';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
});

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(WORKSPACE_ROLES),
});

export const updateWorkspaceMemberSchema = z.object({
  role: z.enum(WORKSPACE_ROLES),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
export type UpdateWorkspaceMemberInput = z.infer<
  typeof updateWorkspaceMemberSchema
>;
