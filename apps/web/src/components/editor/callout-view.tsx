'use client';

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';

const STYLES: Record<string, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-950',
  warning: 'border-amber-300 bg-amber-50 text-amber-950',
  tip: 'border-emerald-300 bg-emerald-50 text-emerald-950',
};

export function CalloutView({ node }: NodeViewProps) {
  const type = String(node.attrs.type ?? 'info');

  return (
    <NodeViewWrapper
      as="aside"
      className={cn(
        'my-3 rounded-md border-l-4 px-4 py-3',
        STYLES[type] ?? STYLES.info,
      )}
      data-type={type}
    >
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-70">
        {type}
      </p>
      <NodeViewContent className="callout-content" />
    </NodeViewWrapper>
  );
}
