import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EditDeckModal } from './EditDeckModal';
import { Modal } from './Modal';
import { deleteDeck, fetchDecks, updateDeckTitle } from '../services/decks';
import { fetchSentences, syncDeckSentences } from '../services/sentences';
import { fetchWords, syncDeckWords } from '../services/words';
import type { Deck } from '../types';
import type { ParsedWordPair } from '../utils/parseWordList';
import { supabase } from '../lib/supabase';

interface DeckWithCount extends Deck {
  wordCount: number;
}

interface DeckListModalProps {
  onClose: () => void;
  onDeckUpdated?: () => void;
}

export function DeckListModal({ onClose, onDeckUpdated }: DeckListModalProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [decks, setDecks] = useState<DeckWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDeck, setEditingDeck] = useState<DeckWithCount | null>(null);

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

  const handleEditDeck = async (input: {
    title: string;
    words: ParsedWordPair[];
    sentences: string[];
  }) => {
    if (!editingDeck) return;
    const [existingWords, existingSentences] = await Promise.all([
      fetchWords(editingDeck.id),
      fetchSentences(editingDeck.id),
    ]);
    await updateDeckTitle(editingDeck.id, input.title);
    await Promise.all([
      syncDeckWords(editingDeck.id, existingWords, input.words),
      syncDeckSentences(editingDeck.id, existingSentences, input.sentences),
    ]);
    await loadDecks();
    onDeckUpdated?.();
  };

  return (
    <>
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
                  aria-label="카드 수정"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDeck(deck);
                  }}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-btn subtle"
                  aria-label="카드 삭제"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDeck(deck);
                  }}
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Modal>

      {editingDeck && (
        <EditDeckModal
          deckId={editingDeck.id}
          initialTitle={editingDeck.title}
          onClose={() => setEditingDeck(null)}
          onSubmit={handleEditDeck}
        />
      )}
    </>
  );
}
