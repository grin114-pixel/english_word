import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditDeckModal } from '../components/EditDeckModal';
import { FilterBar } from '../components/FilterBar';
import { SentenceTable } from '../components/SentenceTable';
import { StudyList } from '../components/StudyList';
import { WordTable } from '../components/WordTable';
import { fetchDeck, fetchDecks, updateDeckTitle } from '../services/decks';
import {
  fetchSentences,
  setSentenceWrong,
  syncDeckSentences,
} from '../services/sentences';
import { fetchWords, setWordWrong, syncDeckWords } from '../services/words';
import type { Deck, Sentence, ViewMode, Word } from '../types';
import type { ParsedWordPair } from '../utils/parseWordList';
import { shuffleArray } from '../utils/shuffle';
import { isWrongForMode, wrongFieldForMode } from '../utils/wrongByMode';

export function DeckStudy({
  latest = false,
  refreshKey = 0,
}: {
  latest?: boolean;
  refreshKey?: number;
}) {
  const { deckId: routeDeckId } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();

  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [hasNoDecks, setHasNoDecks] = useState(false);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [sentenceOrder, setSentenceOrder] = useState<string[]>([]);
  const [mode, setMode] = useState<ViewMode>('study');
  const [wrongOnly, setWrongOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDeck, setShowEditDeck] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (latest) {
        setLoading(true);
        setError(null);
        try {
          const decks = await fetchDecks();
          if (cancelled) return;
          if (decks.length > 0) {
            setActiveDeckId(decks[0].id);
            setHasNoDecks(false);
          } else {
            setActiveDeckId(null);
            setHasNoDecks(true);
            setLoading(false);
          }
        } catch (err) {
          if (!cancelled) setError(err instanceof Error ? err.message : '카드를 불러오지 못했어요.');
          setLoading(false);
        }
        return;
      }

      if (routeDeckId) {
        setActiveDeckId(routeDeckId);
        setHasNoDecks(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [latest, routeDeckId, refreshKey]);

  useEffect(() => {
    if (!activeDeckId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [deckData, wordsData] = await Promise.all([
          fetchDeck(activeDeckId),
          fetchWords(activeDeckId),
        ]);
        if (cancelled) return;

        let sentencesData: Sentence[] = [];
        try {
          sentencesData = await fetchSentences(activeDeckId);
        } catch (sentenceErr) {
          if (!cancelled) {
            console.error(sentenceErr);
          }
        }

        if (cancelled) return;
        setDeck(deckData);
        setWords(wordsData);
        setSentences(sentencesData);
        setOrder(wordsData.map((w) => w.id));
        setSentenceOrder(sentencesData.map((s) => s.id));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '불러오지 못했어요.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeDeckId, refreshKey]);

  useEffect(() => {
    setWrongOnly(false);
  }, [mode]);

  const visibleWords = useMemo(() => {
    const byId = new Map(words.map((w) => [w.id, w]));
    const ordered = order.map((id) => byId.get(id)).filter((w): w is Word => Boolean(w));
    if (mode === 'study' || mode === 'sentence' || !wrongOnly) return ordered;
    return ordered.filter((w) => isWrongForMode(w, mode));
  }, [words, order, wrongOnly, mode]);

  const visibleSentences = useMemo(() => {
    const byId = new Map(sentences.map((s) => [s.id, s]));
    const ordered = sentenceOrder.map((id) => byId.get(id)).filter((s): s is Sentence => Boolean(s));
    if (!wrongOnly) return ordered;
    return ordered.filter((s) => s.is_wrong);
  }, [sentences, sentenceOrder, wrongOnly]);

  const wrongCount = useMemo(() => {
    if (mode === 'study') return 0;
    if (mode === 'sentence') return sentences.filter((s) => s.is_wrong).length;
    return words.filter((w) => isWrongForMode(w, mode)).length;
  }, [words, sentences, mode]);

  const isEmpty = mode === 'sentence' ? visibleSentences.length === 0 : visibleWords.length === 0;

  const handleShuffle = () => {
    if (mode === 'sentence') {
      setSentenceOrder((prev) => shuffleArray(prev));
      return;
    }
    setOrder((prev) => shuffleArray(prev));
  };

  const handleToggleWordWrong = async (word: Word) => {
    if (mode !== 'word' && mode !== 'meaning') return;
    const field = wrongFieldForMode(mode);
    const next = !word[field];
    setWords((prev) => prev.map((w) => (w.id === word.id ? { ...w, [field]: next } : w)));
    try {
      await setWordWrong(word.id, mode, next);
    } catch {
      setWords((prev) => prev.map((w) => (w.id === word.id ? { ...w, [field]: word[field] } : w)));
    }
  };

  const handleToggleSentenceWrong = async (sentence: Sentence) => {
    const next = !sentence.is_wrong;
    setSentences((prev) => prev.map((s) => (s.id === sentence.id ? { ...s, is_wrong: next } : s)));
    try {
      await setSentenceWrong(sentence.id, next);
    } catch {
      setSentences((prev) =>
        prev.map((s) => (s.id === sentence.id ? { ...s, is_wrong: sentence.is_wrong } : s)),
      );
    }
  };

  const handleEditDeck = async (input: {
    title: string;
    words: ParsedWordPair[];
    sentences: string[];
  }) => {
    if (!activeDeckId) return;
    const [existingWords, existingSentences] = await Promise.all([
      fetchWords(activeDeckId),
      fetchSentences(activeDeckId),
    ]);
    await updateDeckTitle(activeDeckId, input.title);
    const [syncedWords, syncedSentences] = await Promise.all([
      syncDeckWords(activeDeckId, existingWords, input.words),
      syncDeckSentences(activeDeckId, existingSentences, input.sentences),
    ]);
    setDeck((prev) => (prev ? { ...prev, title: input.title } : prev));
    setWords(syncedWords);
    setSentences(syncedSentences);
    setOrder(syncedWords.map((w) => w.id));
    setSentenceOrder(syncedSentences.map((s) => s.id));
  };

  if (latest && hasNoDecks && !loading && !error) {
    return (
      <div className="page">
        <main className="page-body">
          <div className="empty-state">
            <p>아직 만든 카드가 없어요.</p>
            <p className="hint">헤더 오른쪽 + 버튼을 눌러 첫 카드를 만들어보세요.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="deck-toolbar-wrap">
        <div className="sub-header">
          {!latest && (
            <button type="button" className="icon-btn" onClick={() => navigate('/')} aria-label="뒤로가기">
              ←
            </button>
          )}
          {latest && <span className="sub-header-spacer" aria-hidden="true" />}
          <h2 className="truncate">{deck?.title ?? '카드'}</h2>
          <button
            type="button"
            className="icon-btn subtle"
            onClick={() => setShowEditDeck(true)}
            aria-label="카드 수정"
          >
            ✏️
          </button>
        </div>

        <div className="study-toolbar">
          <FilterBar mode={mode} onChange={setMode} />
          <div className="study-toolbar-row">
            {mode !== 'study' && (
              <>
                <button type="button" className="btn btn-outline small" onClick={handleShuffle}>
                  🔀 랜덤
                </button>
                <button
                  type="button"
                  className={`btn btn-outline small${wrongOnly ? ' active' : ''}`}
                  onClick={() => setWrongOnly((prev) => !prev)}
                >
                  틀린 것만 보기 {wrongCount > 0 ? `(${wrongCount})` : ''}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="page-body">
        {loading && <p className="hint">불러오는 중...</p>}
        {error && <p className="form-error">{error}</p>}

        {!loading && isEmpty && !error && (
          <div className="empty-state">
            <p>
              {wrongOnly
                ? mode === 'sentence'
                  ? '틀린 문장이 없어요.'
                  : '틀린 단어가 없어요.'
                : mode === 'sentence'
                  ? '아직 등록된 문장이 없어요.'
                  : '아직 등록된 단어가 없어요.'}
            </p>
            {!wrongOnly && mode !== 'sentence' && (
              <p className="hint">카드 수정(✏️)에서 단어를 추가할 수 있어요.</p>
            )}
            {!wrongOnly && mode === 'sentence' && (
              <p className="hint">카드 수정(✏️)에서 문장을 추가할 수 있어요.</p>
            )}
          </div>
        )}

        {mode === 'study' && <StudyList words={visibleWords} />}

        {(mode === 'word' || mode === 'meaning') && (
          <WordTable words={visibleWords} mode={mode} onToggleWrong={handleToggleWordWrong} />
        )}

        {mode === 'sentence' && (
          <SentenceTable sentences={visibleSentences} onToggleWrong={handleToggleSentenceWrong} />
        )}
      </main>

      {showEditDeck && activeDeckId && deck && (
        <EditDeckModal
          deckId={activeDeckId}
          initialTitle={deck.title}
          onClose={() => setShowEditDeck(false)}
          onSubmit={handleEditDeck}
        />
      )}
    </div>
  );
}
