import { create } from 'zustand';

export type AnswerLayoutMode = 'grid-2' | 'stack-1' | 'grid-4';

export interface DisplaySettings {
  questionFontSize: number; // For stage (px)
  answerFontSize: number;   // For stage (px)
  hostQuestionFontSize: number; // For host (px)
  hostAnswerFontSize: number;   // For host (px)
  answerLayout: AnswerLayoutMode;
}

export const DEFAULT_SETTINGS: DisplaySettings = {
  questionFontSize: 36,
  answerFontSize: 24,
  hostQuestionFontSize: 22,
  hostAnswerFontSize: 15,
  answerLayout: 'grid-2',
};

const COOKIE_KEY = 'hiepphu_display_settings';
const STORAGE_KEY = 'hiepphu_display_settings';

/**
 * Read cookie by key
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

/**
 * Write cookie with 1-year expiry
 */
function setCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Load initial settings from Cookie or LocalStorage or Defaults
 */
function loadInitialSettings(): DisplaySettings {
  try {
    const rawCookie = getCookie(COOKIE_KEY);
    if (rawCookie) {
      const parsed = JSON.parse(rawCookie);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to parse settings from cookie', e);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const rawStorage = localStorage.getItem(STORAGE_KEY);
      if (rawStorage) {
        const parsed = JSON.parse(rawStorage);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to parse settings from localStorage', e);
  }

  return { ...DEFAULT_SETTINGS };
}

/**
 * Persist settings to both Cookie and LocalStorage
 */
function persistSettings(settings: DisplaySettings) {
  const json = JSON.stringify(settings);
  try {
    setCookie(COOKIE_KEY, json);
  } catch (e) {
    console.warn('Failed to save cookie', e);
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, json);
    }
  } catch (e) {
    console.warn('Failed to save localStorage', e);
  }
}

interface SettingsStore extends DisplaySettings {
  setQuestionFontSize: (size: number) => void;
  setAnswerFontSize: (size: number) => void;
  setHostQuestionFontSize: (size: number) => void;
  setHostAnswerFontSize: (size: number) => void;
  setAnswerLayout: (layout: AnswerLayoutMode) => void;
  updateSettings: (partial: Partial<DisplaySettings>) => void;
  resetDefaults: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => {
  const initial = loadInitialSettings();

  return {
    ...initial,

    setQuestionFontSize: (size: number) => {
      const next = { ...get(), questionFontSize: Math.max(18, Math.min(64, size)) };
      persistSettings(next);
      set({ questionFontSize: next.questionFontSize });
    },

    setAnswerFontSize: (size: number) => {
      const next = { ...get(), answerFontSize: Math.max(14, Math.min(48, size)) };
      persistSettings(next);
      set({ answerFontSize: next.answerFontSize });
    },

    setHostQuestionFontSize: (size: number) => {
      const next = { ...get(), hostQuestionFontSize: Math.max(14, Math.min(36, size)) };
      persistSettings(next);
      set({ hostQuestionFontSize: next.hostQuestionFontSize });
    },

    setHostAnswerFontSize: (size: number) => {
      const next = { ...get(), hostAnswerFontSize: Math.max(11, Math.min(26, size)) };
      persistSettings(next);
      set({ hostAnswerFontSize: next.hostAnswerFontSize });
    },

    setAnswerLayout: (layout: AnswerLayoutMode) => {
      const next = { ...get(), answerLayout: layout };
      persistSettings(next);
      set({ answerLayout: layout });
    },

    updateSettings: (partial: Partial<DisplaySettings>) => {
      const next = { ...get(), ...partial };
      persistSettings(next);
      set(partial);
    },

    resetDefaults: () => {
      persistSettings(DEFAULT_SETTINGS);
      set({ ...DEFAULT_SETTINGS });
    },
  };
});

/**
 * Sync settings across tabs (e.g. Host tab -> Presenter Stage tab) via storage events
 */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue);
      useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...parsed });
    } catch (err) {
      console.warn('Failed to sync settings from another tab', err);
    }
  });
}
