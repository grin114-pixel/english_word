import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from './Modal';
import { updateDeck } from '../services/decks';

interface EditDeckTitleModalProps {
  deckId: string;
  initialTitle: string;
  onClose: () => void;
  onSubmit: (title: string) => void | Promise<void>;
}

export function EditDeckTitleModal({
  deckId,
  initialTitle,
  onClose,
  onSubmit,
}: EditDeckTitleModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('카드 이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateDeck(deckId, { title: title.trim() });
      await onSubmit(title.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장하지 못했어요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="카드 이름 수정" onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">카드 이름</span>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </form>
    </Modal>
  );
}
