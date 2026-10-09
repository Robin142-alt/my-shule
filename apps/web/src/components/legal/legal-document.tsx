import type { ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith('**') ? <strong key={index}>{part.slice(2,-2)}</strong> : part);
}
// Deliberately render text as React nodes: approved Markdown never becomes raw HTML.
export function LegalDocumentText({ content }: { content: string }) {
  const blocks = content.trim().split(/\r?\n\s*\r?\n/);
  return <article className="legal-document">{blocks.map((block, index) => {
    if (block.startsWith('# ')) return <h2 key={index}>{block.slice(2)}</h2>;
    if (block.startsWith('### ')) return <h3 key={index}>{block.slice(4)}</h3>;
    if (block === '---') return <hr key={index} />;
    const lines = block.split(/\r?\n/);
    if (lines.every((line) => line.startsWith('- '))) return <ul key={index}>{lines.map((line,i) => <li key={i}>{inline(line.slice(2))}</li>)}</ul>;
    if (lines.every((line) => /^\d+\. /.test(line))) return <ol key={index}>{lines.map((line,i) => <li key={i}>{inline(line.replace(/^\d+\. /,''))}</li>)}</ol>;
    return <p key={index}>{lines.map((line,i) => <span key={i}>{i > 0 && <br />}{inline(line.trim())}</span>)}</p>;
  })}</article>;
}
