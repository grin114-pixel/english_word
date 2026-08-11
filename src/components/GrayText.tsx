import type { ReactNode } from 'react';
import { hasGrayMarkers, stripGrayMarkers } from '../utils/grayText';

interface GrayTextProps {
  text: string;
}

export function GrayText({ text }: GrayTextProps) {
  if (!hasGrayMarkers(text)) {
    return <>{text}</>;
  }

  const nodes: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const openIndex = remaining.toLowerCase().indexOf('<g>');
    if (openIndex === -1) {
      nodes.push(<span key={key++}>{remaining}</span>);
      break;
    }

    if (openIndex > 0) {
      nodes.push(<span key={key++}>{remaining.slice(0, openIndex)}</span>);
    }

    const closeIndex = remaining.toLowerCase().indexOf('</g>', openIndex);
    if (closeIndex === -1) {
      nodes.push(<span key={key++}>{remaining.slice(openIndex)}</span>);
      break;
    }

    const inner = remaining.slice(openIndex + 3, closeIndex);
    nodes.push(
      <span key={key++} className="text-highlight-gray">
        {inner}
      </span>,
    );
    remaining = remaining.slice(closeIndex + 4);
  }

  return <>{nodes}</>;
}

export function plainTextForSpeech(text: string): string {
  return stripGrayMarkers(text);
}
