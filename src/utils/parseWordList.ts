import { splitLinePreservingGray } from './grayText';

export interface ParsedWordPair {
  word: string;
  meaning: string;
}

export interface ParseWordListResult {
  items: ParsedWordPair[];
  errors: string[];
}

/** 줄 안의 탭·연속 공백을 정리한다. */
function normalizeLine(text: string): string {
  return text.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseWordMeaningLine(raw: string): { word: string; meaning: string } | null {
  const line = normalizeLine(raw);
  if (!line) return null;

  return splitLinePreservingGray(line);
}

function isValidWordLine(raw: string): boolean {
  return parseWordMeaningLine(raw) !== null;
}

/** 편집창 빈 줄(페이지 구분) 뒤 단어 인덱스 목록 (0-based) */
export function getPageBreakIndices(draftText: string): number[] {
  if (!draftText.trim()) return [];

  const breaks: number[] = [];
  let wordIndex = -1;
  let inEmptyRun = false;

  for (const line of draftText.split(/\r?\n/)) {
    if (!line.trim()) {
      if (wordIndex >= 0 && !inEmptyRun) breaks.push(wordIndex);
      inEmptyRun = true;
      continue;
    }

    if (!isValidWordLine(line)) continue;

    inEmptyRun = false;
    wordIndex += 1;
  }

  return breaks;
}

/** DB에 잘못 저장된 단어/뜻을 한 줄로 합쳐 다시 파싱한다. */
export function normalizeStoredWordPair(word: string, meaning: string): ParsedWordPair {
  const reparsed = parseWordMeaningLine(`${word} ${meaning}`.trim());
  return reparsed ?? { word: word.trim(), meaning: meaning.trim() };
}

/** 여러 줄 텍스트를 단어/뜻 쌍으로 분리한다. */
export function parseWordList(text: string): ParseWordListResult {
  return parseWordEntries(text);
}

export function parseWordEntries(wordText: string): ParseWordListResult {
  const items: ParsedWordPair[] = [];
  const errors: string[] = [];

  wordText.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const lineNo = index + 1;
    const parsed = parseWordMeaningLine(trimmed);

    if (!parsed) {
      errors.push(`${lineNo}번째 줄을 읽지 못했어요: ${trimmed}`);
      return;
    }

    items.push(parsed);
  });

  return { items, errors };
}
