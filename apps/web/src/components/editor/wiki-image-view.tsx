'use client';

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

function resolveSrc(attrs: Record<string, unknown>): string | null {
  const fileId = typeof attrs.fileId === 'string' ? attrs.fileId : null;
  if (fileId) {
    return `/api/files/${fileId}`;
  }

  const src = typeof attrs.src === 'string' ? attrs.src : null;
  if (!src) return null;

  // Migrate old MinIO / API absolute URLs that embed a file UUID.
  const fileMatch = src.match(
    /\/(?:api\/)?files\/([0-9a-f-]{36})(?:\/content)?/i,
  );
  if (fileMatch) {
    return `/api/files/${fileMatch[1]}`;
  }

  // Expired MinIO presign — cannot recover without file id.
  if (/localhost:9000|X-Amz-Algorithm/i.test(src)) {
    return null;
  }

  return src;
}

export function WikiImageView({ node, selected }: NodeViewProps) {
  const src = resolveSrc(node.attrs as Record<string, unknown>);
  const alt = String(node.attrs.alt ?? '');

  if (!src) {
    return (
      <NodeViewWrapper
        className={`my-3 rounded-md border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground ${selected ? 'ring-2 ring-ring' : ''}`}
      >
        Image unavailable — paste or insert again
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      className={`my-3 ${selected ? 'ring-2 ring-ring rounded-md' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[40rem] max-w-full rounded-md h-auto"
        draggable={false}
      />
    </NodeViewWrapper>
  );
}
