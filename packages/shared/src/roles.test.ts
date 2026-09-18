import { describe, expect, it } from 'vitest';
import { roleAtLeast, canEditContent, canManageMembers } from './roles';

describe('roleAtLeast', () => {
  it('owner satisfies viewer', () => {
    expect(roleAtLeast('owner', 'viewer')).toBe(true);
  });
  it('viewer does not satisfy editor', () => {
    expect(roleAtLeast('viewer', 'editor')).toBe(false);
  });
});

describe('capabilities', () => {
  it('editor can edit, viewer cannot', () => {
    expect(canEditContent('editor')).toBe(true);
    expect(canEditContent('viewer')).toBe(false);
  });
  it('admin can manage members, editor cannot', () => {
    expect(canManageMembers('admin')).toBe(true);
    expect(canManageMembers('editor')).toBe(false);
  });
});
