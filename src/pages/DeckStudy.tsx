import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EditDeckModal } from '../components/EditDeckModal';
import { EditIcon } from '../components/EditIcon';
import { FilterBar } from '../components/FilterBar';
import { SentenceTable } from '../components/SentenceTable';
import { StudyList } from '../components/StudyList';
import { WordTable } from '../components/WordTable';
import { fetchDeck, fetchDecks, updateDeck } from '../services/decks';
import {
  fetchSentences,
  setSentenceWrong,
  syncDeckSentences,
} from '../services/sentences';
import { fetchWords, setWordWrong, syncDeckWords } from '../services/words';
import type { Deck, Sentence, ViewMode, Word } from '../types';
import type { ParsedWordPair } from '../utils/parseWordList';
import type { ParsedSentence } from '../utils/parseSentenceList';
import { mergeSentenceRowsForDisplay } from '../utils/parseSentenceList';
import { getPageBreakSentenceIds, getPageBreakWordIds } from '../utils/pageBreaks';
import { getSentenceIdsInDraftOrder } from '../utils/sentenceOrder';
import { getWordIdsInDraftOrder } from '../utils/wordOrder';
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
  const [mode, setMode] = useState<ViewMode>('study');
  const [wrongOnly, setWrongOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDeck, setShowEditDeck] = useState(false);
  const [randomWordOrder, setRandomWordOrder] = useState<string[] | null>(null);
  const [randomSentenceOrder, setRandomSentenceOrder] = useState<string[] | null>(null);

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
        setRandomWordOrder(null);
        setRandomSentenceOrder(null);
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
    setRandomWordOrder(null);
    setRandomSentenceOrder(null);
    window.scrollTo(0, 0);
  }, [mode]);

  const canonicalWordIds = useMemo(
    () => getWordIdsInDraftOrder(deck?.word_draft_text, words),
    [deck?.word_draft_text, words],
  );

  const visibleWords = useMemo(() => {
    const byId = new Map(words.map((w) => [w.id, w]));
    const activeOrder =
      mode === 'study' ? canonicalWordIds : (randomWordOrder ?? canonicalWordIds);
    const ordered = activeOrder.map((id) => byId.get(id)).filter((w): w is Word => Boolean(w));
    if (mode === 'study' || mode === 'sentence' || !wrongOnly) return ordered;
    return ordered.filter((w) => isWrongForMode(w, mode));
  }, [words, canonicalWordIds, randomWordOrder, wrongOnly, mode]);

  const mergedSentences = useMemo(
    () => mergeSentenceRowsForDisplay(sentences),
    [sentences],
  );

  const canonicalSentenceIds = useMemo(
    () => getSentenceIdsInDraftOrder(deck?.sentence_draft_text, sentences),
    [deck?.sentence_draft_text, sentences],
  );

  const visibleSentences = useMemo(() => {
    const byId = new Map(mergedSentences.map((s) => [s.id, s]));
    const activeOrder = randomSentenceOrder ?? canonicalSentenceIds;
    const ordered = activeOrder
      .map((id) => byId.get(id))
      .filter((s): s is Sentence => Boolean(s));
    if (!wrongOnly) return ordered;
    return ordered.filter((s) => s.is_wrong);
  }, [mergedSentences, canonicalSentenceIds, randomSentenceOrder, wrongOnly]);

  const pageBreakAfterWordIds = useMemo(
    () => getPageBreakWordIds(deck?.word_draft_text, words),
    [deck?.word_draft_text, words],
  );

  const pageBreakAfterSentenceIds = useMemo(
    () => getPageBreakSentenceIds(deck?.sentence_draft_text, sentences),
    [deck?.sentence_draft_text, sentences],
  );

  const wrongCount = useMemo(() => {
    if (mode === 'study') return 0;
    if (mode === 'sentence') return mergedSentences.filter((s) => s.is_wrong).length;
    return words.filter((w) => isWrongForMode(w, mode)).length;
  }, [words, mergedSentences, mode]);

  const isEmpty = mode === 'sentence' ? visibleSentences.length === 0 : visibleWords.length === 0;

  const handleShuffle = () => {
    if (mode === 'sentence') {
      setRandomSentenceOrder(shuffleArray(canonicalSentenceIds));
      return;
    }

    if (mode === 'word' || mode === 'meaning') {
      setRandomWordOrder(shuffleArray(canonicalWordIds));
    }
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
    sentences: ParsedSentence[];
    existingWords: Word[];
    existingSentences: Sentence[];
    wordDraftText: string;
    sentenceDraftText: string;
  }) => {
    if (!activeDeckId) return;
    await updateDeck(activeDeckId, {
      title: input.title,
      wordDraftText: input.wordDraftText,
      sentenceDraftText: input.sentenceDraftText,
    });
    const [syncedWords, syncedSentences] = await Promise.all([
      syncDeckWords(activeDeckId, input.existingWords, input.words),
      syncDeckSentences(activeDeckId, input.existingSentences, input.sentences),
    ]);
    setDeck((prev) =>
      prev
        ? {
            ...prev,
            title: input.title,
            word_draft_text: input.wordDraftText,
            sentence_draft_text: input.sentenceDraftText,
          }
        : prev,
    );
    setWords(syncedWords);
    setSentences(syncedSentences);
    setRandomWordOrder(null);
    setRandomSentenceOrder(null);
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
          <h2 className="truncate">{deck?.title ?? '카드'}</h2>
          <button
            type="button"
            className="icon-btn subtle"
            onClick={() => setShowEditDeck(true)}
            aria-label="카드 편집"
          >
            <EditIcon />
          </button>
        </div>

        <div className="study-toolbar">
          <FilterBar mode={mode} onChange={setMode} />
          {mode !== 'study' && (
            <div className="study-toolbar-row">
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
            </div>
          )}
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
              <p className="hint">편집 버튼에서 단어를 추가할 수 있어요.</p>
            )}
            {!wrongOnly && mode === 'sentence' && (
              <p className="hint">편집 버튼에서 문장을 추가할 수 있어요.</p>
            )}
          </div>
        )}

        {mode === 'study' && (
          <StudyList words={visibleWords} pageBreakAfterWordIds={pageBreakAfterWordIds} />
        )}

        {(mode === 'word' || mode === 'meaning') && (
          <WordTable
            words={visibleWords}
            mode={mode}
            onToggleWrong={handleToggleWordWrong}
            pageBreakAfterWordIds={randomWordOrder ? undefined : pageBreakAfterWordIds}
          />
        )}

        {mode === 'sentence' && (
          <SentenceTable
            sentences={visibleSentences}
            onToggleWrong={handleToggleSentenceWrong}
            pageBreakAfterSentenceIds={
              randomSentenceOrder ? undefined : pageBreakAfterSentenceIds
            }
          />
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
