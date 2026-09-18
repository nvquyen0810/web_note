import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutosave } from './use-autosave';

describe('useAutosave', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces save calls', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { rerender, result } = renderHook(
      ({ content }: { content: string }) =>
        useAutosave(content, save, { delayMs: 1500 }),
      { initialProps: { content: 'a' } },
    );

    expect(save).not.toHaveBeenCalled();

    rerender({ content: 'ab' });
    rerender({ content: 'abc' });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1499);
    });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toBe('pending');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('abc');
    expect(result.current.status).toBe('saved');
  });
});
