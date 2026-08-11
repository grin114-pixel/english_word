import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { parseWordEntries } from '../utils/parseWordList';
import type { ParsedWordPair } from '../utils/parseWordList';

interface AddWordModalProps {
  onClose: () => void;
  onSubmit: (words: ParsedWordPair[]) => Promise<void>;
}

export function AddWordModal({ onClose, onSubmit }: AddWordModalProps) {
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseWordEntries(bulkText), [bulkText]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
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
      await onSubmit(parsed.items);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="단어 추가" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">단어 + 뜻</span>
          <textarea
            autoFocus
            placeholder=""
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            rows={6}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? '저장 중...' : '추가하기'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            닫기
          </button>
        </div>
      </form>
    </Modal>
  );
}
