import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EditDeckModal } from './EditDeckModal';
import { EditIcon } from './EditIcon';
import { Modal } from './Modal';
import { deleteDeck, fetchDecks, updateDeck } from '../services/decks';
import { syncDeckSentences } from '../services/sentences';
import { syncDeckWords } from '../services/words';
import type { Deck, Sentence, Word } from '../types';
import type { ParsedSentence } from '../utils/parseSentenceList';
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
    sentences: ParsedSentence[];
    existingWords: Word[];
    existingSentences: Sentence[];
    wordDraftText: string;
    sentenceDraftText: string;
  }) => {
    if (!editingDeck) return;
    await updateDeck(editingDeck.id, {
      title: input.title,
      wordDraftText: input.wordDraftText,
      sentenceDraftText: input.sentenceDraftText,
    });
    await Promise.all([
      syncDeckWords(editingDeck.id, input.existingWords, input.words),
      syncDeckSentences(editingDeck.id, input.existingSentences, input.sentences),
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
                  aria-label="카드 편집"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingDeck(deck);
                  }}
                >
                  <EditIcon />
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
