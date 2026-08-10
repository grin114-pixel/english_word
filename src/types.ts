export interface Deck {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface Sentence {
  id: string;
  deck_id: string;
  user_id: string;
  text: string;
  is_wrong: boolean;
  created_at: string;
}

export interface Word {
  id: string;
  deck_id: string;
  user_id: string;
  word: string;
  meaning: string;
  is_wrong_word: boolean;
  is_wrong_meaning: boolean;
  created_at: string;
}

export type ViewMode = 'study' | 'word' | 'meaning' | 'sentence';
