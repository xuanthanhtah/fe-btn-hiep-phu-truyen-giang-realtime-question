import type {
  HostRoomState,
  OptionId,
  PollQuestion,
  PublicRoomState,
  VoteCounts,
  VotePercentages,
} from '../types/poll';

export const INITIAL_VOTE_COUNTS: VoteCounts = {
  A: 0,
  B: 0,
  C: 0,
  D: 0,
};

/**
 * Pure calculation of vote counts from in-memory votes map
 */
export function calculateVoteCounts(votes: Record<string, OptionId>): VoteCounts {
  const counts: VoteCounts = { A: 0, B: 0, C: 0, D: 0 };
  for (const optionId of Object.values(votes)) {
    if (optionId in counts) {
      counts[optionId]++;
    }
  }
  return counts;
}

/**
 * Total accepted votes
 */
export function calculateTotalVotes(counts: VoteCounts): number {
  return counts.A + counts.B + counts.C + counts.D;
}

/**
 * Pure calculation of vote percentages with safe division by zero protection.
 * Returns integers or 1 decimal place rounded numbers, guaranteed never to be NaN.
 */
export function calculateVotePercentages(counts: VoteCounts): VotePercentages {
  const total = calculateTotalVotes(counts);
  if (total === 0) {
    return { A: 0, B: 0, C: 0, D: 0 };
  }

  return {
    A: Math.round((counts.A / total) * 100),
    B: Math.round((counts.B / total) * 100),
    C: Math.round((counts.C / total) * 100),
    D: Math.round((counts.D / total) * 100),
  };
}

/**
 * Derives public snapshot from host authoritative state
 */
export function derivePublicRoomState(state: HostRoomState): PublicRoomState {
  const counts = calculateVoteCounts(state.votes);
  const isStarted = state.isStarted !== false; // defaults to true if omitted in mock states
  const currentQuestion = isStarted ? (state.questions[state.currentQuestionIndex] ?? null) : null;

  return {
    roomId: state.roomId,
    revision: state.revision,
    isStarted: state.isStarted,
    currentQuestionIndex: state.currentQuestionIndex,
    totalQuestions: state.questions.length,
    currentQuestion,
    pollStatus: state.pollStatus,
    voteCounts: counts,
    totalAcceptedVotes: calculateTotalVotes(counts),
  };
}

/**
 * Pure reducer: Accept vote from participant
 * Returns updated state or null if vote is rejected according to business rules:
 * - Poll must be open
 * - questionId must match current question
 * - optionId must be A, B, C, or D
 */
export function acceptVote(
  state: HostRoomState,
  params: {
    questionId: string;
    participantId: string;
    optionId: OptionId;
  }
): { newState: HostRoomState; updatedCounts: VoteCounts; totalVotes: number } | null {
  if (state.pollStatus !== 'open') {
    return null;
  }

  const currentQuestion = state.questions[state.currentQuestionIndex];
  if (!currentQuestion || currentQuestion.id !== params.questionId) {
    return null;
  }

  if (!currentQuestion.options || currentQuestion.options.length === 0) {
    return null;
  }

  if (!['A', 'B', 'C', 'D'].includes(params.optionId)) {
    return null;
  }

  // Update or replace vote for this participant
  const newVotes: Record<string, OptionId> = {
    ...state.votes,
    [params.participantId]: params.optionId,
  };

  const updatedCounts = calculateVoteCounts(newVotes);
  const totalVotes = calculateTotalVotes(updatedCounts);

  const newState: HostRoomState = {
    ...state,
    votes: newVotes,
    revision: state.revision + 1,
  };

  return { newState, updatedCounts, totalVotes };
}

/**
 * Pure reducer: Change active question
 * Clears current question votes and increments revision
 */
export function changeQuestionIndex(
  state: HostRoomState,
  newIndex: number
): HostRoomState | null {
  if (newIndex < 0 || newIndex >= state.questions.length) {
    return null;
  }

  const targetQuestion = state.questions[newIndex];
  const hasOptions = Boolean(targetQuestion?.options && targetQuestion.options.length > 0);

  return {
    ...state,
    currentQuestionIndex: newIndex,
    votes: {}, // Fresh vote set for new question
    pollStatus: hasOptions ? 'open' : 'waiting', // Default to open for questions with options
    revision: state.revision + 1,
  };
}

/**
 * Pure reducer: Open poll for active question
 */
export function openPoll(state: HostRoomState): HostRoomState {
  if (state.pollStatus === 'open') return state;
  return {
    ...state,
    pollStatus: 'open',
    revision: state.revision + 1,
  };
}

/**
 * Pure reducer: Close poll for active question
 */
export function closePoll(state: HostRoomState): HostRoomState {
  if (state.pollStatus === 'closed') return state;
  return {
    ...state,
    pollStatus: 'closed',
    revision: state.revision + 1,
  };
}

/**
 * Pure reducer: Reset poll for current question
 */
export function resetCurrentPoll(state: HostRoomState): HostRoomState {
  const currentQuestion = state.questions[state.currentQuestionIndex];
  const hasOptions = Boolean(currentQuestion?.options && currentQuestion.options.length > 0);
  return {
    ...state,
    votes: {},
    pollStatus: hasOptions ? 'open' : 'waiting',
    revision: state.revision + 1,
  };
}

/**
 * Pure reducer: Update questions list in host state
 */
export function updateQuestions(
  state: HostRoomState,
  questions: PollQuestion[]
): HostRoomState {
  const safeIndex = Math.min(state.currentQuestionIndex, Math.max(0, questions.length - 1));
  const currentQuestion = questions[safeIndex];
  const hasOptions = Boolean(currentQuestion?.options && currentQuestion.options.length > 0);
  return {
    ...state,
    questions,
    currentQuestionIndex: safeIndex,
    votes: {},
    pollStatus: hasOptions ? 'open' : 'waiting',
    revision: state.revision + 1,
  };
}
