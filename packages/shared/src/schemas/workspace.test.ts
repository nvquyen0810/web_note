import { describe, expect, it } from 'vitest';
import {
  addWorkspaceMemberSchema,
  updateWorkspaceMemberSchema,
} from './workspace';

describe('workspace member schemas', () => {
  it('accepts a user id and workspace role when adding a member', () => {
    expect(
      addWorkspaceMemberSchema.parse({
        userId: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
        role: 'editor',
      }),
    ).toEqual({
      userId: '3a6521d7-c00f-4b0e-8435-fdfcb2ca7491',
      role: 'editor',
    });
  });

  it('rejects an invalid role when updating a member', () => {
    expect(() =>
      updateWorkspaceMemberSchema.parse({ role: 'super-admin' }),
    ).toThrow();
  });
});
