import { create } from 'zustand';
import type {
  HostRoomState,
  OptionId,
  PollQuestion,
  PublicRoomState,
  VoteCounts,
} from '../types/poll';
import {
  acceptVote,
  changeQuestionIndex,
  closePoll,
  derivePublicRoomState,
  openPoll,
  resetCurrentPoll,
  updateQuestions,
} from '../realtime/room.reducer';
import { generateId } from '../realtime/room.events';
import { TRUYEN_GIANG_PRESET } from '../data/questionPresets';

/**
 * Generate a random 6-character room code using Web Crypto
 * Excludes ambiguous characters (0, O, 1, I)
 */
export function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

const DEFAULT_QUESTIONS: PollQuestion[] = TRUYEN_GIANG_PRESET;

interface HostStore extends HostRoomState {
  initRoom: (roomId?: string) => string;
  openPoll: () => void;
  closePoll: () => void;
  goToQuestion: (index: number) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  resetCurrentPoll: () => void;
  addQuestion: (question: PollQuestion) => void;
  updateQuestion: (index: number, question: PollQuestion) => void;
  deleteQuestion: (index: number) => void;
  reorderQuestions: (startIndex: number, endIndex: number) => void;
  importQuestions: (questions: PollQuestion[]) => boolean;
  loadPreset: (preset: PollQuestion[]) => void;
  processVote: (params: {
    questionId: string;
    participantId: string;
    optionId: OptionId;
  }) => { accepted: boolean; updatedCounts?: VoteCounts; totalVotes?: number };
  getPublicSnapshot: () => PublicRoomState;
}

export const useHostStore = create<HostStore>((set, get) => ({
  roomId: '',
  hostSessionId: '',
  currentQuestionIndex: 0,
  questions: DEFAULT_QUESTIONS,
  pollStatus: 'open',
  revision: 1,
  votes: {},

  initRoom: (providedRoomId?: string) => {
    const existing = get();
    if (providedRoomId && existing.roomId === providedRoomId) {
      return existing.roomId;
    }

    const roomId = providedRoomId || generateRoomCode();
    const hostSessionId = generateId();
    const firstQ = DEFAULT_QUESTIONS[0];
    const hasOptions = Boolean(firstQ?.options && firstQ.options.length > 0);

    set({
      roomId,
      hostSessionId,
      currentQuestionIndex: 0,
      questions: DEFAULT_QUESTIONS,
      pollStatus: hasOptions ? 'open' : 'waiting',
      revision: 1,
      votes: {},
    });

    return roomId;
  },

  openPoll: () => {
    set((state) => openPoll(state));
  },

  closePoll: () => {
    set((state) => closePoll(state));
  },

  goToQuestion: (index: number) => {
    set((state) => {
      const next = changeQuestionIndex(state, index);
      return next ? next : state;
    });
  },

  nextQuestion: () => {
    const { currentQuestionIndex, questions } = get();
    if (currentQuestionIndex < questions.length - 1) {
      get().goToQuestion(currentQuestionIndex + 1);
    }
  },

  prevQuestion: () => {
    const { currentQuestionIndex } = get();
    if (currentQuestionIndex > 0) {
      get().goToQuestion(currentQuestionIndex - 1);
    }
  },

  resetCurrentPoll: () => {
    set((state) => resetCurrentPoll(state));
  },

  addQuestion: (question: PollQuestion) => {
    set((state) => {
      const questions = [...state.questions, question];
      return updateQuestions(state, questions);
    });
  },

  updateQuestion: (index: number, question: PollQuestion) => {
    set((state) => {
      const questions = [...state.questions];
      questions[index] = question;
      return updateQuestions(state, questions);
    });
  },

  deleteQuestion: (index: number) => {
    set((state) => {
      if (state.questions.length <= 1) return state; // Keep at least one question
      const questions = state.questions.filter((_, i) => i !== index);
      return updateQuestions(state, questions);
    });
  },

  reorderQuestions: (startIndex: number, endIndex: number) => {
    set((state) => {
      const questions = [...state.questions];
      const [removed] = questions.splice(startIndex, 1);
      questions.splice(endIndex, 0, removed);
      return updateQuestions(state, questions);
    });
  },

  importQuestions: (questions: PollQuestion[]) => {
    if (!Array.isArray(questions) || questions.length === 0) return false;
    set((state) => updateQuestions(state, questions));
    return true;
  },

  loadPreset: (preset: PollQuestion[]) => {
    if (!Array.isArray(preset) || preset.length === 0) return;
    set((state) => updateQuestions(state, preset));
  },

  processVote: (params) => {
    const state = get();
    const result = acceptVote(state, params);
    if (!result) {
      return { accepted: false };
    }
    set(result.newState);
    return {
      accepted: true,
      updatedCounts: result.updatedCounts,
      totalVotes: result.totalVotes,
    };
  },

  getPublicSnapshot: () => {
    return derivePublicRoomState(get());
  },
}));
