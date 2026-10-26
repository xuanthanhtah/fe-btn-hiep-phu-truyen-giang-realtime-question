export type OptionId = 'A' | 'B' | 'C' | 'D';

export type PollStatus = 'waiting' | 'open' | 'closed';

export type ConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'unavailable';

export interface PollOption {
  id: OptionId;
  text: string;
}

export interface PollQuestion {
  id: string;
  title: string;
  category?: string;
  options: PollOption[];
}

export type VoteCounts = Record<OptionId, number>;
export type VotePercentages = Record<OptionId, number>;

export interface HostRoomState {
  roomId: string;
  hostSessionId: string;
  isStarted: boolean; // whether host has clicked Start to show questions
  currentQuestionIndex: number;
  questions: PollQuestion[];
  pollStatus: PollStatus;
  revision: number;
  votes: Record<string, OptionId>; // participantId -> OptionId
}

export interface PublicRoomState {
  roomId: string;
  revision: number;
  isStarted?: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion: PollQuestion | null;
  pollStatus: PollStatus;
  voteCounts: VoteCounts;
  totalAcceptedVotes: number;
}

export interface ParticipantVoteState {
  selectedOption: OptionId | null; // local optimistic choice
  pendingOption: OptionId | null;  // waiting for host ack
  acceptedOption: OptionId | null; // authoritative host ack
  lastVotedQuestionId: string | null;
}
