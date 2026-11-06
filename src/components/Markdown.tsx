import { isValidElement, memo } from 'react';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { CopyButton } from './CopyButton';

function nodeText(n: ReactNode): string {
  if (n == null || typeof n === 'boolean') return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join('');
  if (isValidElement(n)) return nodeText((n.props as { children?: ReactNode }).children);
  return '';
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const props = isValidElement(children) ? (children.props as { className?: string }) : undefined;
  const lang = /language-([\w+#-]+)/.exec(props?.className ?? '')?.[1] ?? 'text';
  return (
    <div className="codeblock">
      <div className="codeblock-bar">
        <span>{lang}</span>
        <CopyButton
          getText={() => nodeText(children).replace(/\n$/, '')}
          label="Copy code"
          showText
          className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:text-ink"
        />
      </div>
      <pre>{children}</pre>
    </div>
  );
}

// Raw HTML is never rendered. Links open in a new tab; images are not loaded
// automatically (a remote image URL in model output could leak data), they
// become plain links instead.
const components: Components = {
  pre: CodeBlock,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  ),
  img: ({ src, alt }) =>
    typeof src === 'string' ? (
      <a href={src} target="_blank" rel="noopener noreferrer nofollow">
        [image{alt ? `: ${alt}` : ''}]
      </a>
    ) : null,
  table: ({ children }) => (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  ),
};

function Markdown({ text }: { text: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: false, ignoreMissing: true }]]}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
