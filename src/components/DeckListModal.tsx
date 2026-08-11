import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import { deleteDeck, fetchDecks } from '../services/decks';
import type { Deck } from '../types';
import { supabase } from '../lib/supabase';

interface DeckWithCount extends Deck {
  wordCount: number;
}

interface DeckListModalProps {
  onClose: () => void;
  onDeckUpdated?: () => void;
}

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 7h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M10 7V6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 7l1 13h6l1-13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DeckListModal({ onClose, onDeckUpdated }: DeckListModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [decks, setDecks] = useState<DeckWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = async () => {
    setLoading(true);
    setError(null);
    try {
      const deckList = await fetchDecks();
      const counts = await Promise.all(
        deckList.map(async (deck) => {
          const { count } = await supabase
            .from('words')
            .select('id', { count: 'exact', head: true })
            .eq('deck_id', deck.id);
          return { ...deck, wordCount: count ?? 0 };
        }),
      );
      setDecks(counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : '카드를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDecks();
  }, []);

  const handleSelectDeck = (deck: DeckWithCount) => {
    navigate(`/deck/${deck.id}`);
    onClose();
  };

  const handleDeleteDeck = async (deck: DeckWithCount) => {
    if (!window.confirm(`'${deck.title}' 카드를 삭제할까요? 안에 있는 단어도 모두 사라져요.`)) return;
    await deleteDeck(deck.id);
    setDecks((prev) => prev.filter((d) => d.id !== deck.id));
    onDeckUpdated?.();
    if (location.pathname === `/deck/${deck.id}` || location.pathname === '/') {
      navigate('/', { replace: true });
    }
  };

  return (
    <Modal title="카드 목록" onClose={onClose}>
      {loading && <p className="hint">불러오는 중...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && decks.length === 0 && !error && (
        <div className="empty-state">
          <p>아직 만든 카드가 없어요.</p>
          <p className="hint">헤더 오른쪽 + 버튼을 눌러 첫 카드를 만들어보세요.</p>
        </div>
      )}

      <ul className="deck-list">
        {decks.map((deck) => (
          <li key={deck.id} className="deck-item" onClick={() => handleSelectDeck(deck)}>
            <div className="deck-item-main">
              <h3>{deck.title}</h3>
              <span className="hint">단어 {deck.wordCount}개</span>
            </div>
            <div className="deck-item-actions">
              <button
                type="button"
                className="icon-btn subtle"
                aria-label="카드 삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDeck(deck);
                }}
              >
                <DeleteIcon />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
