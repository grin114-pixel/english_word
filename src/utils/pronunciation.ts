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

const infoCache = new Map<string, PronunciationInfo>();
const audioCache = new Map<string, HTMLAudioElement>();
const pendingFetch = new Map<string, Promise<PronunciationInfo>>();

export function warmSpeechSynthesis(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices();
  });
}

function normalizeKey(word: string): string {
  return word.toLowerCase().trim();
}

function preloadAudio(key: string, url: string): void {
  if (audioCache.has(key)) return;

  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = url;
  audioCache.set(key, audio);
}

function playCachedAudio(key: string, fallbackWord: string): boolean {
  const audio = audioCache.get(key);
  if (!audio) return false;

  audio.currentTime = 0;
  void audio.play().catch(() => speakWithBrowser(fallbackWord));
  return true;
}

export async function fetchPronunciation(word: string): Promise<PronunciationInfo> {
  const key = normalizeKey(word);
  if (!key) return { phonetic: null, audioUrl: null };

  if (infoCache.has(key)) {
    return infoCache.get(key)!;
  }

  if (pendingFetch.has(key)) {
    return pendingFetch.get(key)!;
  }

  const request = (async () => {
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
      infoCache.set(key, info);
      if (info.audioUrl) preloadAudio(key, info.audioUrl);
      return info;
    } catch {
      const fallback: PronunciationInfo = { phonetic: null, audioUrl: null };
      infoCache.set(key, fallback);
      return fallback;
    } finally {
      pendingFetch.delete(key);
    }
  })();

  pendingFetch.set(key, request);
  return request;
}

export function speakWithBrowser(word: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.95;
  window.speechSynthesis.speak(utterance);
}

/** 캐시된 음성이 있으면 바로 재생, 없으면 즉시 브라우저 TTS 후 백그라운드 캐싱 */
export function playPronunciation(word: string): void {
  const key = normalizeKey(word);
  if (!key) return;

  if (playCachedAudio(key, word)) return;

  const cached = infoCache.get(key);
  if (cached?.audioUrl) {
    preloadAudio(key, cached.audioUrl);
    if (playCachedAudio(key, word)) return;
  }

  speakWithBrowser(word);
  void fetchPronunciation(word);
}

export function prefetchPronunciation(word: string): void {
  const key = normalizeKey(word);
  if (!key || infoCache.has(key) || pendingFetch.has(key)) return;
  void fetchPronunciation(word);
}

export function prefetchPronunciations(words: string[]): void {
  const keys = [...new Set(words.map(normalizeKey).filter(Boolean))];
  keys.forEach((key, index) => {
    window.setTimeout(() => prefetchPronunciation(key), index * 80);
  });
}
