import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { externalLinkProps } from '../../lib/format.js';

/**
 * Wraps a react-markdown component handler so the markdown-only `node` prop
 * is never forwarded to a DOM element.
 */
function withoutNode(render) {
  return function NodeStrippedComponent(props) {
    const rest = { ...props };
    delete rest.node;
    return render(rest);
  };
}

const COMPONENTS = {
  a: withoutNode((props) => <a {...props} {...externalLinkProps} />),
  table: withoutNode((props) => (
    <div className="overflow-x-auto">
      <table {...props} />
    </div>
  )),
};

/**
 * Assistant answers are rendered as GitHub-flavoured markdown, including
 * tables and fenced code blocks that work in both themes.
 */
function MarkdownContent({ content, streaming = false }) {
  return (
    <div className={streaming ? 'markdown is-streaming' : 'markdown'}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={COMPONENTS}
      >
        {content || ''}
      </ReactMarkdown>
    </div>
  );
}

export default memo(MarkdownContent);
