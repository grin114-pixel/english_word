import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { BulkTextarea } from './BulkTextarea';
import type { ParsedSentence } from '../utils/parseSentenceList';
import { parseSentenceList } from '../utils/parseSentenceList';
import { parseWordEntries } from '../utils/parseWordList';
import type { ParsedWordPair } from '../utils/parseWordList';

interface AddDeckModalProps {
  onClose: () => void;
  onSubmit: (input: {
    title: string;
    words: ParsedWordPair[];
    sentences: ParsedSentence[];
    wordDraftText: string;
    sentenceDraftText: string;
  }) => Promise<void>;
}

export function AddDeckModal({ onClose, onSubmit }: AddDeckModalProps) {
  const [title, setTitle] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [sentenceText, setSentenceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseWordEntries(bulkText), [bulkText]);
  const parsedSentences = useMemo(() => parseSentenceList(sentenceText), [sentenceText]);

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
      await onSubmit({
        title: title.trim(),
        words: parsed.items,
        sentences: parsedSentences,
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
    <Modal title="카드 만들기" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">카드 이름</span>
          <input
            autoFocus
            type="text"
            placeholder=""
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '저장 중...' : '카드 만들기'}
        </button>
      </form>
    </Modal>
  );
}
