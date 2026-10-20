import { create } from 'zustand';
import type { PollQuestion, PublicRoomState, VoteCounts } from '../types/poll';
import { INITIAL_VOTE_COUNTS } from '../realtime/room.reducer';

interface PresenterStore extends PublicRoomState {
  applySnapshot: (snapshot: PublicRoomState) => void;
  applyVoteAccepted: (params: {
    questionId: string;
    revision: number;
    voteCounts: VoteCounts;
    totalAcceptedVotes: number;
  }) => void;
  applyPollOpened: (params: { questionId: string; revision: number }) => void;
  applyPollClosed: (params: { questionId: string; revision: number }) => void;
  applyQuestionChanged: (params: {
    questionIndex: number;
    totalQuestions: number;
    currentQuestion: PollQuestion | null;
    revision: number;
  }) => void;
  applyRoomReset: (params: { revision: number }) => void;
  resetState: (roomId: string) => void;
}

export const usePresenterStore = create<PresenterStore>((set, get) => ({
  roomId: '',
  revision: 0,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  currentQuestion: null,
  pollStatus: 'open',
  voteCounts: INITIAL_VOTE_COUNTS,
  totalAcceptedVotes: 0,

  applySnapshot: (snapshot) => {
    const current = get();
    // Only accept equal or newer revisions
    if (snapshot.revision < current.revision && snapshot.roomId === current.roomId) {
      return;
    }
    set({
      roomId: snapshot.roomId,
      revision: snapshot.revision,
      currentQuestionIndex: snapshot.currentQuestionIndex,
      totalQuestions: snapshot.totalQuestions,
      currentQuestion: snapshot.currentQuestion,
      pollStatus: snapshot.pollStatus,
      voteCounts: snapshot.voteCounts,
      totalAcceptedVotes: snapshot.totalAcceptedVotes,
    });
  },

  applyVoteAccepted: ({ questionId, revision, voteCounts, totalAcceptedVotes }) => {
    const current = get();
    if (current.currentQuestion && current.currentQuestion.id !== questionId) {
      return; // Ignore votes for other questions
    }
    if (revision < current.revision) {
      return;
    }
    set({
      revision,
      voteCounts,
      totalAcceptedVotes,
    });
  },

  applyPollOpened: ({ questionId, revision }) => {
    const current = get();
    if (current.currentQuestion && current.currentQuestion.id === questionId) {
      set({
        pollStatus: 'open',
        revision: Math.max(current.revision, revision),
      });
    }
  },

  applyPollClosed: ({ questionId, revision }) => {
    const current = get();
    if (current.currentQuestion && current.currentQuestion.id === questionId) {
      set({
        pollStatus: 'closed',
        revision: Math.max(current.revision, revision),
      });
    }
  },

  applyQuestionChanged: ({ questionIndex, totalQuestions, currentQuestion, revision }) => {
    const hasOptions = Boolean(currentQuestion?.options && currentQuestion.options.length > 0);
    set({
      currentQuestionIndex: questionIndex,
      totalQuestions,
      currentQuestion,
      pollStatus: hasOptions ? 'open' : 'waiting',
      voteCounts: INITIAL_VOTE_COUNTS,
      totalAcceptedVotes: 0,
      revision,
    });
  },

  applyRoomReset: ({ revision }) => {
    const current = get();
    const hasOptions = Boolean(current.currentQuestion?.options && current.currentQuestion.options.length > 0);
    set({
      revision,
      voteCounts: INITIAL_VOTE_COUNTS,
      totalAcceptedVotes: 0,
      pollStatus: hasOptions ? 'open' : 'waiting',
    });
  },

  resetState: (roomId) => {
    set({
      roomId,
      revision: 0,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      currentQuestion: null,
      pollStatus: 'open',
      voteCounts: INITIAL_VOTE_COUNTS,
      totalAcceptedVotes: 0,
    });
  },
}));
