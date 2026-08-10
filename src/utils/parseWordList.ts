export interface ParsedWordPair {
  word: string;
  meaning: string;
}

export interface ParseWordListResult {
  items: ParsedWordPair[];
  errors: string[];
}

const KOREAN_MEANING_START = /(?:~[\uAC00-\uD7A3\u3131-\u318E]|[\uAC00-\uD7A3\u3131-\u318E])/;

/** 줄 안의 탭·연속 공백을 정리한다. */
function normalizeLine(text: string): string {
  return text.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 한글(또는 ~+한글)이 처음 나오는 지점을 기준으로 단어(구)와 뜻을 나눈다.
 * make fun of ~을 놀리다 → 단어: make fun of / 뜻: ~을 놀리다
 */
function splitAtKoreanMeaning(line: string): { word: string; meaning: string } | null {
  const match = line.match(KOREAN_MEANING_START);
  if (!match || match.index === undefined || match.index === 0) return null;

  const word = line.slice(0, match.index).trim();
  const meaning = line.slice(match.index).trim();
  return word && meaning ? { word, meaning } : null;
}

/** 영어 단어(구) + 나머지 뜻 패턴 (한글이 없을 때 폴백) */
function splitEnglishPhrase(line: string): { word: string; meaning: string } | null {
  const match = line.match(/^([a-zA-Z][a-zA-Z\-']*(?:\s+[a-zA-Z][a-zA-Z\-']*)*)\s+(.+)$/);
  if (!match) return null;
  return { word: match[1].trim(), meaning: match[2].trim() };
}

function parseWordMeaningLine(raw: string): { word: string; meaning: string } | null {
  const line = normalizeLine(raw);
  if (!line) return null;

  return splitAtKoreanMeaning(line) ?? splitEnglishPhrase(line);
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
