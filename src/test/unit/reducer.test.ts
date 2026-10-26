import { describe, it, expect } from 'vitest';
import {
  calculateVoteCounts,
  calculateTotalVotes,
  calculateVotePercentages,
  acceptVote,
  changeQuestionIndex,
  openPoll,
  closePoll,
  resetCurrentPoll,
  derivePublicRoomState,
} from '../../realtime/room.reducer';
import type { HostRoomState, PollQuestion } from '../../types/poll';

const mockQuestions: PollQuestion[] = [
  {
    id: 'q1',
    title: 'Question 1',
    options: [
      { id: 'A', text: 'Option A' },
      { id: 'B', text: 'Option B' },
      { id: 'C', text: 'Option C' },
      { id: 'D', text: 'Option D' },
    ],
  },
  {
    id: 'q2',
    title: 'Question 2',
    options: [
      { id: 'A', text: 'Option 2A' },
      { id: 'B', text: 'Option 2B' },
      { id: 'C', text: 'Option 2C' },
      { id: 'D', text: 'Option 2D' },
    ],
  },
];

function createMockHostState(overrides?: Partial<HostRoomState>): HostRoomState {
  return {
    roomId: 'TEST01',
    hostSessionId: 'sess-123',
    isStarted: true,
    currentQuestionIndex: 0,
    questions: mockQuestions,
    pollStatus: 'open',
    revision: 1,
    votes: {},
    ...overrides,
  };
}

describe('Vote Calculations', () => {
  it('calculates counts from votes correctly', () => {
    const votes = {
      user1: 'A' as const,
      user2: 'B' as const,
      user3: 'A' as const,
      user4: 'D' as const,
    };
    const counts = calculateVoteCounts(votes);
    expect(counts).toEqual({ A: 2, B: 1, C: 0, D: 1 });
    expect(calculateTotalVotes(counts)).toBe(4);
  });

  it('safely calculates percentages when there are 0 votes (no NaN or divide-by-zero)', () => {
    const counts = { A: 0, B: 0, C: 0, D: 0 };
    const percentages = calculateVotePercentages(counts);
    expect(percentages).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    expect(Number.isNaN(percentages.A)).toBe(false);
  });

  it('calculates percentages correctly for non-zero votes', () => {
    const counts = { A: 1, B: 1, C: 1, D: 1 };
    const percentages = calculateVotePercentages(counts);
    expect(percentages).toEqual({ A: 25, B: 25, C: 25, D: 25 });
  });

  it('derives public room state correctly', () => {
    const state = createMockHostState({
      votes: { p1: 'A', p2: 'C' },
    });
    const publicState = derivePublicRoomState(state);
    expect(publicState.roomId).toBe('TEST01');
    expect(publicState.totalAcceptedVotes).toBe(2);
    expect(publicState.voteCounts.A).toBe(1);
    expect(publicState.voteCounts.C).toBe(1);
    expect(publicState.currentQuestion?.id).toBe('q1');
  });
});

describe('Vote Acceptance & Rejection Rules', () => {
  it('accepts vote when poll is open and question matches', () => {
    const state = createMockHostState({ pollStatus: 'open' });
    const result = acceptVote(state, {
      questionId: 'q1',
      participantId: 'p1',
      optionId: 'A',
    });

    expect(result).not.toBeNull();
    expect(result!.newState.votes['p1']).toBe('A');
    expect(result!.updatedCounts.A).toBe(1);
    expect(result!.totalVotes).toBe(1);
    expect(result!.newState.revision).toBe(2);
  });

  it('replaces a participant existing vote when changed while open', () => {
    const state = createMockHostState({
      pollStatus: 'open',
      votes: { p1: 'A' },
      revision: 2,
    });

    // p1 changes vote from A to B
    const result = acceptVote(state, {
      questionId: 'q1',
      participantId: 'p1',
      optionId: 'B',
    });

    expect(result).not.toBeNull();
    expect(result!.newState.votes['p1']).toBe('B');
    expect(result!.updatedCounts.A).toBe(0);
    expect(result!.updatedCounts.B).toBe(1);
    expect(result!.totalVotes).toBe(1);
  });

  it('rejects votes when the poll is closed', () => {
    const state = createMockHostState({ pollStatus: 'closed' });
    const result = acceptVote(state, {
      questionId: 'q1',
      participantId: 'p1',
      optionId: 'A',
    });

    expect(result).toBeNull();
  });

  it('rejects votes when the poll is waiting', () => {
    const state = createMockHostState({ pollStatus: 'waiting' });
    const result = acceptVote(state, {
      questionId: 'q1',
      participantId: 'p1',
      optionId: 'A',
    });

    expect(result).toBeNull();
  });

  it('rejects votes for an outdated or mismatched question', () => {
    const state = createMockHostState({ pollStatus: 'open' });
    const result = acceptVote(state, {
      questionId: 'q_old_nonexistent',
      participantId: 'p1',
      optionId: 'A',
    });

    expect(result).toBeNull();
  });

  it('rejects invalid option IDs', () => {
    const state = createMockHostState({ pollStatus: 'open' });
    const result = acceptVote(state, {
      questionId: 'q1',
      participantId: 'p1',
      // @ts-expect-error test runtime rejection of invalid option
      optionId: 'E',
    });

    expect(result).toBeNull();
  });
});

describe('Question Navigation & Polling Lifecycle', () => {
  it('resets votes and opens poll by default when advancing to new question with options', () => {
    const state = createMockHostState({
      currentQuestionIndex: 0,
      votes: { p1: 'A', p2: 'B' },
      pollStatus: 'open',
      revision: 5,
    });

    const nextState = changeQuestionIndex(state, 1);
    expect(nextState).not.toBeNull();
    expect(nextState!.currentQuestionIndex).toBe(1);
    expect(nextState!.votes).toEqual({});
    expect(nextState!.pollStatus).toBe('open');
    expect(nextState!.revision).toBe(6);
  });

  it('opens and closes poll with revision increment', () => {
    const state = createMockHostState({ pollStatus: 'waiting', revision: 1 });
    const opened = openPoll(state);
    expect(opened.pollStatus).toBe('open');
    expect(opened.revision).toBe(2);

    const closed = closePoll(opened);
    expect(closed.pollStatus).toBe('closed');
    expect(closed.revision).toBe(3);
  });

  it('resets current poll votes and leaves poll open for questions with options', () => {
    const state = createMockHostState({
      votes: { p1: 'A' },
      pollStatus: 'open',
      revision: 4,
    });

    const reset = resetCurrentPoll(state);
    expect(reset.votes).toEqual({});
    expect(reset.pollStatus).toBe('open');
    expect(reset.revision).toBe(5);
  });
});
