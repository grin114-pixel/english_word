export type SentencePart =
  | { type: 'text'; content: string }
  | { type: 'paren'; content: string; inner: string };

/** 괄호 `( )` 구간을 분리한다. 괄호가 없으면 전체를 text로 반환한다. */
export function splitSentenceByParentheses(text: string): SentencePart[] {
  const parts: SentencePart[] = [];
  const regex = /\([^)]*\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({
      type: 'paren',
      content: match[0],
      inner: match[0].slice(1, -1),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', content: text });
  }

  return parts;
}
