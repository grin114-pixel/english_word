const GRAY_OPEN = '<g>';
const GRAY_CLOSE = '</g>';

export function hasGrayMarkers(text: string): boolean {
  return /<\/?g>/i.test(text);
}

export function stripGrayMarkers(text: string): string {
  return text.replace(/<\/?g>/gi, '');
}

export function wrapGrayTags(
  value: string,
  start: number,
  end: number,
): { value: string; selectionStart: number; selectionEnd: number } | null {
  if (start === end) return null;

  const selected = value.slice(start, end);
  if (!selected.trim()) return null;

  const next = `${value.slice(0, start)}${GRAY_OPEN}${selected}${GRAY_CLOSE}${value.slice(end)}`;
  const selectionStart = start + GRAY_OPEN.length;
  const selectionEnd = selectionStart + selected.length;
  return { value: next, selectionStart, selectionEnd };
}

const OPEN_BRACKET_TO_CLOSE: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
};

/** 한글 경계 분리 뒤 단어 끝에 붙은 여는 괄호는 뜻 쪽으로 옮긴다. */
function moveLeadingBracketsToMeaning(word: string, meaning: string): { word: string; meaning: string } {
  let nextWord = word;
  let nextMeaning = meaning;

  while (nextWord.length > 0) {
    const last = nextWord[nextWord.length - 1];
    const close = OPEN_BRACKET_TO_CLOSE[last];
    if (!close || nextMeaning.startsWith(close)) break;

    nextMeaning = `${last}${nextMeaning}`;
    nextWord = nextWord.slice(0, -1).trimEnd();
  }

  return { word: nextWord.trim(), meaning: nextMeaning.trim() };
}

const ENGLISH_WORD_LINE =
  /^([a-zA-Z][a-zA-Z\-']*(?:\s+[a-zA-Z][a-zA-Z\-']*)*)\s+(.+)$/;

function splitPlainLine(plain: string): { word: string; meaning: string } | null {
  const englishMatch = plain.match(ENGLISH_WORD_LINE);
  if (englishMatch) {
    return { word: englishMatch[1].trim(), meaning: englishMatch[2].trim() };
  }

  const koreanStart = plain.match(/(?:~[\uAC00-\uD7A3\u3131-\u318E]|[\uAC00-\uD7A3\u3131-\u318E])/);
  if (koreanStart && koreanStart.index !== undefined && koreanStart.index > 0) {
    return moveLeadingBracketsToMeaning(
      plain.slice(0, koreanStart.index).trim(),
      plain.slice(koreanStart.index).trim(),
    );
  }

  return null;
}

function extractOriginalSegment(
  normalized: string,
  plainStart: number,
  plainEnd: number,
): string {
  let plainCount = 0;
  let result = '';
  let i = 0;

  while (i < normalized.length) {
    if (normalized.startsWith(GRAY_OPEN, i)) {
      i += GRAY_OPEN.length;
      const closeIdx = normalized.indexOf(GRAY_CLOSE, i);
      if (closeIdx === -1) {
        if (plainCount < plainEnd) {
          const overlapStart = Math.max(plainStart, plainCount);
          const inner = normalized.slice(i);
          const innerStart = overlapStart - plainCount;
          if (innerStart < inner.length) {
            const portion = inner.slice(innerStart, plainEnd - plainCount);
            if (portion) result += `${GRAY_OPEN}${portion}`;
          }
        }
        break;
      }

      const inner = normalized.slice(i, closeIdx);
      const tagPlainStart = plainCount;
      const tagPlainEnd = plainCount + inner.length;
      const segStart = Math.max(tagPlainStart, plainStart);
      const segEnd = Math.min(tagPlainEnd, plainEnd);

      if (segStart < segEnd) {
        const portion = inner.slice(segStart - tagPlainStart, segEnd - tagPlainStart);
        if (portion) result += `${GRAY_OPEN}${portion}${GRAY_CLOSE}`;
      }

      plainCount += inner.length;
      i = closeIdx + GRAY_CLOSE.length;
      continue;
    }

    if (plainCount >= plainEnd) break;

    if (plainCount >= plainStart) {
      result += normalized[i];
    }

    plainCount += 1;
    i += 1;
  }

  return result;
}

/** 회색 태그를 유지한 채 단어/뜻 경계를 찾는다. */
export function splitLinePreservingGray(line: string): { word: string; meaning: string } | null {
  const normalized = line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return null;

  const plain = stripGrayMarkers(normalized);
  const plainSplit = splitPlainLine(plain);
  if (!plainSplit) return null;

  if (!hasGrayMarkers(normalized)) {
    return plainSplit.word && plainSplit.meaning ? plainSplit : null;
  }

  const plainWordLen = plainSplit.word.length;
  let plainWordEnd = plainWordLen;
  while (plainWordEnd < plain.length && plain[plainWordEnd] === ' ') {
    plainWordEnd += 1;
  }

  const word = extractOriginalSegment(normalized, 0, plainWordEnd).trim();
  const meaning = extractOriginalSegment(normalized, plainWordEnd, plain.length).trim();
  return word && meaning ? { word, meaning } : null;
}

/** DB에 저장된 word/meaning을 회색 태그를 유지한 채 정규화한다. */
export function normalizeGrayWordPair(
  word: string,
  meaning: string,
): { word: string; meaning: string } | null {
  const merged = mergeWordPairToBulkLine(word, meaning);
  return splitLinePreservingGray(merged);
}

/** DB word/meaning 필드를 편집용 한 줄 텍스트로 복원한다. */
export function mergeWordPairToBulkLine(word: string, meaning: string): string {
  const w = word.trim();
  const m = meaning.trim();

  if (!w) return m;
  if (!m) return w;
  if (w === m) return w;

  const plainW = stripGrayMarkers(w).replace(/\s+/g, ' ').trim();
  const plainM = stripGrayMarkers(m).replace(/\s+/g, ' ').trim();

  if (plainW === plainM) {
    return w.length >= m.length ? w : m;
  }

  if (plainW.includes(plainM)) return w;
  if (plainM.includes(plainW)) return m;

  const joined = `${w} ${m}`.replace(/\s+/g, ' ').trim();
  const plainJoined = stripGrayMarkers(joined).replace(/\s+/g, ' ').trim();
  const singlePlain = `${plainW} ${plainM}`.replace(/\s+/g, ' ').trim();

  if (plainJoined === singlePlain) return joined;

  if (plainJoined.startsWith(`${singlePlain} `)) {
    return joined.slice(0, joined.length - (plainJoined.length - singlePlain.length)).trim();
  }

  return joined;
}
