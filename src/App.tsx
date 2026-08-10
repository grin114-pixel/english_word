import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AddDeckModal } from './components/AddDeckModal';
import { AppHeader } from './components/AppHeader';
import { ConfigNotice } from './components/ConfigNotice';
import { DeckListModal } from './components/DeckListModal';
import { useSupabaseReady } from './hooks/useSupabaseReady';
import { createDeck } from './services/decks';
import { createSentences } from './services/sentences';
import { createWords } from './services/words';
import { DeckStudy } from './pages/DeckStudy';

function AppRoutes() {
  const navigate = useNavigate();
  const [showAddDeck, setShowAddDeck] = useState(false);
  const [showDeckList, setShowDeckList] = useState(false);
  const [deckRefreshKey, setDeckRefreshKey] = useState(0);

  const handleCreateDeck = async (input: {
    title: string;
    words: { word: string; meaning: string }[];
    sentences: string[];
  }) => {
    const deck = await createDeck(input.title);
    await Promise.all([
      createWords(deck.id, input.words),
      createSentences(deck.id, input.sentences),
    ]);
    setDeckRefreshKey((key) => key + 1);
    navigate('/');
  };

  const handleHomeClick = () => {
    setShowAddDeck(false);
    setShowDeckList(false);
    setDeckRefreshKey((key) => key + 1);
  };

  return (
    <>
      <AppHeader
        onHomeClick={handleHomeClick}
        rightAction={
          <>
            <button
              type="button"
              className="app-header-list-btn"
              onClick={() => setShowDeckList(true)}
              aria-label="카드 목록 보기"
            >
              리스트
            </button>
            <button
              type="button"
              className="app-header-add-btn"
              onClick={() => setShowAddDeck(true)}
              aria-label="카드 만들기"
            >
              +
            </button>
          </>
        }
      />
      <Routes>
        <Route path="/" element={<DeckStudy latest refreshKey={deckRefreshKey} key={deckRefreshKey} />} />
        <Route path="/deck/:deckId" element={<DeckStudy />} />
      </Routes>

      {showAddDeck && (
        <AddDeckModal onClose={() => setShowAddDeck(false)} onSubmit={handleCreateDeck} />
      )}

      {showDeckList && (
        <DeckListModal
          onClose={() => setShowDeckList(false)}
          onDeckUpdated={() => setDeckRefreshKey((key) => key + 1)}
        />
      )}
    </>
  );
}

function App() {
  const { ready, error } = useSupabaseReady();

  if (!ready) {
    return <ConfigNotice message={error ?? undefined} />;
  }

  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
