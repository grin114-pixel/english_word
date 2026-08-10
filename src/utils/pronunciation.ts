interface PhoneticEntry {
  text?: string;
  audio?: string;
}

interface DictionaryEntry {
  phonetics?: PhoneticEntry[];
}

export interface PronunciationInfo {
  phonetic: string | null;
  audioUrl: string | null;
}

const cache = new Map<string, PronunciationInfo>();

export async function fetchPronunciation(word: string): Promise<PronunciationInfo> {
  const key = word.toLowerCase().trim();
  if (cache.has(key)) {
    return cache.get(key)!;
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(key)}`,
    );
    if (!response.ok) throw new Error('not found');

    const data = (await response.json()) as DictionaryEntry[];
    const phonetics = data[0]?.phonetics ?? [];
    const withAudio = phonetics.find((item) => item.audio);
    const withText = phonetics.find((item) => item.text);

    const info: PronunciationInfo = {
      phonetic: withText?.text ?? withAudio?.text ?? null,
      audioUrl: withAudio?.audio ?? phonetics.find((item) => item.audio)?.audio ?? null,
    };
    cache.set(key, info);
    return info;
  } catch {
    const fallback: PronunciationInfo = { phonetic: null, audioUrl: null };
    cache.set(key, fallback);
    return fallback;
  }
}

export function speakWithBrowser(word: string): void {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  window.speechSynthesis.speak(utterance);
}

export async function playPronunciation(word: string): Promise<PronunciationInfo> {
  const info = await fetchPronunciation(word);

  if (info.audioUrl) {
    try {
      const audio = new Audio(info.audioUrl);
      await audio.play();
      return info;
    } catch {
      speakWithBrowser(word);
      return info;
    }
  }

  speakWithBrowser(word);
  return info;
}
