'use client';

import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function CodeBlockView({ node }: NodeViewProps) {
  const [copied, setCopied] = useState(false);
  const language = String(node.attrs.language ?? '');

  async function copy() {
    const text = node.textContent;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors (insecure context, permissions)
    }
  }

  return (
    <NodeViewWrapper className="code-block-wrap group relative my-3">
      <div
        className="absolute right-2 top-2 z-10 flex items-center gap-2"
        contentEditable={false}
      >
        {language ? (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
            {language}
          </span>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-7 gap-1 bg-white/10 px-2 text-xs text-slate-100 hover:bg-white/20"
          onClick={() => void copy()}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md bg-slate-900 p-4 pt-10 text-slate-50">
        <code className={language ? `language-${language}` : undefined}>
          <NodeViewContent />
        </code>
      </pre>
    </NodeViewWrapper>
  );
}
