export function parseSentenceList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function sentencesToText(sentences: { text: string }[]): string {
  return sentences.map((s) => s.text).join('\n');
}
