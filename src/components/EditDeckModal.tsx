import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { fetchSentences } from '../services/sentences';
import { fetchWords } from '../services/words';
import { parseSentenceList, sentencesToText } from '../utils/parseSentenceList';
import { parseWordEntries } from '../utils/parseWordList';
import type { ParsedWordPair } from '../utils/parseWordList';
import { wordsToBulkText } from '../utils/wordsToBulkText';

interface EditDeckModalProps {
  deckId: string;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (input: { title: string; words: ParsedWordPair[]; sentences: string[] }) => Promise<void>;
}

export function EditDeckModal({ deckId, initialTitle, onClose, onSubmit }: EditDeckModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [bulkText, setBulkText] = useState('');
  const [sentenceText, setSentenceText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseWordEntries(bulkText), [bulkText]);
  const parsedSentences = useMemo(() => parseSentenceList(sentenceText), [sentenceText]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [words, sentences] = await Promise.all([fetchWords(deckId), fetchSentences(deckId)]);
        if (cancelled) return;
        setBulkText(wordsToBulkText(words));
        setSentenceText(sentencesToText(sentences));
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
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} />
            <span className="hint">
              한 줄에 「단어(구) 뜻」 형식으로 입력하세요. 예: make fun of ~을 놀리다, 비웃다
              {parsed.items.length > 0 && ` (${parsed.items.length}개 인식됨)`}
            </span>
          </label>

          <label className="field">
            <span className="field-label">문장 (선택)</span>
            <textarea value={sentenceText} onChange={(e) => setSentenceText(e.target.value)} rows={6} />
            <span className="hint">
              단어와 별개로, 한 줄에 문장 하나씩 입력하세요.
              {parsedSentences.length > 0 && ` (${parsedSentences.length}개 인식됨)`}
            </span>
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
