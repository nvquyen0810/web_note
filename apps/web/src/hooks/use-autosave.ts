import { useEffect, useRef, useState } from 'react';

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

type UseAutosaveOptions = {
  enabled?: boolean;
  delayMs?: number;
};

export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  options: UseAutosaveOptions = {},
): { status: AutosaveStatus } {
  const { enabled = true, delayMs = 1500 } = options;
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const saveRef = useRef(save);
  const skipFirst = useRef(true);

  saveRef.current = save;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    setStatus('pending');
    const timer = window.setTimeout(() => {
      setStatus('saving');
      void saveRef
        .current(value)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [value, delayMs, enabled]);

  return { status };
}
