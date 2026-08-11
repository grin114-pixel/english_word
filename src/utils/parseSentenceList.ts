import type { Sentence } from '../types';

export interface ParsedSentence {
  text: string;
  meaning: string;
}

function normalizeLine(text: string): string {
  return text.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
}

function findKoreanStart(line: string): number | null {
  const match = line.match(/(?:~[\uAC00-\uD7A3\u3131-\u318E]|[\uAC00-\uD7A3\u3131-\u318E])/);
  if (!match || match.index === undefined) return null;
  return match.index;
}

/** 한글만 있는 줄(해석 줄)인지 확인한다. */
export function isKoreanOnlyLine(raw: string): boolean {
  const line = normalizeLine(raw);
  if (!line) return false;

  const koreanStart = findKoreanStart(line);
  if (koreanStart === null) return false;

  const beforeKorean = line.slice(0, koreanStart).trim();
  return beforeKorean === '' || beforeKorean === '~';
}

function splitSentenceLine(raw: string): ParsedSentence | null {
  const line = normalizeLine(raw);
  if (!line) return null;

  const koreanStart = findKoreanStart(line);
  if (koreanStart !== null && koreanStart > 0) {
    return {
      text: line.slice(0, koreanStart).trim(),
      meaning: line.slice(koreanStart).trim(),
    };
  }

  return { text: line, meaning: '' };
}

export function parseSentenceList(text: string): ParsedSentence[] {
  const items: ParsedSentence[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    if (isKoreanOnlyLine(trimmed)) {
      const last = items.at(-1);
      if (last && last.text && !last.meaning) {
        last.meaning = normalizeLine(trimmed);
        continue;
      }
    }

    const parsed = splitSentenceLine(trimmed);
    if (parsed) items.push(parsed);
  }

  return items;
}

/** 편집창 빈 줄(페이지 구분) 뒤 문장 인덱스 목록 (0-based) */
export function getSentencePageBreakIndices(draftText: string): number[] {
  if (!draftText.trim()) return [];

  const breaks: number[] = [];
  let sentenceIndex = -1;
  let inEmptyRun = false;
  let pendingEnglish = false;

  for (const rawLine of draftText.split(/\r?\n/)) {
    if (!rawLine.trim()) {
      if (sentenceIndex >= 0 && !inEmptyRun && !pendingEnglish) breaks.push(sentenceIndex);
      inEmptyRun = true;
      continue;
    }

    const trimmed = rawLine.trim();
    inEmptyRun = false;

    if (isKoreanOnlyLine(trimmed)) {
      if (pendingEnglish) {
        pendingEnglish = false;
        continue;
      }
      sentenceIndex += 1;
      continue;
    }

    const parsed = splitSentenceLine(trimmed);
    if (!parsed) continue;

    sentenceIndex += 1;
    pendingEnglish = !parsed.meaning;
  }

  return breaks;
}

export function sentencesToText(sentences: { text: string; meaning?: string | null }[]): string {
  return sentences
    .map((s) => {
      const meaning = s.meaning?.trim();
      if (!meaning) return s.text;
      return `${s.text}\n${meaning}`;
    })
    .join('\n\n');
}

/** DB에 영어/해석이 따로 저장된 항목을 한 세트로 합친다. */
export function mergeSplitSentenceRows(sentences: { text: string; meaning?: string | null }[]): {
  text: string;
  meaning: string;
}[] {
  const merged: { text: string; meaning: string }[] = [];

  for (const sentence of sentences) {
    const text = sentence.text.trim();
    const meaning = sentence.meaning?.trim() ?? '';

    if (meaning) {
      merged.push({ text, meaning });
      continue;
    }

    if (isKoreanOnlyLine(text)) {
      const last = merged.at(-1);
      if (last && last.text && !last.meaning) {
        last.meaning = text;
        continue;
      }
    }

    merged.push({ text, meaning: '' });
  }

  return merged;
}

/** 화면 표시용: 영어 줄 + 다음 줄 해석을 한 문장으로 합친다. */
export function mergeSentenceRowsForDisplay(sentences: Sentence[]): Sentence[] {
  const result: Sentence[] = [];

  for (let i = 0; i < sentences.length; i++) {
    const current = sentences[i];
    const text = current.text.trim();
    const meaning = current.meaning?.trim() ?? '';

    if (meaning) {
      result.push(current);
      continue;
    }

    if (isKoreanOnlyLine(text)) {
      const last = result.at(-1);
      if (last && last.text.trim() && !(last.meaning?.trim())) {
        result[result.length - 1] = {
          ...last,
          meaning: text,
          is_wrong: last.is_wrong || current.is_wrong,
        };
        continue;
      }
    }

    const next = sentences[i + 1];
    if (
      next &&
      /[a-zA-Z]/.test(text) &&
      !(next.meaning?.trim()) &&
      isKoreanOnlyLine(next.text)
    ) {
      result.push({
        ...current,
        meaning: next.text.trim(),
        is_wrong: current.is_wrong || next.is_wrong,
      });
      i += 1;
      continue;
    }

    result.push(current);
  }

  return result;
}
