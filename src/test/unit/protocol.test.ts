import { describe, it, expect } from 'vitest';
import {
  parseAndValidateEvent,
  EventDeduplicator,
  createRoomStateEvent,
} from '../../realtime/room.events';
import { PROTOCOL_VERSION } from '../../realtime/room.protocol';
import type { PollOption, PublicRoomState } from '../../types/poll';

describe('Realtime Event Protocol Validation', () => {
  it('validates a valid vote:cast event', () => {
    const raw = {
      version: PROTOCOL_VERSION,
      eventId: 'evt-100',
      roomId: 'ROOM12',
      timestamp: Date.now(),
      type: 'vote:cast',
      payload: {
        questionId: 'q1',
        participantId: 'p-456',
        optionId: 'C',
      },
    };

    const parsed = parseAndValidateEvent(raw);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('vote:cast');
  });

  it('rejects an event with invalid option ID', () => {
    const raw = {
      version: PROTOCOL_VERSION,
      eventId: 'evt-101',
      roomId: 'ROOM12',
      timestamp: Date.now(),
      type: 'vote:cast',
      payload: {
        questionId: 'q1',
        participantId: 'p-456',
        optionId: 'Z', // Invalid!
      },
    };

    const parsed = parseAndValidateEvent(raw);
    expect(parsed).toBeNull();
  });

  it('rejects an event with missing fields', () => {
    const raw = {
      type: 'vote:cast',
      payload: {
        optionId: 'A',
      },
    };

    const parsed = parseAndValidateEvent(raw);
    expect(parsed).toBeNull();
  });

  it('validates a room:state event', () => {
    const options: [PollOption, PollOption, PollOption, PollOption] = [
      { id: 'A', text: 'Opt A' },
      { id: 'B', text: 'Opt B' },
      { id: 'C', text: 'Opt C' },
      { id: 'D', text: 'Opt D' },
    ];

    const snapshot: PublicRoomState = {
      roomId: 'ROOM12',
      revision: 4,
      currentQuestionIndex: 0,
      totalQuestions: 1,
      currentQuestion: {
        id: 'q1',
        title: 'Sample Q',
        options,
      },
      pollStatus: 'open',
      voteCounts: { A: 5, B: 3, C: 1, D: 0 },
      totalAcceptedVotes: 9,
    };

    const event = createRoomStateEvent('ROOM12', snapshot);
    const parsed = parseAndValidateEvent(event);
    expect(parsed).not.toBeNull();
    expect(parsed?.type).toBe('room:state');
  });
});

describe('Event Deduplicator', () => {
  it('detects duplicate events by eventId', () => {
    const dedup = new EventDeduplicator(10);
    expect(dedup.isDuplicate('evt-1')).toBe(false);
    expect(dedup.isDuplicate('evt-2')).toBe(false);
    expect(dedup.isDuplicate('evt-1')).toBe(true); // Duplicate!
  });

  it('evicts oldest event ID once max capacity is exceeded', () => {
    const dedup = new EventDeduplicator(3);
    dedup.isDuplicate('evt-1');
    dedup.isDuplicate('evt-2');
    dedup.isDuplicate('evt-3');
    dedup.isDuplicate('evt-4'); // Evicts evt-1

    expect(dedup.isDuplicate('evt-1')).toBe(false); // Can be seen again as new
  });
});
