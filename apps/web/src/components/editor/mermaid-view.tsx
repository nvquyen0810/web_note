'use client';

import { useEffect, useId, useState } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

export function MermaidView({ node, updateAttributes, selected }: NodeViewProps) {
  const source = String(node.attrs.source ?? '');
  const reactId = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'neutral',
        });
        const { svg: rendered } = await mermaid.render(
          `mermaid-${reactId}`,
          source || 'flowchart TD\n  A-->B',
        );
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Mermaid render failed');
          setSvg('');
        }
      }
    }

    void renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [source, reactId]);

  return (
    <NodeViewWrapper
      className={`my-4 rounded-md border bg-card p-3 ${selected ? 'ring-2 ring-ring' : ''}`}
      data-mermaid=""
    >
      {editing ? (
        <textarea
          className="mb-3 h-32 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
          value={source}
          onChange={(event) =>
            updateAttributes({ source: event.target.value })
          }
          onBlur={() => setEditing(false)}
          autoFocus
        />
      ) : (
        <button
          type="button"
          className="mb-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setEditing(true)}
        >
          Edit Mermaid source
        </button>
      )}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div
          className="overflow-x-auto [&_svg]:mx-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </NodeViewWrapper>
  );
}
