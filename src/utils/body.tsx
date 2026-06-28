import type { ReactNode } from 'react';

/**
 * Renderiza texto com formatação minimalista:
 *   ## Título    → <h2>
 *   - item       → <ul><li> (linhas consecutivas agrupadas)
 *   parágrafo    → <p>
 * Blocos separados por linha em branco.
 */
export function renderBody(text: string): ReactNode {
  const blocks = text.split(/\n{2,}/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('## ')) {
      return <h2 key={i}>{trimmed.slice(3)}</h2>;
    }

    const lines = trimmed.split('\n');
    if (lines.every((l) => l.trimStart().startsWith('- '))) {
      return (
        <ul key={i}>
          {lines.map((l, j) => (
            <li key={j}>{l.trimStart().slice(2)}</li>
          ))}
        </ul>
      );
    }

    return <p key={i}>{trimmed.replace(/\n/g, ' ')}</p>;
  });
}
