import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { BulkTextarea } from './BulkTextarea';
import { fetchDeck } from '../services/decks';
import { fetchSentences } from '../services/sentences';
import { fetchWords } from '../services/words';
import { parseSentenceList, sentencesToText } from '../utils/parseSentenceList';
import type { ParsedSentence } from '../utils/parseSentenceList';
import { parseWordEntries } from '../utils/parseWordList';
import type { ParsedWordPair } from '../utils/parseWordList';
import type { Sentence, Word } from '../types';
import { wordsToBulkText } from '../utils/wordsToBulkText';

interface EditDeckModalProps {
  deckId: string;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    words: ParsedWordPair[];
    sentences: ParsedSentence[];
    existingWords: Word[];
    existingSentences: Sentence[];
    wordDraftText: string;
    sentenceDraftText: string;
  }) => Promise<void>;
}

export function EditDeckModal({ deckId, initialTitle, onClose, onSubmit }: EditDeckModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [bulkText, setBulkText] = useState('');
  const [sentenceText, setSentenceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingWords, setExistingWords] = useState<Word[]>([]);
  const [existingSentences, setExistingSentences] = useState<Sentence[]>([]);

  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseWordEntries(bulkText), [bulkText]);
  const parsedSentences = useMemo(() => parseSentenceList(sentenceText), [sentenceText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [deck, words, sentences] = await Promise.all([
          fetchDeck(deckId),
          fetchWords(deckId),
          fetchSentences(deckId),
        ]);
        if (cancelled) return;
        setExistingWords(words);
        setExistingSentences(sentences);
        setBulkText(deck?.word_draft_text ?? wordsToBulkText(words));
        setSentenceText(deck?.sentence_draft_text ?? sentencesToText(sentences));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('카드 이름을 입력해주세요.');
      return;
    }
    if (parsed.items.length === 0) {
      setError('단어 목록을 한 줄 이상 입력해주세요.');
      return;
    }
    if (parsed.errors.length > 0) {
      setError(parsed.errors[0]);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const wordResult = parseWordEntries(bulkText);
      if (wordResult.errors.length > 0) {
        setError(wordResult.errors[0]);
        return;
      }
      await onSubmit({
        title: title.trim(),
        words: wordResult.items,
        sentences: parsedSentences,
        existingWords,
        existingSentences,
        wordDraftText: bulkText,
        sentenceDraftText: sentenceText,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="카드 수정" onClose={onClose}>
      {loading ? (
        <p className="hint">불러오는 중...</p>
      ) : (
        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field-label">카드 이름</span>
            <input autoFocus type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="field">
            <span className="field-label">단어 + 뜻</span>
            <BulkTextarea value={bulkText} onChange={setBulkText} rows={6} />
          </label>

          <label className="field field-major-gap">
            <span className="field-label">문장 + 해석</span>
            <BulkTextarea value={sentenceText} onChange={setSentenceText} rows={6} showGrayToolbar={false} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '저장 중...' : '저장하기'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              닫기
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
