import type { OptionId, PollQuestion, PublicRoomState, VoteCounts } from '../types/poll';
import {
  PROTOCOL_VERSION,
  RealtimeEventSchema,
  type RealtimeEvent,
  type RoomStateEvent,
  type PollOpenedEvent,
  type PollClosedEvent,
  type QuestionChangedEvent,
  type VoteCastEvent,
  type VoteAcceptedEvent,
  type RoomResetEvent,
  type RoomSyncRequestEvent,
} from './room.protocol';

/**
 * Generate cryptographically secure UUID or fallback
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now().toString(36);
}

/**
 * Parse and validate an incoming realtime event against Zod schema.
 * Rejects unknown or malformed payloads.
 */
export function parseAndValidateEvent(raw: unknown): RealtimeEvent | null {
  const result = RealtimeEventSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[Realtime Protocol] Invalid event rejected:', result.error.format());
    return null;
  }
  return result.data;
}

/**
 * Event Deduplicator using a fixed-size ring buffer / LRU set
 */
export class EventDeduplicator {
  private seenIds = new Set<string>();
  private queue: string[] = [];
  private maxSize: number;

  constructor(maxSize = 200) {
    this.maxSize = maxSize;
  }

  /**
   * Returns true if event is a duplicate, false if event is new
   */
  isDuplicate(eventId: string): boolean {
    if (this.seenIds.has(eventId)) {
      return true;
    }
    this.seenIds.add(eventId);
    this.queue.push(eventId);
    if (this.queue.length > this.maxSize) {
      const oldest = this.queue.shift();
      if (oldest) this.seenIds.delete(oldest);
    }
    return false;
  }

  clear(): void {
    this.seenIds.clear();
    this.queue = [];
  }
}

/* Event factory functions */

export function createRoomStateEvent(
  roomId: string,
  snapshot: PublicRoomState
): RoomStateEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'room:state',
    payload: {
      revision: snapshot.revision,
      currentQuestionIndex: snapshot.currentQuestionIndex,
      totalQuestions: snapshot.totalQuestions,
      currentQuestion: snapshot.currentQuestion,
      pollStatus: snapshot.pollStatus,
      voteCounts: snapshot.voteCounts,
      totalAcceptedVotes: snapshot.totalAcceptedVotes,
    },
  };
}

export function createPollOpenedEvent(
  roomId: string,
  questionId: string,
  revision: number
): PollOpenedEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'poll:opened',
    payload: {
      questionId,
      revision,
    },
  };
}

export function createPollClosedEvent(
  roomId: string,
  questionId: string,
  revision: number
): PollClosedEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'poll:closed',
    payload: {
      questionId,
      revision,
    },
  };
}

export function createQuestionChangedEvent(
  roomId: string,
  questionIndex: number,
  totalQuestions: number,
  currentQuestion: PollQuestion | null,
  revision: number
): QuestionChangedEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'question:changed',
    payload: {
      questionIndex,
      totalQuestions,
      currentQuestion,
      revision,
    },
  };
}

export function createVoteCastEvent(
  roomId: string,
  questionId: string,
  participantId: string,
  optionId: OptionId
): VoteCastEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'vote:cast',
    payload: {
      questionId,
      participantId,
      optionId,
    },
  };
}

export function createVoteAcceptedEvent(
  roomId: string,
  questionId: string,
  participantId: string,
  optionId: OptionId,
  revision: number,
  voteCounts: VoteCounts,
  totalAcceptedVotes: number
): VoteAcceptedEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'vote:accepted',
    payload: {
      questionId,
      participantId,
      optionId,
      revision,
      voteCounts,
      totalAcceptedVotes,
    },
  };
}

export function createRoomResetEvent(roomId: string, revision: number): RoomResetEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'room:reset',
    payload: {
      revision,
    },
  };
}

export function createRoomSyncRequestEvent(
  roomId: string,
  participantId?: string
): RoomSyncRequestEvent {
  return {
    version: PROTOCOL_VERSION,
    eventId: generateId(),
    roomId,
    timestamp: Date.now(),
    type: 'room:sync_request',
    payload: {
      participantId,
    },
  };
}
