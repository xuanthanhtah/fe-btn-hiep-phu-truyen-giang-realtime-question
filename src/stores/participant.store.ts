import { create } from 'zustand';
import type { OptionId, PollQuestion, PollStatus, PublicRoomState } from '../types/poll';
import { generateId } from '../realtime/room.events';

interface ParticipantStore {
  participantId: string;
  roomId: string;
  currentQuestion: PollQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  pollStatus: PollStatus;
  revision: number;

  // Voting state for the active question
  selectedOption: OptionId | null; // Immediate tactile local tap
  pendingOption: OptionId | null;  // In-flight request to host
  acceptedOption: OptionId | null; // Authoritative acknowledgment from host
  isPendingAck: boolean;
  ackError: string | null;

  // Actions
  initParticipant: (roomId: string) => void;
  selectOption: (optionId: OptionId) => void;
  setPendingAck: (optionId: OptionId) => void;
  confirmAcceptedVote: (optionId: OptionId, questionId: string) => void;
  applyRoomSnapshot: (snapshot: PublicRoomState) => void;
  applyPollOpened: (questionId: string, revision: number) => void;
  applyPollClosed: (questionId: string, revision: number) => void;
  applyQuestionChanged: (
    currentQuestion: PollQuestion | null,
    questionIndex: number,
    totalQuestions: number,
    revision: number
  ) => void;
  resetVoteStateForNewQuestion: () => void;
}

export const useParticipantStore = create<ParticipantStore>((set, get) => ({
  participantId: generateId(),
  roomId: '',
  currentQuestion: null,
  currentQuestionIndex: 0,
  totalQuestions: 0,
  pollStatus: 'open',
  revision: 0,

  selectedOption: null,
  pendingOption: null,
  acceptedOption: null,
  isPendingAck: false,
  ackError: null,

  initParticipant: (roomId: string) => {
    const existing = get();
    if (existing.roomId === roomId && existing.currentQuestion) {
      return;
    }
    set({
      participantId: generateId(), // fresh in-memory identity
      roomId,
      currentQuestion: null,
      currentQuestionIndex: 0,
      totalQuestions: 0,
      pollStatus: 'open',
      revision: 0,
      selectedOption: null,
      pendingOption: null,
      acceptedOption: null,
      isPendingAck: false,
      ackError: null,
    });
  },

  selectOption: (optionId: OptionId) => {
    set({
      selectedOption: optionId,
      ackError: null,
    });
  },

  setPendingAck: (optionId: OptionId) => {
    set({
      pendingOption: optionId,
      isPendingAck: true,
      ackError: null,
    });
  },

  confirmAcceptedVote: (optionId: OptionId, questionId: string) => {
    const state = get();
    if (state.currentQuestion && state.currentQuestion.id === questionId) {
      set({
        acceptedOption: optionId,
        pendingOption: null,
        isPendingAck: false,
        ackError: null,
      });
    }
  },

  applyRoomSnapshot: (snapshot: PublicRoomState) => {
    const state = get();
    // Check if question changed between snapshots
    const isNewQuestion = !state.currentQuestion || state.currentQuestion.id !== snapshot.currentQuestion?.id;

    set({
      roomId: snapshot.roomId,
      revision: snapshot.revision,
      currentQuestion: snapshot.currentQuestion,
      currentQuestionIndex: snapshot.currentQuestionIndex,
      totalQuestions: snapshot.totalQuestions,
      pollStatus: snapshot.pollStatus,
      // If question changed, reset participant votes
      ...(isNewQuestion
        ? {
            selectedOption: null,
            pendingOption: null,
            acceptedOption: null,
            isPendingAck: false,
            ackError: null,
          }
        : {}),
    });
  },

  applyPollOpened: (questionId: string, revision: number) => {
    const state = get();
    if (state.currentQuestion && state.currentQuestion.id === questionId) {
      set({
        pollStatus: 'open',
        revision: Math.max(state.revision, revision),
      });
    }
  },

  applyPollClosed: (questionId: string, revision: number) => {
    const state = get();
    if (state.currentQuestion && state.currentQuestion.id === questionId) {
      set({
        pollStatus: 'closed',
        revision: Math.max(state.revision, revision),
        // If there was a pending unacknowledged vote when poll closed, stop waiting
        isPendingAck: false,
        pendingOption: null,
      });
    }
  },

  applyQuestionChanged: (currentQuestion, questionIndex, totalQuestions, revision) => {
    const hasOptions = Boolean(currentQuestion?.options && currentQuestion.options.length > 0);
    set({
      currentQuestion,
      currentQuestionIndex: questionIndex,
      totalQuestions,
      pollStatus: hasOptions ? 'open' : 'waiting',
      revision,
      selectedOption: null,
      pendingOption: null,
      acceptedOption: null,
      isPendingAck: false,
      ackError: null,
    });
  },

  resetVoteStateForNewQuestion: () => {
    set({
      selectedOption: null,
      pendingOption: null,
      acceptedOption: null,
      isPendingAck: false,
      ackError: null,
    });
  },
}));
