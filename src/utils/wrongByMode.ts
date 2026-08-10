export type WordTestMode = 'word' | 'meaning';

export type WrongField = 'is_wrong_word' | 'is_wrong_meaning';

export function wrongFieldForMode(mode: WordTestMode): WrongField {
  if (mode === 'word') return 'is_wrong_word';
  return 'is_wrong_meaning';
}

export function isWrongForMode(
  word: { is_wrong_word: boolean; is_wrong_meaning: boolean },
  mode: WordTestMode,
): boolean {
  return word[wrongFieldForMode(mode)];
}
